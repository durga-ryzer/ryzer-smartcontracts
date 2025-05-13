/**
 * @title RyzerCore Module
 * @description TypeScript module for interacting with the RyzerWalletCore contract
 */
import { ethers } from 'ethers';
import { RyzerSDK } from '../index';
import { UserOperation, MultiSignerConfig } from '../types';
import { ExtendedContract } from '../types/contract';
export declare class RyzerCore {
    private readonly sdk;
    private readonly provider;
    private contract;
    /**
     * Initialize the RyzerCore module
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
     * Set a delegated signer for a wallet
     * @param {string} walletAddress - Address of the wallet
     * @param {string} signerAddress - Address of the delegated signer
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    setDelegatedSigner(walletAddress: string, signerAddress: string): Promise<ethers.ContractTransaction>;
    /**
     * Set multiple signers for a wallet with a Merkle root
     * @param {string} walletAddress - Address of the wallet
     * @param {string[]} signers - Array of signer addresses
     * @param {number} threshold - Signature threshold
     * @param {string} merkleRoot - Merkle root of signers
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    setMultiSigners(walletAddress: string, signers: string[], threshold: number, merkleRoot: string): Promise<ethers.ContractTransaction>;
    /**
     * Set emergency stop status
     * @param {string} walletAddress - Address of the wallet
     * @param {boolean} stopped - Emergency stop status
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    setEmergencyStop(walletAddress: string, stopped: boolean): Promise<ethers.ContractTransaction>;
    /**
     * Revoke a role from an account
     * @param {string} walletAddress - Address of the wallet
     * @param {string} role - Role identifier (bytes32)
     * @param {string} account - Account address
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    revokeRole(walletAddress: string, role: string, account: string): Promise<ethers.ContractTransaction>;
    /**
     * Check if an account has a specific role
     * @param {string} walletAddress - Address of the wallet
     * @param {string} role - Role identifier (bytes32)
     * @param {string} account - Account address
     * @returns {Promise<boolean>} - Whether the account has the role
     */
    hasRole(walletAddress: string, role: string, account: string): Promise<boolean>;
    /**
     * Get the delegated signer for a user
     * @param {string} walletAddress - Address of the wallet
     * @param {string} userAddress - User address
     * @returns {Promise<string>} - Delegated signer address
     */
    getDelegatedSigner(walletAddress: string, userAddress: string): Promise<string>;
    /**
     * Get the multi-signer configuration for a user
     * @param {string} walletAddress - Address of the wallet
     * @param {string} userAddress - User address
     * @returns {Promise<MultiSignerConfig>} - Multi-signer configuration
     */
    getMultiSigners(walletAddress: string, userAddress: string): Promise<MultiSignerConfig>;
    /**
     * Get the emergency stopped status
     * @param {string} walletAddress - Address of the wallet
     * @returns {Promise<boolean>} - Emergency stopped status
     */
    getEmergencyStopped(walletAddress: string): Promise<boolean>;
    /**
     * Get the entry point address
     * @param {string} walletAddress - Address of the wallet
     * @returns {Promise<string>} - Entry point address
     */
    getEntryPoint(walletAddress: string): Promise<string>;
    /**
     * Get the paymaster address
     * @param {string} walletAddress - Address of the wallet
     * @returns {Promise<string>} - Paymaster address
     */
    getPaymaster(walletAddress: string): Promise<string>;
    /**
     * Get the timelock address
     * @param {string} walletAddress - Address of the wallet
     * @returns {Promise<string>} - Timelock address
     */
    getTimelock(walletAddress: string): Promise<string>;
    /**
     * Get the threshold value
     * @param {string} walletAddress - Address of the wallet
     * @returns {Promise<number>} - Threshold value
     */
    getThreshold(walletAddress: string): Promise<number>;
    /**
     * Get the user ID for a user address
     * @param {string} walletAddress - Address of the wallet
     * @param {string} userAddress - User address
     * @returns {Promise<number>} - User ID
     */
    getUserId(walletAddress: string, userAddress: string): Promise<number>;
    /**
     * Get the last operation block for a user
     * @param {string} walletAddress - Address of the wallet
     * @param {string} userAddress - User address
     * @returns {Promise<number>} - Last operation block
     */
    getLastOperationBlock(walletAddress: string, userAddress: string): Promise<number>;
    /**
     * Get the nonce for a user
     * @param {string} walletAddress - Address of the wallet
     * @param {string} userAddress - User address
     * @returns {Promise<number>} - Nonce value
     */
    getNonce(walletAddress: string, userAddress: string): Promise<number>;
    /**
     * Validate a user operation
     * @param {string} walletAddress - Address of the wallet
     * @param {UserOperation} userOp - User operation object
     * @param {string} userOpHash - Hash of the user operation
     * @param {ethers.BigNumberish} missingAccountFunds - Missing account funds
     * @returns {Promise<ethers.BigNumber>} - Validation result
     */
    validateUserOp(walletAddress: string, userOp: UserOperation, userOpHash: string, missingAccountFunds: ethers.BigNumberish): Promise<ethers.BigNumber>;
    /**
     * Send a user operation through the entry point
     * @param {UserOperation} userOp - User operation object
     * @returns {Promise<string>} - Transaction hash
     */
    sendUserOperation(userOp: UserOperation): Promise<string>;
    /**
     * Convert a hash to an Ethereum signed message hash
     * @param {string} walletAddress - Address of the wallet
     * @param {string} hash - Hash to convert
     * @returns {Promise<string>} - Ethereum signed message hash
     */
    toEthSignedMessageHash(walletAddress: string, hash: string): Promise<string>;
}
