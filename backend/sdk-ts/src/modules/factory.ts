/**
 * @title RyzerFactory Module
 * @description TypeScript module for interacting with the RyzerWalletFactory contract
 */

import { ethers } from 'ethers';
import { RyzerSDK } from '../index';
import { CreateWalletParams } from '../types';
import { ExtendedContract } from '../types/contract';

// Import ABI
import RyzerWalletFactoryABI from '../abis/RyzerWalletFactory.json';

export class RyzerFactory {
  private readonly sdk: RyzerSDK;
  private readonly provider: ethers.providers.Provider;
  private readonly contract: ExtendedContract;

  /**
   * Initialize the RyzerFactory module
   * @param {RyzerSDK} sdk - The main RyzerSDK instance
   */
  constructor(sdk: RyzerSDK) {
    this.sdk = sdk;
    this.provider = sdk.provider;
    this.contract = new ethers.Contract(
      sdk.factoryAddress,
      RyzerWalletFactoryABI,
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
   * Create a new wallet for a user
   * @param {CreateWalletParams} params - Wallet creation parameters
   * @returns {Promise<string>} - New wallet address
   */
  public async createWallet(params: CreateWalletParams): Promise<string> {
    const contract = this.contract.connect(this.getSigner()) as ExtendedContract;
    
    // Cast contract.createWallet to any to bypass TypeScript's type checking
    // This is necessary because the contract expects a string but our params use number
    const createWalletFn = contract.createWallet as any;
    
    const tx = await createWalletFn(
      params.user,
      params.userId.toString(),
      params.threshold.toString(),
      params.brokers,
      '0x' // Optional data parameter
    );
    const receipt = await tx.wait();
    const event = receipt.events.find((e: any) => e.event === 'WalletDeployed');
    return event.args.wallet;
  }

  /**
   * Get a user's wallet address
   * @param {string} userAddress - User's Ethereum address
   * @returns {Promise<string>} - Wallet address
   */
  public async getWallet(userAddress: string): Promise<string> {
    return this.contract.getWallet(userAddress);
  }

  /**
   * Predict a wallet address before creation
   * @param {string} userAddress - User's Ethereum address
   * @returns {Promise<string>} - Predicted wallet address
   */
  public async predictWalletAddress(userAddress: string): Promise<string> {
    return this.contract.predictWalletAddress(userAddress);
  }

  /**
   * Check if an address is a wallet
   * @param {string} address - Address to check
   * @returns {Promise<boolean>} - Whether the address is a wallet
   */
  public async isWallet(address: string): Promise<boolean> {
    return this.contract.isWallet(address);
  }

  /**
   * Get the entry point address
   * @returns {Promise<string>} - Entry point address
   */
  public async getEntryPoint(): Promise<string> {
    return this.contract.entryPoint();
  }

  /**
   * Get the paymaster address
   * @returns {Promise<string>} - Paymaster address
   */
  public async getPaymaster(): Promise<string> {
    return this.contract.paymaster();
  }

  /**
   * Get the timelock address
   * @returns {Promise<string>} - Timelock address
   */
  public async getTimelock(): Promise<string> {
    return this.contract.timelock();
  }

  /**
   * Get the wallet implementation address
   * @returns {Promise<string>} - Wallet implementation address
   */
  public async getWalletImplementation(): Promise<string> {
    return this.contract.walletImplementation();
  }

  /**
   * Get the emergency stopped status
   * @returns {Promise<boolean>} - Emergency stopped status
   */
  public async getEmergencyStopped(): Promise<boolean> {
    return this.contract.emergencyStopped();
  }

  /**
   * Set the emergency stop status (admin only)
   * @param {boolean} stopped - Emergency stop status
   * @returns {Promise<ethers.ContractTransaction>} - Transaction response
   */
  public async setEmergencyStop(stopped: boolean): Promise<ethers.ContractTransaction> {
    const contract = this.contract.connect(this.getSigner()) as ExtendedContract;
    return contract.setEmergencyStop(stopped);
  }

  /**
   * Upgrade the implementation (admin only)
   * @param {string} newImplementation - New implementation address
   * @returns {Promise<ethers.ContractTransaction>} - Transaction response
   */
  public async upgradeImplementation(newImplementation: string): Promise<ethers.ContractTransaction> {
    const contract = this.contract.connect(this.getSigner()) as ExtendedContract;
    return contract.upgradeImplementation(newImplementation);
  }

  /**
   * Set the entry point (admin only)
   * @param {string} newEntryPoint - New entry point address
   * @returns {Promise<ethers.ContractTransaction>} - Transaction response
   */
  public async setEntryPoint(newEntryPoint: string): Promise<ethers.ContractTransaction> {
    const contract = this.contract.connect(this.getSigner()) as ExtendedContract;
    return contract.setEntryPoint(newEntryPoint);
  }

  /**
   * Set the paymaster (admin only)
   * @param {string} newPaymaster - New paymaster address
   * @returns {Promise<ethers.ContractTransaction>} - Transaction response
   */
  public async setPaymaster(newPaymaster: string): Promise<ethers.ContractTransaction> {
    const contract = this.contract.connect(this.getSigner()) as ExtendedContract;
    return contract.setPaymaster(newPaymaster);
  }

  /**
   * Set the timelock (admin only)
   * @param {string} newTimelock - New timelock address
   * @returns {Promise<ethers.ContractTransaction>} - Transaction response
   */
  public async setTimelock(newTimelock: string): Promise<ethers.ContractTransaction> {
    const contract = this.contract.connect(this.getSigner()) as ExtendedContract;
    return contract.setTimelock(newTimelock);
  }

  /**
   * Get the last operation block for a user
   * @param {string} userAddress - User address
   * @returns {Promise<number>} - Last operation block
   */
  public async getLastOperationBlock(userAddress: string): Promise<number> {
    return (await this.contract.lastOperationBlock(userAddress)).toNumber();
  }
}
