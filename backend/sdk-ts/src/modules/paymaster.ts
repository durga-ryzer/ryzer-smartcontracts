/**
 * @title RyzerPaymaster Module
 * @description TypeScript module for interacting with the RyzerPaymaster contract
 */

import { ethers } from 'ethers';
import { RyzerSDK } from '../index';
import { UserOperation, OffPeakDiscount, VolumeDiscount, LowBalanceThresholds } from '../types';
import { ExtendedContract } from '../types/contract';

// Import ABI
import RyzerPaymasterABI from '../abis/RyzerPaymaster.json';

export class RyzerPaymaster {
  private readonly sdk: RyzerSDK;
  private readonly provider: ethers.providers.Provider;
  private readonly contract: ExtendedContract;

  /**
   * Initialize the RyzerPaymaster module
   * @param {RyzerSDK} sdk - The main RyzerSDK instance
   */
  constructor(sdk: RyzerSDK) {
    this.sdk = sdk;
    this.provider = sdk.provider;
    this.contract = new ethers.Contract(
      sdk.paymasterAddress,
      RyzerPaymasterABI,
      this.provider
    ) as ExtendedContract;
  }

  /**
   * Get a signer for transactions
   * @returns {ethers.Wallet} - Wallet instance with signer
   */
  public getSigner(): ethers.Wallet {
    return new ethers.Wallet(this.sdk.privateKey, this.provider);
  }

  /**
   * Deposit ETH to cover gas costs for a user
   * @param {string} userAddress - User address
   * @param {ethers.BigNumberish} amount - Amount of ETH to deposit (in wei)
   * @returns {Promise<ethers.ContractTransaction>} - Transaction response
   */
  public async depositEth(
    userAddress: string, 
    amount: ethers.BigNumberish
  ): Promise<ethers.ContractTransaction> {
    const contract = this.contract.connect(this.getSigner()) as ExtendedContract;
    return contract.depositEth(userAddress, { value: amount });
  }

  /**
   * Deposit tokens to cover gas costs for a user
   * @param {string} userAddress - User address
   * @param {ethers.BigNumberish} amount - Amount of tokens to deposit
   * @returns {Promise<ethers.ContractTransaction>} - Transaction response
   */
  public async depositToken(
    userAddress: string, 
    amount: ethers.BigNumberish
  ): Promise<ethers.ContractTransaction> {
    const contract = this.contract.connect(this.getSigner()) as ExtendedContract;
    return contract.depositToken(userAddress, amount);
  }

  /**
   * Set the fee tier for a user (admin only)
   * @param {string} userAddress - User address
   * @param {number} tier - Fee tier (in basis points)
   * @returns {Promise<ethers.ContractTransaction>} - Transaction response
   */
  public async setFeeTier(
    userAddress: string, 
    tier: number
  ): Promise<ethers.ContractTransaction> {
    const contract = this.contract.connect(this.getSigner()) as ExtendedContract;
    return contract.setFeeTier(userAddress, tier);
  }

  /**
   * Set the gas token (admin only)
   * @param {string} tokenAddress - Gas token address
   * @returns {Promise<ethers.ContractTransaction>} - Transaction response
   */
  public async setGasToken(
    tokenAddress: string
  ): Promise<ethers.ContractTransaction> {
    const contract = this.contract.connect(this.getSigner()) as ExtendedContract;
    return contract.setGasToken(tokenAddress);
  }

  /**
   * Set off-peak discount parameters (admin only)
   * @param {number} startHour - Start hour (0-23)
   * @param {number} endHour - End hour (0-23)
   * @param {number} discount - Discount percentage (in basis points)
   * @returns {Promise<ethers.ContractTransaction>} - Transaction response
   */
  public async setOffPeakDiscount(
    startHour: number, 
    endHour: number, 
    discount: number
  ): Promise<ethers.ContractTransaction> {
    const contract = this.contract.connect(this.getSigner()) as ExtendedContract;
    return contract.setOffPeakDiscount(startHour, endHour, discount);
  }

  /**
   * Set volume discount parameters (admin only)
   * @param {number} threshold - Volume threshold
   * @param {number} discount - Discount percentage (in basis points)
   * @returns {Promise<ethers.ContractTransaction>} - Transaction response
   */
  public async setVolumeDiscount(
    threshold: number, 
    discount: number
  ): Promise<ethers.ContractTransaction> {
    const contract = this.contract.connect(this.getSigner()) as ExtendedContract;
    return contract.setVolumeDiscount(threshold, discount);
  }

