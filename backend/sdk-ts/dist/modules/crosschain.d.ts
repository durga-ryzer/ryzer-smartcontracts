/**
 * @title RyzerCrosschain Module
 * @description TypeScript module for interacting with the RyzerCrosschain contract
 */
import { ethers } from 'ethers';
import { RyzerSDK } from '../index';
import { TransferERC20Params, TransferERC721Params, TransferERC1155Params, EstimateCrossChainFeeParams, TokenMetadata, AdapterPerformance } from '../types';
import { ExtendedContract } from '../types/contract';
export declare class RyzerCrosschain {
    private readonly sdk;
    private readonly provider;
    /**
     * Initialize the RyzerCrosschain module
     * @param {RyzerSDK} sdk - The main RyzerSDK instance
     */
    constructor(sdk: RyzerSDK);
    /**
     * Get contract instance for a specific wallet address
     * @param {string} walletAddress - Address of the wallet
     * @returns {ExtendedContract} - Contract instance
     */
    getContract(walletAddress: string): ExtendedContract;
    /**
     * Get a signer for transactions
     * @returns {ethers.Wallet} - Wallet instance with signer
     */
    getSigner(): ethers.Wallet;
    /**
     * Transfer ERC20 tokens across chains
     * @param {string} walletAddress - Address of the wallet
     * @param {TransferERC20Params} params - Transfer parameters
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    transferERC20(walletAddress: string, params: TransferERC20Params): Promise<ethers.ContractTransaction>;
    /**
     * Transfer ERC721 tokens across chains
     * @param {string} walletAddress - Address of the wallet
     * @param {TransferERC721Params} params - Transfer parameters
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    transferERC721(walletAddress: string, params: TransferERC721Params): Promise<ethers.ContractTransaction>;
    /**
     * Transfer ERC1155 tokens across chains
     * @param {string} walletAddress - Address of the wallet
     * @param {TransferERC1155Params} params - Transfer parameters
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    transferERC1155(walletAddress: string, params: TransferERC1155Params): Promise<ethers.ContractTransaction>;
    /**
     * Estimate cross-chain transfer fee
     * @param {string} walletAddress - Address of the wallet
     * @param {EstimateCrossChainFeeParams} params - Fee estimation parameters
     * @returns {Promise<ethers.BigNumber>} - Fee estimation
     */
    estimateCrossChainFee(walletAddress: string, params: EstimateCrossChainFeeParams): Promise<ethers.BigNumber>;
    /**
     * Check if a chain is supported
     * @param {string} walletAddress - Address of the wallet
     * @param {number} chainId - Chain ID to check
     * @returns {Promise<boolean>} - Whether the chain is supported
     */
    isChainSupported(walletAddress: string, chainId: number): Promise<boolean>;
    /**
     * Add a token to supported tokens
     * @param {string} walletAddress - Address of the wallet
     * @param {string} token - Token address
     * @param {TokenMetadata} metadata - Token metadata
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    addSupportedToken(walletAddress: string, token: string, metadata: TokenMetadata): Promise<ethers.ContractTransaction>;
    /**
     * Remove a token from supported tokens
     * @param {string} walletAddress - Address of the wallet
     * @param {string} token - Token address
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    removeSupportedToken(walletAddress: string, token: string): Promise<ethers.ContractTransaction>;
    /**
     * Add a cross-chain adapter
     * @param {string} walletAddress - Address of the wallet
     * @param {string} adapter - Adapter address
     * @param {number} priority - Adapter priority
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    addCrossChainAdapter(walletAddress: string, adapter: string, priority: number): Promise<ethers.ContractTransaction>;
    /**
     * Remove a cross-chain adapter
     * @param {string} walletAddress - Address of the wallet
     * @param {string} adapter - Adapter address
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    removeCrossChainAdapter(walletAddress: string, adapter: string): Promise<ethers.ContractTransaction>;
    /**
     * Update a cross-chain adapter's priority
     * @param {string} walletAddress - Address of the wallet
     * @param {string} adapter - Adapter address
     * @param {number} priority - New priority
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    updateAdapterPriority(walletAddress: string, adapter: string, priority: number): Promise<ethers.ContractTransaction>;
    /**
     * Update adapter performance metrics
     * @param {string} walletAddress - Address of the wallet
     * @param {string} adapter - Adapter address
     * @param {boolean} success - Whether the transfer succeeded
     * @param {number} latency - Transfer latency in seconds
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    updateAdapterPerformance(walletAddress: string, adapter: string, success: boolean, latency: number): Promise<ethers.ContractTransaction>;
    /**
     * Set the fee recipient
     * @param {string} walletAddress - Address of the wallet
     * @param {string} feeRecipient - Fee recipient address
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    setFeeRecipient(walletAddress: string, feeRecipient: string): Promise<ethers.ContractTransaction>;
    /**
     * Set the fee percentage
     * @param {string} walletAddress - Address of the wallet
     * @param {number} feePercentage - Fee percentage (in basis points)
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    setFeePercentage(walletAddress: string, feePercentage: number): Promise<ethers.ContractTransaction>;
    /**
     * Get transaction history
     * @param {string} walletAddress - Address of the wallet
     * @param {number} start - Start index
     * @param {number} limit - Number of transactions to retrieve
     * @returns {Promise<Array<any>>} - Transaction history
     */
    getTransactionHistory(walletAddress: string, start: number, limit: number): Promise<Array<any>>;
    /**
     * Get adapter performance metrics
     * @param {string} walletAddress - Address of the wallet
     * @param {string} adapter - Adapter address
     * @returns {Promise<AdapterPerformance>} - Adapter performance metrics
     */
    getAdapterPerformance(walletAddress: string, adapter: string): Promise<AdapterPerformance>;
    /**
     * Get the CCIP router address
     * @param {string} walletAddress - Address of the wallet
     * @returns {Promise<string>} - CCIP router address
     */
    getCcipRouter(walletAddress: string): Promise<string>;
    /**
     * Get the fee recipient address
     * @param {string} walletAddress - Address of the wallet
     * @returns {Promise<string>} - Fee recipient address
     */
    getFeeRecipient(walletAddress: string): Promise<string>;
    /**
     * Get the fee percentage
     * @param {string} walletAddress - Address of the wallet
     * @returns {Promise<number>} - Fee percentage (in basis points)
     */
    getFeePercentage(walletAddress: string): Promise<number>;
    /**
     * Check if a token is supported
     * @param {string} walletAddress - Address of the wallet
     * @param {string} token - Token address
     * @returns {Promise<boolean>} - Whether the token is supported
     */
    isTokenSupported(walletAddress: string, token: string): Promise<boolean>;
    /**
     * Check if a token is blacklisted
     * @param {string} walletAddress - Address of the wallet
     * @param {string} token - Token address
     * @returns {Promise<boolean>} - Whether the token is blacklisted
     */
    isTokenBlacklisted(walletAddress: string, token: string): Promise<boolean>;
    /**
     * Get token metadata
     * @param {string} walletAddress - Address of the wallet
     * @param {string} token - Token address
     * @returns {Promise<TokenMetadata>} - Token metadata
     */
    getTokenMetadata(walletAddress: string, token: string): Promise<TokenMetadata>;
}
