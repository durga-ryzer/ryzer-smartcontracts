"use strict";
/**
 * @title RyzerPaymaster Module
 * @description TypeScript module for interacting with the RyzerPaymaster contract
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RyzerPaymaster = void 0;
const ethers_1 = require("ethers");
// Import ABI
const RyzerPaymaster_json_1 = __importDefault(require("../abis/RyzerPaymaster.json"));
class RyzerPaymaster {
    /**
     * Initialize the RyzerPaymaster module
     * @param {RyzerSDK} sdk - The main RyzerSDK instance
     */
    constructor(sdk) {
        this.sdk = sdk;
        this.provider = sdk.provider;
        this.contract = new ethers_1.ethers.Contract(sdk.paymasterAddress, RyzerPaymaster_json_1.default, this.provider);
    }
    /**
     * Get a signer for transactions
     * @returns {ethers.Wallet} - Wallet instance with signer
     */
    getSigner() {
        return new ethers_1.ethers.Wallet(this.sdk.privateKey, this.provider);
    }
    /**
     * Deposit ETH to cover gas costs for a user
     * @param {string} userAddress - User address
     * @param {ethers.BigNumberish} amount - Amount of ETH to deposit (in wei)
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    async depositEth(userAddress, amount) {
        const contract = this.contract.connect(this.getSigner());
        return contract.depositEth(userAddress, { value: amount });
    }
    /**
     * Deposit tokens to cover gas costs for a user
     * @param {string} userAddress - User address
     * @param {ethers.BigNumberish} amount - Amount of tokens to deposit
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    async depositToken(userAddress, amount) {
        const contract = this.contract.connect(this.getSigner());
        return contract.depositToken(userAddress, amount);
    }
    /**
     * Set the fee tier for a user (admin only)
     * @param {string} userAddress - User address
     * @param {number} tier - Fee tier (in basis points)
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    async setFeeTier(userAddress, tier) {
        const contract = this.contract.connect(this.getSigner());
        return contract.setFeeTier(userAddress, tier);
    }
    /**
     * Set the gas token (admin only)
     * @param {string} tokenAddress - Gas token address
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    async setGasToken(tokenAddress) {
        const contract = this.contract.connect(this.getSigner());
        return contract.setGasToken(tokenAddress);
    }
    /**
     * Set off-peak discount parameters (admin only)
     * @param {number} startHour - Start hour (0-23)
     * @param {number} endHour - End hour (0-23)
     * @param {number} discount - Discount percentage (in basis points)
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    async setOffPeakDiscount(startHour, endHour, discount) {
        const contract = this.contract.connect(this.getSigner());
        return contract.setOffPeakDiscount(startHour, endHour, discount);
    }
    /**
     * Set volume discount parameters (admin only)
     * @param {number} threshold - Volume threshold
     * @param {number} discount - Discount percentage (in basis points)
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    async setVolumeDiscount(threshold, discount) {
        const contract = this.contract.connect(this.getSigner());
        return contract.setVolumeDiscount(threshold, discount);
    }
    /**
     * Set low balance thresholds (admin only)
     * @param {ethers.BigNumberish} ethThreshold - ETH threshold (in wei)
     * @param {ethers.BigNumberish} tokenThreshold - Token threshold
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    async setLowBalanceThresholds(ethThreshold, tokenThreshold) {
        const contract = this.contract.connect(this.getSigner());
        return contract.setLowBalanceThresholds(ethThreshold, tokenThreshold);
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
     * Set the entry point (admin only)
     * @param {string} entryPointAddress - Entry point address
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    async setEntryPoint(entryPointAddress) {
        const contract = this.contract.connect(this.getSigner());
        return contract.setEntryPoint(entryPointAddress);
    }
    /**
     * Set the factory (admin only)
     * @param {string} factoryAddress - Factory address
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    async setFactory(factoryAddress) {
        const contract = this.contract.connect(this.getSigner());
        return contract.setFactory(factoryAddress);
    }
    /**
     * Withdraw funds (admin only)
     * @param {string} recipient - Recipient address
     * @param {ethers.BigNumberish} amount - Amount to withdraw
     * @param {string} token - Token address (use address(0) for ETH)
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    async withdrawFunds(recipient, amount, token) {
        const contract = this.contract.connect(this.getSigner());
        return contract.withdrawFunds(recipient, amount, token);
    }
    /**
     * Get a user's ETH balance
     * @param {string} userAddress - User address
     * @returns {Promise<ethers.BigNumber>} - ETH balance
     */
    async getEthBalance(userAddress) {
        return this.contract.ethBalances(userAddress);
    }
    /**
     * Get a user's token balance
     * @param {string} userAddress - User address
     * @returns {Promise<ethers.BigNumber>} - Token balance
     */
    async getTokenBalance(userAddress) {
        return this.contract.tokenBalances(userAddress);
    }
    /**
     * Get a user's fee tier
     * @param {string} userAddress - User address
     * @returns {Promise<number>} - Fee tier (in basis points)
     */
    async getFeeTier(userAddress) {
        return (await this.contract.userFeeTiers(userAddress)).toNumber();
    }
    /**
     * Get the gas token address
     * @returns {Promise<string>} - Gas token address
     */
    async getGasToken() {
        return this.contract.gasToken();
    }
    /**
     * Get off-peak discount parameters
     * @returns {Promise<OffPeakDiscount>} - Off-peak discount parameters
     */
    async getOffPeakDiscount() {
        const [start, end, discount] = await Promise.all([
            this.contract.offPeakStart(),
            this.contract.offPeakEnd(),
            this.contract.offPeakDiscount()
        ]);
        return {
            start: start.toNumber(),
            end: end.toNumber(),
            discount: discount.toNumber()
        };
    }
    /**
     * Get volume discount parameters
     * @returns {Promise<VolumeDiscount>} - Volume discount parameters
     */
    async getVolumeDiscount() {
        const [threshold, discount] = await Promise.all([
            this.contract.volumeDiscountThreshold(),
            this.contract.volumeDiscount()
        ]);
        return {
            threshold: threshold.toNumber(),
            discount: discount.toNumber()
        };
    }
    /**
     * Get low balance thresholds
     * @returns {Promise<LowBalanceThresholds>} - Low balance thresholds
     */
    async getLowBalanceThresholds() {
        const [ethThreshold, tokenThreshold] = await Promise.all([
            this.contract.lowEthBalanceThreshold(),
            this.contract.lowTokenBalanceThreshold()
        ]);
        return { ethThreshold, tokenThreshold };
    }
    /**
     * Get the emergency stopped status
     * @returns {Promise<boolean>} - Emergency stopped status
     */
    async getEmergencyStopped() {
        return this.contract.emergencyStopped();
    }
    /**
     * Get the entry point address
     * @returns {Promise<string>} - Entry point address
     */
    async getEntryPoint() {
        return this.contract.entryPoint();
    }
    /**
     * Get the factory address
     * @returns {Promise<string>} - Factory address
     */
    async getFactory() {
        return this.contract.factory();
    }
    /**
     * Validate a paymaster user operation
     * @param {UserOperation} userOp - User operation object
     * @param {string} userOpHash - Hash of the user operation
     * @param {ethers.BigNumberish} maxCost - Maximum cost
     * @returns {Promise<{context: string, validationData: ethers.BigNumber}>} - Validation result
     */
    async validatePaymasterUserOp(userOp, userOpHash, maxCost) {
        const [context, validationData] = await this.contract.validatePaymasterUserOp(userOp, userOpHash, maxCost);
        return { context, validationData };
    }
}
exports.RyzerPaymaster = RyzerPaymaster;
