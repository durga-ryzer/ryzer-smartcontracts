"use strict";
/**
 * @title RyzerRecovery Module
 * @description TypeScript module for interacting with the RyzerWalletRecovery contract
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RyzerRecovery = void 0;
const ethers_1 = require("ethers");
// Import ABI
const RyzerWalletRecovery_json_1 = __importDefault(require("../abis/RyzerWalletRecovery.json"));
class RyzerRecovery {
    /**
     * Initialize the RyzerRecovery module
     * @param {RyzerSDK} sdk - The main RyzerSDK instance
     */
    constructor(sdk) {
        this.sdk = sdk;
        this.provider = sdk.provider;
    }
    /**
     * Get contract instance for a specific wallet address
     * @param {string} walletAddress - Address of the wallet
     * @returns {ExtendedContract} - Contract instance
     */
    getContract(walletAddress) {
        return new ethers_1.ethers.Contract(walletAddress, RyzerWalletRecovery_json_1.default, this.provider);
    }
    /**
     * Get a signer for transactions
     * @returns {ethers.Wallet} - Wallet instance with signer
     */
    getSigner() {
        return new ethers_1.ethers.Wallet(this.sdk.privateKey, this.provider);
    }
    /**
     * Add a guardian to a wallet
     * @param {string} walletAddress - Address of the wallet
     * @param {string} guardianAddress - Address of the guardian
     * @param {number} weight - Guardian weight
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    async addGuardian(walletAddress, guardianAddress, weight) {
        const contract = this.getContract(walletAddress).connect(this.getSigner());
        return contract.addGuardian(guardianAddress, weight);
    }
    /**
     * Remove a guardian from a wallet
     * @param {string} walletAddress - Address of the wallet
     * @param {string} guardianAddress - Address of the guardian
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    async removeGuardian(walletAddress, guardianAddress) {
        const contract = this.getContract(walletAddress).connect(this.getSigner());
        return contract.removeGuardian(guardianAddress);
    }
    /**
     * Update a guardian's weight
     * @param {string} walletAddress - Address of the wallet
     * @param {string} guardianAddress - Address of the guardian
     * @param {number} weight - New guardian weight
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    async updateGuardianWeight(walletAddress, guardianAddress, weight) {
        const contract = this.getContract(walletAddress).connect(this.getSigner());
        return contract.updateGuardianWeight(guardianAddress, weight);
    }
    /**
     * Set the recovery threshold
     * @param {string} walletAddress - Address of the wallet
     * @param {number} threshold - Recovery threshold
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    async setRecoveryThreshold(walletAddress, threshold) {
        const contract = this.getContract(walletAddress).connect(this.getSigner());
        return contract.setRecoveryThreshold(threshold);
    }
    /**
     * Set the recovery delay
     * @param {string} walletAddress - Address of the wallet
     * @param {number} delay - Recovery delay in seconds
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    async setRecoveryDelay(walletAddress, delay) {
        const contract = this.getContract(walletAddress).connect(this.getSigner());
        return contract.setRecoveryDelay(delay);
    }
    /**
     * Set the recovery expiry
     * @param {string} walletAddress - Address of the wallet
     * @param {number} expiry - Recovery expiry in seconds
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    async setRecoveryExpiry(walletAddress, expiry) {
        const contract = this.getContract(walletAddress).connect(this.getSigner());
        return contract.setRecoveryExpiry(expiry);
    }
    /**
     * Initiate a recovery request
     * @param {string} walletAddress - Address of the wallet
     * @param {string} newOwner - Address of the new owner
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    async initiateRecovery(walletAddress, newOwner) {
        const contract = this.getContract(walletAddress).connect(this.getSigner());
        return contract.initiateRecovery(newOwner);
    }
    /**
     * Support a recovery request
     * @param {string} walletAddress - Address of the wallet
     * @param {number} requestId - ID of the recovery request
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    async supportRecovery(walletAddress, requestId) {
        const contract = this.getContract(walletAddress).connect(this.getSigner());
        return contract.supportRecovery(requestId);
    }
    /**
     * Cancel a recovery request
     * @param {string} walletAddress - Address of the wallet
     * @param {number} requestId - ID of the recovery request
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    async cancelRecovery(walletAddress, requestId) {
        const contract = this.getContract(walletAddress).connect(this.getSigner());
        return contract.cancelRecovery(requestId);
    }
    /**
     * Execute a recovery request
     * @param {string} walletAddress - Address of the wallet
     * @param {number} requestId - ID of the recovery request
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    async executeRecovery(walletAddress, requestId) {
        const contract = this.getContract(walletAddress).connect(this.getSigner());
        return contract.executeRecovery(requestId);
    }
    /**
     * Submit a recovery proof
     * @param {string} walletAddress - Address of the wallet
     * @param {RecoveryProof} proof - Recovery proof object
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    async submitRecoveryProof(walletAddress, proof) {
        const contract = this.getContract(walletAddress).connect(this.getSigner());
        return contract.submitRecoveryProof(proof.requestId, proof.guardian, proof.signature, proof.merkleProof ? JSON.stringify(proof.merkleProof) : '0x' // Convert merkleProof to string data
        );
    }
    /**
     * Get a recovery request
     * @param {string} walletAddress - Address of the wallet
     * @param {number} requestId - ID of the recovery request
     * @returns {Promise<RecoveryRequest>} - Recovery request object
     */
    async getRecoveryRequest(walletAddress, requestId) {
        const contract = this.getContract(walletAddress);
        const request = await contract.recoveryRequests(requestId);
        return {
            initiator: request.initiator,
            newOwner: request.newOwner,
            supportWeight: request.supportWeight.toNumber(),
            initiatedAt: request.initiatedAt.toNumber(),
            expiresAt: request.expiresAt.toNumber(),
            executed: request.executed,
            canceled: request.canceled
        };
    }
    /**
     * Get a guardian's information
     * @param {string} walletAddress - Address of the wallet
     * @param {string} guardianAddress - Address of the guardian
     * @returns {Promise<GuardianInfo>} - Guardian information
     */
    async getGuardian(walletAddress, guardianAddress) {
        const contract = this.getContract(walletAddress);
        const guardian = await contract.guardians(guardianAddress);
        return {
            weight: guardian.weight.toNumber(),
            active: guardian.active
        };
    }
    /**
     * Get all active guardians
     * @param {string} walletAddress - Address of the wallet
     * @returns {Promise<string[]>} - Array of guardian addresses
     */
    async getActiveGuardians(walletAddress) {
        const contract = this.getContract(walletAddress);
        return contract.getActiveGuardians();
    }
    /**
     * Get the recovery threshold
     * @param {string} walletAddress - Address of the wallet
     * @returns {Promise<number>} - Recovery threshold
     */
    async getRecoveryThreshold(walletAddress) {
        const contract = this.getContract(walletAddress);
        return (await contract.recoveryThreshold()).toNumber();
    }
    /**
     * Get the recovery delay
     * @param {string} walletAddress - Address of the wallet
     * @returns {Promise<number>} - Recovery delay in seconds
     */
    async getRecoveryDelay(walletAddress) {
        const contract = this.getContract(walletAddress);
        return (await contract.recoveryDelay()).toNumber();
    }
    /**
     * Get the recovery expiry
     * @param {string} walletAddress - Address of the wallet
     * @returns {Promise<number>} - Recovery expiry in seconds
     */
    async getRecoveryExpiry(walletAddress) {
        const contract = this.getContract(walletAddress);
        return (await contract.recoveryExpiry()).toNumber();
    }
    /**
     * Get the next recovery request ID
     * @param {string} walletAddress - Address of the wallet
     * @returns {Promise<number>} - Next recovery request ID
     */
    async getNextRecoveryRequestId(walletAddress) {
        const contract = this.getContract(walletAddress);
        return (await contract.nextRecoveryRequestId()).toNumber();
    }
    /**
     * Check if a recovery request is valid
     * @param {string} walletAddress - Address of the wallet
     * @param {number} requestId - ID of the recovery request
     * @returns {Promise<boolean>} - Whether the recovery request is valid
     */
    async isRecoveryRequestValid(walletAddress, requestId) {
        const contract = this.getContract(walletAddress);
        return contract.isRecoveryRequestValid(requestId);
    }
    /**
     * Check if a recovery request is ready to execute
     * @param {string} walletAddress - Address of the wallet
     * @param {number} requestId - ID of the recovery request
     * @returns {Promise<boolean>} - Whether the recovery request is ready to execute
     */
    async isRecoveryRequestReady(walletAddress, requestId) {
        const contract = this.getContract(walletAddress);
        return contract.isRecoveryRequestReady(requestId);
    }
    /**
     * Check if a guardian has supported a recovery request
     * @param {string} walletAddress - Address of the wallet
     * @param {number} requestId - ID of the recovery request
     * @param {string} guardianAddress - Address of the guardian
     * @returns {Promise<boolean>} - Whether the guardian has supported the recovery request
     */
    async hasGuardianSupportedRecovery(walletAddress, requestId, guardianAddress) {
        const contract = this.getContract(walletAddress);
        return contract.recoverySupport(requestId, guardianAddress);
    }
}
exports.RyzerRecovery = RyzerRecovery;
