/**
 * @title RyzerFactory Module
 * @description TypeScript module for interacting with the RyzerWalletFactory contract
 */
import { ethers } from 'ethers';
import { RyzerSDK } from '../index';
import { CreateWalletParams } from '../types';
export declare class RyzerFactory {
    private readonly sdk;
    private readonly provider;
    private readonly contract;
    /**
     * Initialize the RyzerFactory module
     * @param {RyzerSDK} sdk - The main RyzerSDK instance
     */
    constructor(sdk: RyzerSDK);
    /**
     * Get a signer for transactions
     * @returns {ethers.Wallet} - Wallet instance with signer
     */
    getSigner(): ethers.Wallet;
    /**
     * Create a new wallet for a user
     * @param {CreateWalletParams} params - Wallet creation parameters
     * @returns {Promise<string>} - New wallet address
     */
    createWallet(params: CreateWalletParams): Promise<string>;
    /**
     * Get a user's wallet address
     * @param {string} userAddress - User's Ethereum address
     * @returns {Promise<string>} - Wallet address
     */
    getWallet(userAddress: string): Promise<string>;
    /**
     * Predict a wallet address before creation
     * @param {string} userAddress - User's Ethereum address
     * @returns {Promise<string>} - Predicted wallet address
     */
    predictWalletAddress(userAddress: string): Promise<string>;
    /**
     * Check if an address is a wallet
     * @param {string} address - Address to check
     * @returns {Promise<boolean>} - Whether the address is a wallet
     */
    isWallet(address: string): Promise<boolean>;
    /**
     * Get the entry point address
     * @returns {Promise<string>} - Entry point address
     */
    getEntryPoint(): Promise<string>;
    /**
     * Get the paymaster address
     * @returns {Promise<string>} - Paymaster address
     */
    getPaymaster(): Promise<string>;
    /**
     * Get the timelock address
     * @returns {Promise<string>} - Timelock address
     */
    getTimelock(): Promise<string>;
    /**
     * Get the wallet implementation address
     * @returns {Promise<string>} - Wallet implementation address
     */
    getWalletImplementation(): Promise<string>;
    /**
     * Get the emergency stopped status
     * @returns {Promise<boolean>} - Emergency stopped status
     */
    getEmergencyStopped(): Promise<boolean>;
    /**
     * Set the emergency stop status (admin only)
     * @param {boolean} stopped - Emergency stop status
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    setEmergencyStop(stopped: boolean): Promise<ethers.ContractTransaction>;
    /**
     * Upgrade the implementation (admin only)
     * @param {string} newImplementation - New implementation address
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    upgradeImplementation(newImplementation: string): Promise<ethers.ContractTransaction>;
    /**
     * Set the entry point (admin only)
     * @param {string} newEntryPoint - New entry point address
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    setEntryPoint(newEntryPoint: string): Promise<ethers.ContractTransaction>;
    /**
     * Set the paymaster (admin only)
     * @param {string} newPaymaster - New paymaster address
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    setPaymaster(newPaymaster: string): Promise<ethers.ContractTransaction>;
    /**
     * Set the timelock (admin only)
     * @param {string} newTimelock - New timelock address
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    setTimelock(newTimelock: string): Promise<ethers.ContractTransaction>;
    /**
     * Get the last operation block for a user
     * @param {string} userAddress - User address
     * @returns {Promise<number>} - Last operation block
     */
    getLastOperationBlock(userAddress: string): Promise<number>;
}
