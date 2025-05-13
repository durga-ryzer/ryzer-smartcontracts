"use strict";
/**
 * @title RyzerFactory Module
 * @description TypeScript module for interacting with the RyzerWalletFactory contract
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RyzerFactory = void 0;
const ethers_1 = require("ethers");
// Import ABI
const RyzerWalletFactory_json_1 = __importDefault(require("../abis/RyzerWalletFactory.json"));
class RyzerFactory {
    /**
     * Initialize the RyzerFactory module
     * @param {RyzerSDK} sdk - The main RyzerSDK instance
     */
    constructor(sdk) {
        this.sdk = sdk;
        this.provider = sdk.provider;
        this.contract = new ethers_1.ethers.Contract(sdk.factoryAddress, RyzerWalletFactory_json_1.default, this.provider);
    }
    /**
     * Get a signer for transactions
     * @returns {ethers.Wallet} - Wallet instance with signer
     */
    getSigner() {
        return new ethers_1.ethers.Wallet(this.sdk.privateKey, this.provider);
    }
    /**
     * Create a new wallet for a user
     * @param {CreateWalletParams} params - Wallet creation parameters
     * @returns {Promise<string>} - New wallet address
     */
    async createWallet(params) {
        const contract = this.contract.connect(this.getSigner());
        // Cast contract.createWallet to any to bypass TypeScript's type checking
        // This is necessary because the contract expects a string but our params use number
        const createWalletFn = contract.createWallet;
        const tx = await createWalletFn(params.user, params.userId.toString(), params.threshold.toString(), params.brokers, '0x' // Optional data parameter
        );
        const receipt = await tx.wait();
        const event = receipt.events.find((e) => e.event === 'WalletDeployed');
        return event.args.wallet;
    }
    /**
     * Get a user's wallet address
     * @param {string} userAddress - User's Ethereum address
     * @returns {Promise<string>} - Wallet address
     */
    async getWallet(userAddress) {
        return this.contract.getWallet(userAddress);
    }
    /**
     * Predict a wallet address before creation
     * @param {string} userAddress - User's Ethereum address
     * @returns {Promise<string>} - Predicted wallet address
     */
    async predictWalletAddress(userAddress) {
        return this.contract.predictWalletAddress(userAddress);
    }
    /**
     * Check if an address is a wallet
     * @param {string} address - Address to check
     * @returns {Promise<boolean>} - Whether the address is a wallet
     */
    async isWallet(address) {
        return this.contract.isWallet(address);
    }
    /**
     * Get the entry point address
     * @returns {Promise<string>} - Entry point address
     */
    async getEntryPoint() {
        return this.contract.entryPoint();
    }
    /**
     * Get the paymaster address
     * @returns {Promise<string>} - Paymaster address
     */
    async getPaymaster() {
        return this.contract.paymaster();
    }
    /**
     * Get the timelock address
     * @returns {Promise<string>} - Timelock address
     */
    async getTimelock() {
        return this.contract.timelock();
    }
    /**
     * Get the wallet implementation address
     * @returns {Promise<string>} - Wallet implementation address
     */
    async getWalletImplementation() {
        return this.contract.walletImplementation();
    }
    /**
     * Get the emergency stopped status
     * @returns {Promise<boolean>} - Emergency stopped status
     */
    async getEmergencyStopped() {
        return this.contract.emergencyStopped();
    }
    /**
     * Set the emergency stop status (admin only)
     * @param {boolean} stopped - Emergency stop status
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    async setEmergencyStop(stopped) {
        const contract = this.contract.connect(this.getSigner());
        return contract.setEmergencyStop(stopped);
    }
    /**
     * Upgrade the implementation (admin only)
     * @param {string} newImplementation - New implementation address
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    async upgradeImplementation(newImplementation) {
        const contract = this.contract.connect(this.getSigner());
        return contract.upgradeImplementation(newImplementation);
    }
    /**
     * Set the entry point (admin only)
     * @param {string} newEntryPoint - New entry point address
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    async setEntryPoint(newEntryPoint) {
        const contract = this.contract.connect(this.getSigner());
        return contract.setEntryPoint(newEntryPoint);
    }
    /**
     * Set the paymaster (admin only)
     * @param {string} newPaymaster - New paymaster address
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    async setPaymaster(newPaymaster) {
        const contract = this.contract.connect(this.getSigner());
        return contract.setPaymaster(newPaymaster);
    }
    /**
     * Set the timelock (admin only)
     * @param {string} newTimelock - New timelock address
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    async setTimelock(newTimelock) {
        const contract = this.contract.connect(this.getSigner());
        return contract.setTimelock(newTimelock);
    }
    /**
     * Get the last operation block for a user
     * @param {string} userAddress - User address
     * @returns {Promise<number>} - Last operation block
     */
    async getLastOperationBlock(userAddress) {
        return (await this.contract.lastOperationBlock(userAddress)).toNumber();
    }
}
exports.RyzerFactory = RyzerFactory;
