"use strict";
/**
 * @title RyzerCore Module
 * @description TypeScript module for interacting with the RyzerWalletCore contract
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RyzerCore = void 0;
const ethers_1 = require("ethers");
// Import ABI
const RyzerWalletCore_json_1 = __importDefault(require("../abis/RyzerWalletCore.json"));
class RyzerCore {
    /**
     * Initialize the RyzerCore module
     * @param {RyzerSDK} sdk - The main RyzerSDK instance
     */
    constructor(sdk) {
        this.contract = null;
        this.sdk = sdk;
        this.provider = sdk.provider;
    }
    /**
     * Get contract instance for a specific wallet address
     * @param {string} walletAddress - Address of the wallet
     * @returns {ExtendedContract} - Contract instance
     */
    getContract(walletAddress) {
        // Create a new contract instance for the specific wallet address
        return new ethers_1.ethers.Contract(walletAddress, RyzerWalletCore_json_1.default, this.provider);
    }
    /**
     * Get a signer for transactions
     * @returns {ethers.Wallet} - Wallet instance with signer
     */
    getSigner() {
        return new ethers_1.ethers.Wallet(this.sdk.privateKey, this.provider);
    }
    /**
     * Set a delegated signer for a wallet
     * @param {string} walletAddress - Address of the wallet
     * @param {string} signerAddress - Address of the delegated signer
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    async setDelegatedSigner(walletAddress, signerAddress) {
        const contract = this.getContract(walletAddress).connect(this.getSigner());
        return contract.setDelegatedSigner(signerAddress);
    }
    /**
     * Set multiple signers for a wallet with a Merkle root
     * @param {string} walletAddress - Address of the wallet
     * @param {string[]} signers - Array of signer addresses
     * @param {number} threshold - Signature threshold
     * @param {string} merkleRoot - Merkle root of signers
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    async setMultiSigners(walletAddress, signers, threshold, merkleRoot) {
        const contract = this.getContract(walletAddress).connect(this.getSigner());
        return contract.setMultiSigners(signers, threshold, merkleRoot);
    }
    /**
     * Set emergency stop status
     * @param {string} walletAddress - Address of the wallet
     * @param {boolean} stopped - Emergency stop status
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    async setEmergencyStop(walletAddress, stopped) {
        const contract = this.getContract(walletAddress).connect(this.getSigner());
        return contract.setEmergencyStop(stopped);
    }
    /**
     * Revoke a role from an account
     * @param {string} walletAddress - Address of the wallet
     * @param {string} role - Role identifier (bytes32)
     * @param {string} account - Account address
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    async revokeRole(walletAddress, role, account) {
        const contract = this.getContract(walletAddress).connect(this.getSigner());
        return contract.revokeRole(role, account);
    }
    /**
     * Check if an account has a specific role
     * @param {string} walletAddress - Address of the wallet
     * @param {string} role - Role identifier (bytes32)
     * @param {string} account - Account address
     * @returns {Promise<boolean>} - Whether the account has the role
     */
    async hasRole(walletAddress, role, account) {
        const contract = this.getContract(walletAddress);
        return contract.hasRole(role, account);
    }
    /**
     * Get the delegated signer for a user
     * @param {string} walletAddress - Address of the wallet
     * @param {string} userAddress - User address
     * @returns {Promise<string>} - Delegated signer address
     */
    async getDelegatedSigner(walletAddress, userAddress) {
        const contract = this.getContract(walletAddress);
        return contract.delegatedSigners(userAddress);
    }
    /**
     * Get the multi-signer configuration for a user
     * @param {string} walletAddress - Address of the wallet
     * @param {string} userAddress - User address
     * @returns {Promise<MultiSignerConfig>} - Multi-signer configuration
     */
    async getMultiSigners(walletAddress, userAddress) {
        const contract = this.getContract(walletAddress);
        const [merkleRoot, threshold] = await contract.multiSigners(userAddress);
        return { merkleRoot, threshold };
    }
    /**
     * Get the emergency stopped status
     * @param {string} walletAddress - Address of the wallet
     * @returns {Promise<boolean>} - Emergency stopped status
     */
    async getEmergencyStopped(walletAddress) {
        const contract = this.getContract(walletAddress);
        return contract.emergencyStopped();
    }
    /**
     * Get the entry point address
     * @param {string} walletAddress - Address of the wallet
     * @returns {Promise<string>} - Entry point address
     */
    async getEntryPoint(walletAddress) {
        const contract = this.getContract(walletAddress);
        return contract.entryPoint();
    }
    /**
     * Get the paymaster address
     * @param {string} walletAddress - Address of the wallet
     * @returns {Promise<string>} - Paymaster address
     */
    async getPaymaster(walletAddress) {
        const contract = this.getContract(walletAddress);
        return contract.paymaster();
    }
    /**
     * Get the timelock address
     * @param {string} walletAddress - Address of the wallet
     * @returns {Promise<string>} - Timelock address
     */
    async getTimelock(walletAddress) {
        const contract = this.getContract(walletAddress);
        return contract.timelock();
    }
    /**
     * Get the threshold value
     * @param {string} walletAddress - Address of the wallet
     * @returns {Promise<number>} - Threshold value
     */
    async getThreshold(walletAddress) {
        const contract = this.getContract(walletAddress);
        return (await contract.threshold()).toNumber();
    }
    /**
     * Get the user ID for a user address
     * @param {string} walletAddress - Address of the wallet
     * @param {string} userAddress - User address
     * @returns {Promise<number>} - User ID
     */
    async getUserId(walletAddress, userAddress) {
        const contract = this.getContract(walletAddress);
        return (await contract.userAddressToId(userAddress)).toNumber();
    }
    /**
     * Get the last operation block for a user
     * @param {string} walletAddress - Address of the wallet
     * @param {string} userAddress - User address
     * @returns {Promise<number>} - Last operation block
     */
    async getLastOperationBlock(walletAddress, userAddress) {
        const contract = this.getContract(walletAddress);
        return (await contract.lastOperationBlock(userAddress)).toNumber();
    }
    /**
     * Get the nonce for a user
     * @param {string} walletAddress - Address of the wallet
     * @param {string} userAddress - User address
     * @returns {Promise<number>} - Nonce value
     */
    async getNonce(walletAddress, userAddress) {
        const contract = this.getContract(walletAddress);
        return (await contract.nonces(userAddress)).toNumber();
    }
    /**
     * Validate a user operation
     * @param {string} walletAddress - Address of the wallet
     * @param {UserOperation} userOp - User operation object
     * @param {string} userOpHash - Hash of the user operation
     * @param {ethers.BigNumberish} missingAccountFunds - Missing account funds
     * @returns {Promise<ethers.BigNumber>} - Validation result
     */
    async validateUserOp(walletAddress, userOp, userOpHash, missingAccountFunds) {
        const contract = this.getContract(walletAddress);
        return contract.validateUserOp(userOp, userOpHash, missingAccountFunds);
    }
    /**
     * Send a user operation through the entry point
     * @param {UserOperation} userOp - User operation object
     * @returns {Promise<string>} - Transaction hash
     */
    async sendUserOperation(userOp) {
        const entryPointContract = new ethers_1.ethers.Contract(this.sdk.entryPointAddress, ['function handleOps(tuple(address sender, uint256 nonce, bytes initCode, bytes callData, uint256 callGasLimit, uint256 verificationGasLimit, uint256 preVerificationGas, uint256 maxFeePerGas, uint256 maxPriorityFeePerGas, bytes paymasterAndData, bytes signature)[] ops, address payable beneficiary)'], this.getSigner());
        const tx = await entryPointContract.handleOps([userOp], this.getSigner().address);
        return tx.hash;
    }
    /**
     * Convert a hash to an Ethereum signed message hash
     * @param {string} walletAddress - Address of the wallet
     * @param {string} hash - Hash to convert
     * @returns {Promise<string>} - Ethereum signed message hash
     */
    async toEthSignedMessageHash(walletAddress, hash) {
        const contract = this.getContract(walletAddress);
        return contract.toEthSignedMessageHash(hash);
    }
}
exports.RyzerCore = RyzerCore;