  /**
   * Set low balance thresholds (admin only)
   * @param {ethers.BigNumberish} ethThreshold - ETH threshold (in wei)
   * @param {ethers.BigNumberish} tokenThreshold - Token threshold
   * @returns {Promise<ethers.ContractTransaction>} - Transaction response
   */
  public async setLowBalanceThresholds(
    ethThreshold: ethers.BigNumberish, 
    tokenThreshold: ethers.BigNumberish
  ): Promise<ethers.ContractTransaction> {
    const contract = this.contract.connect(this.getSigner()) as ExtendedContract;
    return contract.setLowBalanceThresholds(ethThreshold, tokenThreshold);
  }

  /**
   * Set the emergency stop status (admin only)
   * @param {boolean} stopped - Emergency stop status
   * @returns {Promise<ethers.ContractTransaction>} - Transaction response
   */
  public async setEmergencyStop(
    stopped: boolean
  ): Promise<ethers.ContractTransaction> {
    const contract = this.contract.connect(this.getSigner()) as ExtendedContract;
    return contract.setEmergencyStop(stopped);
  }

  /**
   * Set the entry point (admin only)
   * @param {string} entryPointAddress - Entry point address
   * @returns {Promise<ethers.ContractTransaction>} - Transaction response
   */
  public async setEntryPoint(
    entryPointAddress: string
  ): Promise<ethers.ContractTransaction> {
    const contract = this.contract.connect(this.getSigner()) as ExtendedContract;
    return contract.setEntryPoint(entryPointAddress);
  }

  /**
   * Set the factory (admin only)
   * @param {string} factoryAddress - Factory address
   * @returns {Promise<ethers.ContractTransaction>} - Transaction response
   */
  public async setFactory(
    factoryAddress: string
  ): Promise<ethers.ContractTransaction> {
    const contract = this.contract.connect(this.getSigner()) as ExtendedContract;
    return contract.setFactory(factoryAddress);
  }

  /**
   * Withdraw funds (admin only)
   * @param {string} recipient - Recipient address
   * @param {ethers.BigNumberish} amount - Amount to withdraw
   * @param {string} token - Token address (use address(0) for ETH)
   * @returns {Promise<ethers.ContractTransaction>} - Transaction response
   */
  public async withdrawFunds(
    recipient: string, 
    amount: ethers.BigNumberish, 
    token: string
  ): Promise<ethers.ContractTransaction> {
    const contract = this.contract.connect(this.getSigner()) as ExtendedContract;
    return contract.withdrawFunds(recipient, amount, token);
  }

  /**
   * Get a user's ETH balance
   * @param {string} userAddress - User address
   * @returns {Promise<ethers.BigNumber>} - ETH balance
   */
  public async getEthBalance(userAddress: string): Promise<ethers.BigNumber> {
    return this.contract.ethBalances(userAddress);
  }

  /**
   * Get a user's token balance
   * @param {string} userAddress - User address
   * @returns {Promise<ethers.BigNumber>} - Token balance
   */
  public async getTokenBalance(userAddress: string): Promise<ethers.BigNumber> {
    return this.contract.tokenBalances(userAddress);
  }

  /**
   * Get a user's fee tier
   * @param {string} userAddress - User address
   * @returns {Promise<number>} - Fee tier (in basis points)
   */
  public async getFeeTier(userAddress: string): Promise<number> {
    return (await this.contract.userFeeTiers(userAddress)).toNumber();
  }

  /**
   * Get the gas token address
   * @returns {Promise<string>} - Gas token address
   */
  public async getGasToken(): Promise<string> {
    return this.contract.gasToken();
  }

  /**
   * Get off-peak discount parameters
   * @returns {Promise<OffPeakDiscount>} - Off-peak discount parameters
   */
  public async getOffPeakDiscount(): Promise<OffPeakDiscount> {
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
  public async getVolumeDiscount(): Promise<VolumeDiscount> {
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
  public async getLowBalanceThresholds(): Promise<LowBalanceThresholds> {
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
  public async getEmergencyStopped(): Promise<boolean> {
    return this.contract.emergencyStopped();
  }

  /**
   * Get the entry point address
   * @returns {Promise<string>} - Entry point address
   */
  public async getEntryPoint(): Promise<string> {
    return this.contract.entryPoint();
  }

  /**
   * Get the factory address
   * @returns {Promise<string>} - Factory address
   */
  public async getFactory(): Promise<string> {
    return this.contract.factory();
  }

  /**
   * Validate a paymaster user operation
   * @param {UserOperation} userOp - User operation object
   * @param {string} userOpHash - Hash of the user operation
   * @param {ethers.BigNumberish} maxCost - Maximum cost
   * @returns {Promise<{context: string, validationData: ethers.BigNumber}>} - Validation result
   */
  public async validatePaymasterUserOp(
    userOp: UserOperation, 
    userOpHash: string, 
    maxCost: ethers.BigNumberish
  ): Promise<{context: string, validationData: ethers.BigNumber}> {
    const [context, validationData] = await this.contract.validatePaymasterUserOp(
      userOp,
      userOpHash,
      maxCost
    );
    return { context, validationData };
  }
}
