"use strict";
/**
 * @title RyzerCrosschain Module
 * @description TypeScript module for interacting with the RyzerCrosschain contract
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RyzerCrosschain = void 0;
const ethers_1 = require("ethers");
// Import ABI
const RyzerCrosschain_json_1 = __importDefault(require("../abis/RyzerCrosschain.json"));
class RyzerCrosschain {
    /**
     * Initialize the RyzerCrosschain module
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
        return new ethers_1.ethers.Contract(walletAddress, RyzerCrosschain_json_1.default, this.provider);
    }
    /**
     * Get a signer for transactions
     * @returns {ethers.Wallet} - Wallet instance with signer
     */
    getSigner() {
        return new ethers_1.ethers.Wallet(this.sdk.privateKey, this.provider);
    }
    /**
     * Transfer ERC20 tokens across chains
     * @param {string} walletAddress - Address of the wallet
     * @param {TransferERC20Params} params - Transfer parameters
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    async transferERC20(walletAddress, params) {
        const contract = this.getContract(walletAddress).connect(this.getSigner());
        return contract.transferERC20(params.token, params.amount, params.recipient, params.targetChainId, params.adapterParams || '0x');
    }
    /**
     * Transfer ERC721 tokens across chains
     * @param {string} walletAddress - Address of the wallet
     * @param {TransferERC721Params} params - Transfer parameters
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    async transferERC721(walletAddress, params) {
        const contract = this.getContract(walletAddress).connect(this.getSigner());
        return contract.transferERC721(params.token, params.tokenId, params.recipient, params.targetChainId, params.adapterParams || '0x');
    }
    /**
     * Transfer ERC1155 tokens across chains
     * @param {string} walletAddress - Address of the wallet
     * @param {TransferERC1155Params} params - Transfer parameters
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    async transferERC1155(walletAddress, params) {
        const contract = this.getContract(walletAddress).connect(this.getSigner());
        return contract.transferERC1155(params.token, params.tokenIds, params.amounts, params.recipient, params.targetChainId, params.adapterParams || '0x');
    }
    /**
     * Estimate cross-chain transfer fee
     * @param {string} walletAddress - Address of the wallet
     * @param {EstimateCrossChainFeeParams} params - Fee estimation parameters
     * @returns {Promise<ethers.BigNumber>} - Fee estimation
     */
    async estimateCrossChainFee(walletAddress, params) {
        const contract = this.getContract(walletAddress);
        return contract.estimateCrossChainFee(params.token, params.amount, params.targetChainId, params.adapterParams || '0x', params.tokenIds || [], params.amounts || []);
    }
    /**
     * Check if a chain is supported
     * @param {string} walletAddress - Address of the wallet
     * @param {number} chainId - Chain ID to check
     * @returns {Promise<boolean>} - Whether the chain is supported
     */
    async isChainSupported(walletAddress, chainId) {
        const contract = this.getContract(walletAddress);
        return contract.isChainSupported(chainId);
    }
    /**
     * Add a token to supported tokens
     * @param {string} walletAddress - Address of the wallet
     * @param {string} token - Token address
     * @param {TokenMetadata} metadata - Token metadata
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    async addSupportedToken(walletAddress, token, metadata) {
        const contract = this.getContract(walletAddress).connect(this.getSigner());
        return contract.addSupportedToken(token, metadata);
    }
    /**
     * Remove a token from supported tokens
     * @param {string} walletAddress - Address of the wallet
     * @param {string} token - Token address
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    async removeSupportedToken(walletAddress, token) {
        const contract = this.getContract(walletAddress).connect(this.getSigner());
        return contract.removeSupportedToken(token);
    }
    /**
     * Add a cross-chain adapter
     * @param {string} walletAddress - Address of the wallet
     * @param {string} adapter - Adapter address
     * @param {number} priority - Adapter priority
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    async addCrossChainAdapter(walletAddress, adapter, priority) {
        const contract = this.getContract(walletAddress).connect(this.getSigner());
        return contract.addCrossChainAdapter(adapter, priority);
    }
    /**
     * Remove a cross-chain adapter
     * @param {string} walletAddress - Address of the wallet
     * @param {string} adapter - Adapter address
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    async removeCrossChainAdapter(walletAddress, adapter) {
        const contract = this.getContract(walletAddress).connect(this.getSigner());
        return contract.removeCrossChainAdapter(adapter);
    }
    /**
     * Update a cross-chain adapter's priority
     * @param {string} walletAddress - Address of the wallet
     * @param {string} adapter - Adapter address
     * @param {number} priority - New priority
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    async updateAdapterPriority(walletAddress, adapter, priority) {
        const contract = this.getContract(walletAddress).connect(this.getSigner());
        return contract.updateAdapterPriority(adapter, priority);
    }
    /**
     * Update adapter performance metrics
     * @param {string} walletAddress - Address of the wallet
     * @param {string} adapter - Adapter address
     * @param {boolean} success - Whether the transfer succeeded
     * @param {number} latency - Transfer latency in seconds
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    async updateAdapterPerformance(walletAddress, adapter, success, latency) {
        const contract = this.getContract(walletAddress).connect(this.getSigner());
        return contract.updateAdapterPerformance(adapter, success, latency);
    }
    /**
     * Set the fee recipient
     * @param {string} walletAddress - Address of the wallet
     * @param {string} feeRecipient - Fee recipient address
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    async setFeeRecipient(walletAddress, feeRecipient) {
        const contract = this.getContract(walletAddress).connect(this.getSigner());
        return contract.setFeeRecipient(feeRecipient);
    }
    /**
     * Set the fee percentage
     * @param {string} walletAddress - Address of the wallet
     * @param {number} feePercentage - Fee percentage (in basis points)
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    async setFeePercentage(walletAddress, feePercentage) {
        const contract = this.getContract(walletAddress).connect(this.getSigner());
        return contract.setFeePercentage(feePercentage);
    }
    /**
     * Get transaction history
     * @param {string} walletAddress - Address of the wallet
     * @param {number} start - Start index
     * @param {number} limit - Number of transactions to retrieve
     * @returns {Promise<Array<any>>} - Transaction history
     */
    async getTransactionHistory(walletAddress, start, limit) {
        const contract = this.getContract(walletAddress);
        return contract.getTransactionHistory(start, limit);
    }
    /**
     * Get adapter performance metrics
     * @param {string} walletAddress - Address of the wallet
     * @param {string} adapter - Adapter address
     * @returns {Promise<AdapterPerformance>} - Adapter performance metrics
     */
    async getAdapterPerformance(walletAddress, adapter) {
        const contract = this.getContract(walletAddress);
        const performance = await contract.adapterPerformance(adapter);
        return {
            successCount: performance.successCount.toNumber(),
            failureCount: performance.failureCount.toNumber(),
            totalLatency: performance.totalLatency.toNumber(),
            transferCount: performance.transferCount.toNumber()
        };
    }
    /**
     * Get the CCIP router address
     * @param {string} walletAddress - Address of the wallet
     * @returns {Promise<string>} - CCIP router address
     */
    async getCcipRouter(walletAddress) {
        const contract = this.getContract(walletAddress);
        return contract.ccipRouter();
    }
    /**
     * Get the fee recipient address
     * @param {string} walletAddress - Address of the wallet
     * @returns {Promise<string>} - Fee recipient address
     */
    async getFeeRecipient(walletAddress) {
        const contract = this.getContract(walletAddress);
        return contract.feeRecipient();
    }
    /**
     * Get the fee percentage
     * @param {string} walletAddress - Address of the wallet
     * @returns {Promise<number>} - Fee percentage (in basis points)
     */
    async getFeePercentage(walletAddress) {
        const contract = this.getContract(walletAddress);
        return (await contract.feePercentage()).toNumber();
    }
    /**
     * Check if a token is supported
     * @param {string} walletAddress - Address of the wallet
     * @param {string} token - Token address
     * @returns {Promise<boolean>} - Whether the token is supported
     */
    async isTokenSupported(walletAddress, token) {
        const contract = this.getContract(walletAddress);
        return contract.isTokenSupported(token);
    }
    /**
     * Check if a token is blacklisted
     * @param {string} walletAddress - Address of the wallet
     * @param {string} token - Token address
     * @returns {Promise<boolean>} - Whether the token is blacklisted
     */
    async isTokenBlacklisted(walletAddress, token) {
        const contract = this.getContract(walletAddress);
        return contract.blacklistedTokens(token);
    }
    /**
     * Get token metadata
     * @param {string} walletAddress - Address of the wallet
     * @param {string} token - Token address
     * @returns {Promise<TokenMetadata>} - Token metadata
     */
    async getTokenMetadata(walletAddress, token) {
        const contract = this.getContract(walletAddress);
        const metadata = await contract.tokenMetadata(token);
        return {
            complianceLevel: metadata.complianceLevel.toNumber(),
            tokenStandard: metadata.tokenStandard,
            isLocked: metadata.isLocked,
            isEmergencyStopped: metadata.isEmergencyStopped,
            approvalExpiry: metadata.approvalExpiry
        };
    }
}
exports.RyzerCrosschain = RyzerCrosschain;
