/**
 * @title RyzerRecovery Module
 * @description TypeScript module for interacting with the RyzerWalletRecovery contract
 */
import { ethers } from 'ethers';
import { RyzerSDK } from '../index';
import { RecoveryRequest, RecoveryProof, GuardianInfo } from '../types';
import { ExtendedContract } from '../types/contract';
export declare class RyzerRecovery {
    private readonly sdk;
    private readonly provider;
    /**
     * Initialize the RyzerRecovery module
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
     * Add a guardian to a wallet
     * @param {string} walletAddress - Address of the wallet
     * @param {string} guardianAddress - Address of the guardian
     * @param {number} weight - Guardian weight
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    addGuardian(walletAddress: string, guardianAddress: string, weight: number): Promise<ethers.ContractTransaction>;
    /**
     * Remove a guardian from a wallet
     * @param {string} walletAddress - Address of the wallet
     * @param {string} guardianAddress - Address of the guardian
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    removeGuardian(walletAddress: string, guardianAddress: string): Promise<ethers.ContractTransaction>;
    /**
     * Update a guardian's weight
     * @param {string} walletAddress - Address of the wallet
     * @param {string} guardianAddress - Address of the guardian
     * @param {number} weight - New guardian weight
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    updateGuardianWeight(walletAddress: string, guardianAddress: string, weight: number): Promise<ethers.ContractTransaction>;
    /**
     * Set the recovery threshold
     * @param {string} walletAddress - Address of the wallet
     * @param {number} threshold - Recovery threshold
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    setRecoveryThreshold(walletAddress: string, threshold: number): Promise<ethers.ContractTransaction>;
    /**
     * Set the recovery delay
     * @param {string} walletAddress - Address of the wallet
     * @param {number} delay - Recovery delay in seconds
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    setRecoveryDelay(walletAddress: string, delay: number): Promise<ethers.ContractTransaction>;
    /**
     * Set the recovery expiry
     * @param {string} walletAddress - Address of the wallet
     * @param {number} expiry - Recovery expiry in seconds
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    setRecoveryExpiry(walletAddress: string, expiry: number): Promise<ethers.ContractTransaction>;
    /**
     * Initiate a recovery request
     * @param {string} walletAddress - Address of the wallet
     * @param {string} newOwner - Address of the new owner
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    initiateRecovery(walletAddress: string, newOwner: string): Promise<ethers.ContractTransaction>;
    /**
     * Support a recovery request
     * @param {string} walletAddress - Address of the wallet
     * @param {number} requestId - ID of the recovery request
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    supportRecovery(walletAddress: string, requestId: number): Promise<ethers.ContractTransaction>;
    /**
     * Cancel a recovery request
     * @param {string} walletAddress - Address of the wallet
     * @param {number} requestId - ID of the recovery request
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    cancelRecovery(walletAddress: string, requestId: number): Promise<ethers.ContractTransaction>;
    /**
     * Execute a recovery request
     * @param {string} walletAddress - Address of the wallet
     * @param {number} requestId - ID of the recovery request
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    executeRecovery(walletAddress: string, requestId: number): Promise<ethers.ContractTransaction>;
    /**
     * Submit a recovery proof
     * @param {string} walletAddress - Address of the wallet
     * @param {RecoveryProof} proof - Recovery proof object
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    submitRecoveryProof(walletAddress: string, proof: RecoveryProof): Promise<ethers.ContractTransaction>;
    /**
     * Get a recovery request
     * @param {string} walletAddress - Address of the wallet
     * @param {number} requestId - ID of the recovery request
     * @returns {Promise<RecoveryRequest>} - Recovery request object
     */
    getRecoveryRequest(walletAddress: string, requestId: number): Promise<RecoveryRequest>;
    /**
     * Get a guardian's information
     * @param {string} walletAddress - Address of the wallet
     * @param {string} guardianAddress - Address of the guardian
     * @returns {Promise<GuardianInfo>} - Guardian information
     */
    getGuardian(walletAddress: string, guardianAddress: string): Promise<GuardianInfo>;
    /**
     * Get all active guardians
     * @param {string} walletAddress - Address of the wallet
     * @returns {Promise<string[]>} - Array of guardian addresses
     */
    getActiveGuardians(walletAddress: string): Promise<string[]>;
    /**
     * Get the recovery threshold
     * @param {string} walletAddress - Address of the wallet
     * @returns {Promise<number>} - Recovery threshold
     */
    getRecoveryThreshold(walletAddress: string): Promise<number>;
    /**
     * Get the recovery delay
     * @param {string} walletAddress - Address of the wallet
     * @returns {Promise<number>} - Recovery delay in seconds
     */
    getRecoveryDelay(walletAddress: string): Promise<number>;
    /**
     * Get the recovery expiry
     * @param {string} walletAddress - Address of the wallet
     * @returns {Promise<number>} - Recovery expiry in seconds
     */
    getRecoveryExpiry(walletAddress: string): Promise<number>;
    /**
     * Get the next recovery request ID
     * @param {string} walletAddress - Address of the wallet
     * @returns {Promise<number>} - Next recovery request ID
     */
    getNextRecoveryRequestId(walletAddress: string): Promise<number>;
    /**
     * Check if a recovery request is valid
     * @param {string} walletAddress - Address of the wallet
     * @param {number} requestId - ID of the recovery request
     * @returns {Promise<boolean>} - Whether the recovery request is valid
     */
    isRecoveryRequestValid(walletAddress: string, requestId: number): Promise<boolean>;
    /**
     * Check if a recovery request is ready to execute
     * @param {string} walletAddress - Address of the wallet
     * @param {number} requestId - ID of the recovery request
     * @returns {Promise<boolean>} - Whether the recovery request is ready to execute
     */
    isRecoveryRequestReady(walletAddress: string, requestId: number): Promise<boolean>;
    /**
     * Check if a guardian has supported a recovery request
     * @param {string} walletAddress - Address of the wallet
     * @param {number} requestId - ID of the recovery request
     * @param {string} guardianAddress - Address of the guardian
     * @returns {Promise<boolean>} - Whether the guardian has supported the recovery request
     */
    hasGuardianSupportedRecovery(walletAddress: string, requestId: number, guardianAddress: string): Promise<boolean>;
}
