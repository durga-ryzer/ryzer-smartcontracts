/**
 * @title RyzerPaymaster Module
 * @description TypeScript module for interacting with the RyzerPaymaster contract
 */
import { ethers } from 'ethers';
import { RyzerSDK } from '../index';
import { UserOperation, OffPeakDiscount, VolumeDiscount, LowBalanceThresholds } from '../types';
export declare class RyzerPaymaster {
    private readonly sdk;
    private readonly provider;
    private readonly contract;
    /**
     * Initialize the RyzerPaymaster module
     * @param {RyzerSDK} sdk - The main RyzerSDK instance
     */
    constructor(sdk: RyzerSDK);
    /**
     * Get a signer for transactions
     * @returns {ethers.Wallet} - Wallet instance with signer
     */
    getSigner(): ethers.Wallet;
    /**
     * Deposit ETH to cover gas costs for a user
     * @param {string} userAddress - User address
     * @param {ethers.BigNumberish} amount - Amount of ETH to deposit (in wei)
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    depositEth(userAddress: string, amount: ethers.BigNumberish): Promise<ethers.ContractTransaction>;
    /**
     * Deposit tokens to cover gas costs for a user
     * @param {string} userAddress - User address
     * @param {ethers.BigNumberish} amount - Amount of tokens to deposit
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    depositToken(userAddress: string, amount: ethers.BigNumberish): Promise<ethers.ContractTransaction>;
    /**
     * Set the fee tier for a user (admin only)
     * @param {string} userAddress - User address
     * @param {number} tier - Fee tier (in basis points)
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    setFeeTier(userAddress: string, tier: number): Promise<ethers.ContractTransaction>;
    /**
     * Set the gas token (admin only)
     * @param {string} tokenAddress - Gas token address
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    setGasToken(tokenAddress: string): Promise<ethers.ContractTransaction>;
    /**
     * Set off-peak discount parameters (admin only)
     * @param {number} startHour - Start hour (0-23)
     * @param {number} endHour - End hour (0-23)
     * @param {number} discount - Discount percentage (in basis points)
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    setOffPeakDiscount(startHour: number, endHour: number, discount: number): Promise<ethers.ContractTransaction>;
    /**
     * Set volume discount parameters (admin only)
     * @param {number} threshold - Volume threshold
     * @param {number} discount - Discount percentage (in basis points)
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    setVolumeDiscount(threshold: number, discount: number): Promise<ethers.ContractTransaction>;
    /**
     * Set low balance thresholds (admin only)
     * @param {ethers.BigNumberish} ethThreshold - ETH threshold (in wei)
     * @param {ethers.BigNumberish} tokenThreshold - Token threshold
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    setLowBalanceThresholds(ethThreshold: ethers.BigNumberish, tokenThreshold: ethers.BigNumberish): Promise<ethers.ContractTransaction>;
    /**
     * Set the emergency stop status (admin only)
     * @param {boolean} stopped - Emergency stop status
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    setEmergencyStop(stopped: boolean): Promise<ethers.ContractTransaction>;
    /**
     * Set the entry point (admin only)
     * @param {string} entryPointAddress - Entry point address
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    setEntryPoint(entryPointAddress: string): Promise<ethers.ContractTransaction>;
    /**
     * Set the factory (admin only)
     * @param {string} factoryAddress - Factory address
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    setFactory(factoryAddress: string): Promise<ethers.ContractTransaction>;
    /**
     * Withdraw funds (admin only)
     * @param {string} recipient - Recipient address
     * @param {ethers.BigNumberish} amount - Amount to withdraw
     * @param {string} token - Token address (use address(0) for ETH)
     * @returns {Promise<ethers.ContractTransaction>} - Transaction response
     */
    withdrawFunds(recipient: string, amount: ethers.BigNumberish, token: string): Promise<ethers.ContractTransaction>;
    /**
     * Get a user's ETH balance
     * @param {string} userAddress - User address
     * @returns {Promise<ethers.BigNumber>} - ETH balance
     */
    getEthBalance(userAddress: string): Promise<ethers.BigNumber>;
    /**
     * Get a user's token balance
     * @param {string} userAddress - User address
     * @returns {Promise<ethers.BigNumber>} - Token balance
     */
    getTokenBalance(userAddress: string): Promise<ethers.BigNumber>;
    /**
     * Get a user's fee tier
     * @param {string} userAddress - User address
     * @returns {Promise<number>} - Fee tier (in basis points)
     */
    getFeeTier(userAddress: string): Promise<number>;
    /**
     * Get the gas token address
     * @returns {Promise<string>} - Gas token address
     */
    getGasToken(): Promise<string>;
    /**
     * Get off-peak discount parameters
     * @returns {Promise<OffPeakDiscount>} - Off-peak discount parameters
     */
    getOffPeakDiscount(): Promise<OffPeakDiscount>;
    /**
     * Get volume discount parameters
     * @returns {Promise<VolumeDiscount>} - Volume discount parameters
     */
    getVolumeDiscount(): Promise<VolumeDiscount>;
    /**
     * Get low balance thresholds
     * @returns {Promise<LowBalanceThresholds>} - Low balance thresholds
     */
    getLowBalanceThresholds(): Promise<LowBalanceThresholds>;
    /**
     * Get the emergency stopped status
     * @returns {Promise<boolean>} - Emergency stopped status
     */
    getEmergencyStopped(): Promise<boolean>;
    /**
     * Get the entry point address
     * @returns {Promise<string>} - Entry point address
     */
    getEntryPoint(): Promise<string>;
    /**
     * Get the factory address
     * @returns {Promise<string>} - Factory address
     */
    getFactory(): Promise<string>;
    /**
     * Validate a paymaster user operation
     * @param {UserOperation} userOp - User operation object
     * @param {string} userOpHash - Hash of the user operation
     * @param {ethers.BigNumberish} maxCost - Maximum cost
     * @returns {Promise<{context: string, validationData: ethers.BigNumber}>} - Validation result
     */
    validatePaymasterUserOp(userOp: UserOperation, userOpHash: string, maxCost: ethers.BigNumberish): Promise<{
        context: string;
        validationData: ethers.BigNumber;
    }>;
}
