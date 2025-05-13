/**
 * @title RyzerTokenManagement Module
 * @description TypeScript module for interacting with the RyzerTokenManagement contract
 */
import { ethers } from 'ethers';
import { RyzerSDK } from '../index';
import { TokenApproval, TokenAllowance, TokenBalance } from '../types';
import { ExtendedContract } from '../types/contract';
export declare class RyzerTokenManagement {
    private readonly sdk;
    private readonly provider;
    /**
     * Initialize the RyzerTokenManagement module
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
     * Deposit ETH to a wallet
     * @param {string} walletAddress - Address of the wallet
     * @param {ethers.BigNumberish} amount - Amount of ETH to deposit (in wei)
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    depositEth(walletAddress: string, amount: ethers.BigNumberish): Promise<ethers.ContractTransaction>;
    /**
     * Deposit ERC20 tokens to a wallet
     * @param {string} walletAddress - Address of the wallet
     * @param {string} tokenAddress - Address of the token
     * @param {ethers.BigNumberish} amount - Amount of tokens to deposit
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    depositERC20(walletAddress: string, tokenAddress: string, amount: ethers.BigNumberish): Promise<ethers.ContractTransaction>;
    /**
     * Deposit ERC721 tokens to a wallet
     * @param {string} walletAddress - Address of the wallet
     * @param {string} tokenAddress - Address of the token
     * @param {ethers.BigNumberish} tokenId - Token ID
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    depositERC721(walletAddress: string, tokenAddress: string, tokenId: ethers.BigNumberish): Promise<ethers.ContractTransaction>;
    /**
     * Deposit ERC1155 tokens to a wallet
     * @param {string} walletAddress - Address of the wallet
     * @param {string} tokenAddress - Address of the token
     * @param {ethers.BigNumberish} tokenId - Token ID
     * @param {ethers.BigNumberish} amount - Amount of tokens to deposit
     * @param {string} data - Additional data
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    depositERC1155(walletAddress: string, tokenAddress: string, tokenId: ethers.BigNumberish, amount: ethers.BigNumberish, data?: string): Promise<ethers.ContractTransaction>;
    /**
     * Withdraw ETH from a wallet
     * @param {string} walletAddress - Address of the wallet
     * @param {string} recipient - Recipient address
     * @param {ethers.BigNumberish} amount - Amount of ETH to withdraw (in wei)
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    withdrawEth(walletAddress: string, recipient: string, amount: ethers.BigNumberish): Promise<ethers.ContractTransaction>;
    /**
     * Withdraw ERC20 tokens from a wallet
     * @param {string} walletAddress - Address of the wallet
     * @param {string} tokenAddress - Address of the token
     * @param {string} recipient - Recipient address
     * @param {ethers.BigNumberish} amount - Amount of tokens to withdraw
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    withdrawERC20(walletAddress: string, tokenAddress: string, recipient: string, amount: ethers.BigNumberish): Promise<ethers.ContractTransaction>;
    /**
     * Withdraw ERC721 tokens from a wallet
     * @param {string} walletAddress - Address of the wallet
     * @param {string} tokenAddress - Address of the token
     * @param {string} recipient - Recipient address
     * @param {ethers.BigNumberish} tokenId - Token ID
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    withdrawERC721(walletAddress: string, tokenAddress: string, recipient: string, tokenId: ethers.BigNumberish): Promise<ethers.ContractTransaction>;
    /**
     * Withdraw ERC1155 tokens from a wallet
     * @param {string} walletAddress - Address of the wallet
     * @param {string} tokenAddress - Address of the token
     * @param {string} recipient - Recipient address
     * @param {ethers.BigNumberish} tokenId - Token ID
     * @param {ethers.BigNumberish} amount - Amount of tokens to withdraw
     * @param {string} data - Additional data
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    withdrawERC1155(walletAddress: string, tokenAddress: string, recipient: string, tokenId: ethers.BigNumberish, amount: ethers.BigNumberish, data?: string): Promise<ethers.ContractTransaction>;
    /**
     * Approve ERC20 tokens for spending
     * @param {string} walletAddress - Address of the wallet
     * @param {string} tokenAddress - Address of the token
     * @param {string} spender - Spender address
     * @param {ethers.BigNumberish} amount - Amount of tokens to approve
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    approveERC20(walletAddress: string, tokenAddress: string, spender: string, amount: ethers.BigNumberish): Promise<ethers.ContractTransaction>;
    /**
     * Approve ERC721 tokens for spending
     * @param {string} walletAddress - Address of the wallet
     * @param {string} tokenAddress - Address of the token
     * @param {string} operator - Operator address
     * @param {boolean} approved - Approval status
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    approveERC721(walletAddress: string, tokenAddress: string, operator: string, approved: boolean): Promise<ethers.ContractTransaction>;
    /**
     * Approve ERC1155 tokens for spending
     * @param {string} walletAddress - Address of the wallet
     * @param {string} tokenAddress - Address of the token
     * @param {string} operator - Operator address
     * @param {boolean} approved - Approval status
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    approveERC1155(walletAddress: string, tokenAddress: string, operator: string, approved: boolean): Promise<ethers.ContractTransaction>;
    /**
     * Execute a token transfer
     * @param {string} walletAddress - Address of the wallet
     * @param {string} tokenAddress - Address of the token
     * @param {string} to - Recipient address
     * @param {ethers.BigNumberish} value - Amount of tokens to transfer
     * @param {string} data - Additional data
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    executeTokenTransfer(walletAddress: string, tokenAddress: string, to: string, value: ethers.BigNumberish, data?: string): Promise<ethers.ContractTransaction>;
    /**
     * Get a token approval
     * @param {string} walletAddress - Address of the wallet
     * @param {string} tokenAddress - Address of the token
     * @param {string} spender - Spender address
     * @returns {Promise<TokenApproval>} - Token approval
     */
    getTokenApproval(walletAddress: string, tokenAddress: string, spender: string): Promise<TokenApproval>;
    /**
     * Get a token allowance
     * @param {string} walletAddress - Address of the wallet
     * @param {string} tokenAddress - Address of the token
     * @param {string} spender - Spender address
     * @returns {Promise<TokenAllowance>} - Token allowance
     */
    getTokenAllowance(walletAddress: string, tokenAddress: string, spender: string): Promise<TokenAllowance>;
    /**
     * Get a token balance
     * @param {string} walletAddress - Address of the wallet
     * @param {string} tokenAddress - Address of the token
     * @param {ethers.BigNumberish} tokenId - Token ID (for ERC721 and ERC1155)
     * @returns {Promise<TokenBalance>} - Token balance
     */
    getTokenBalance(walletAddress: string, tokenAddress: string, tokenId?: ethers.BigNumberish): Promise<TokenBalance>;
    /**
     * Get the ETH balance of a wallet
     * @param {string} walletAddress - Address of the wallet
     * @returns {Promise<ethers.BigNumber>} - ETH balance
     */
    getEthBalance(walletAddress: string): Promise<ethers.BigNumber>;
    /**
     * Get all tokens owned by a wallet
     * @param {string} walletAddress - Address of the wallet
     * @returns {Promise<string[]>} - Array of token addresses
     */
    getOwnedTokens(walletAddress: string): Promise<string[]>;
    /**
     * Get all ERC721 tokens owned by a wallet
     * @param {string} walletAddress - Address of the wallet
     * @param {string} tokenAddress - Address of the token
     * @returns {Promise<ethers.BigNumber[]>} - Array of token IDs
     */
    getOwnedERC721Tokens(walletAddress: string, tokenAddress: string): Promise<ethers.BigNumber[]>;
    /**
     * Get all ERC1155 tokens owned by a wallet
     * @param {string} walletAddress - Address of the wallet
     * @param {string} tokenAddress - Address of the token
     * @returns {Promise<{id: ethers.BigNumber, balance: ethers.BigNumber}[]>} - Array of token IDs and balances
     */
    getOwnedERC1155Tokens(walletAddress: string, tokenAddress: string): Promise<{
        id: ethers.BigNumber;
        balance: ethers.BigNumber;
    }[]>;
    /**
     * Check if a token is blacklisted
     * @param {string} walletAddress - Address of the wallet
     * @param {string} tokenAddress - Address of the token
     * @returns {Promise<boolean>} - Whether the token is blacklisted
     */
    isTokenBlacklisted(walletAddress: string, tokenAddress: string): Promise<boolean>;
    /**
     * Add a token to the blacklist
     * @param {string} walletAddress - Address of the wallet
     * @param {string} tokenAddress - Address of the token
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    blacklistToken(walletAddress: string, tokenAddress: string): Promise<ethers.ContractTransaction>;
    /**
     * Remove a token from the blacklist
     * @param {string} walletAddress - Address of the wallet
     * @param {string} tokenAddress - Address of the token
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    unblacklistToken(walletAddress: string, tokenAddress: string): Promise<ethers.ContractTransaction>;
    /**
     * Set the emergency stop status
     * @param {string} walletAddress - Address of the wallet
     * @param {boolean} stopped - Emergency stop status
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    setEmergencyStop(walletAddress: string, stopped: boolean): Promise<ethers.ContractTransaction>;
    /**
     * Get the emergency stopped status
     * @param {string} walletAddress - Address of the wallet
     * @returns {Promise<boolean>} - Emergency stopped status
     */
    getEmergencyStopped(walletAddress: string): Promise<boolean>;
}
