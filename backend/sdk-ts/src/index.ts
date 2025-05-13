/**
 * @title Ryzer SDK
 * @description A comprehensive TypeScript SDK for interacting with the Ryzer Wallet ecosystem
 * @version 1.0.0
 */

import { ethers } from 'ethers';
import { 
  RyzerCore,
  RyzerFactory,
  RyzerCrosschain,
  RyzerPaymaster,
  RyzerRecovery,
  RyzerTokenManagement
} from './modules/index';
import * as RyzerUtils from './utils';
import { 
  RyzerSDKConfig, 
  CreateWalletParams, 
  UserOperation 
} from './types';

/**
 * Main Ryzer SDK class that integrates all modules
 */
export class RyzerSDK {
  /** Web3 provider */
  public readonly provider: ethers.providers.Provider;
  /** Address of the RyzerWalletFactory contract */
  public readonly factoryAddress: string;
  /** Address of the EntryPoint contract */
  public readonly entryPointAddress: string;
  /** Address of the RyzerPaymaster contract */
  public readonly paymasterAddress: string;
  /** Private key for signing transactions */
  private _privateKey?: string;

  /** Core module for interacting with RyzerWalletCore */
  public readonly core: RyzerCore;
  /** Factory module for interacting with RyzerWalletFactory */
  public readonly factory: RyzerFactory;
  /** Crosschain module for interacting with RyzerCrosschain */
  public readonly crosschain: RyzerCrosschain;
  /** Paymaster module for interacting with RyzerPaymaster */
  public readonly paymaster: RyzerPaymaster;
  /** Recovery module for interacting with RyzerWalletRecovery */
  public readonly recovery: RyzerRecovery;
  /** TokenManagement module for interacting with RyzerTokenManagement */
  public readonly tokenManagement: RyzerTokenManagement;
  /** Utility functions */
  public readonly utils: typeof RyzerUtils;

  /**
   * Initialize the Ryzer SDK
   * @param {RyzerSDKConfig} config - Configuration object
   */
  constructor(config: RyzerSDKConfig) {
    if (!config.provider) {
      throw new Error('Provider is required');
    }
    
    this.provider = config.provider;
    this.factoryAddress = config.factoryAddress;
    this.entryPointAddress = config.entryPointAddress;
    this.paymasterAddress = config.paymasterAddress;
    this._privateKey = config.privateKey;
    
    // Initialize modules
    this.core = new RyzerCore(this);
    this.factory = new RyzerFactory(this);
    this.crosschain = new RyzerCrosschain(this);
    this.paymaster = new RyzerPaymaster(this);
    this.recovery = new RyzerRecovery(this);
    this.tokenManagement = new RyzerTokenManagement(this);
    this.utils = RyzerUtils;
  }

  /**
   * Get the private key
   * @returns {string | undefined} - Private key
   * @throws {Error} If private key is not set
   */
  get privateKey(): string {
    if (!this._privateKey) {
      throw new Error('Private key not set. Use sdk.connect() to set a private key.');
    }
    return this._privateKey;
  }

  /**
   * Connect to a wallet using private key
   * @param {string} privateKey - Private key for signing transactions
   * @returns {RyzerSDK} - Returns the SDK instance for chaining
   */
  public connect(privateKey: string): RyzerSDK {
    this._privateKey = privateKey;
    return this;
  }

  /**
   * Get a user's wallet address
   * @param {string} userAddress - User's Ethereum address
   * @returns {Promise<string>} - Wallet address
   */
  public async getWalletAddress(userAddress: string): Promise<string> {
    return this.factory.getWallet(userAddress);
  }

  /**
   * Create a new wallet for a user
   * @param {CreateWalletParams} params - Wallet creation parameters
   * @returns {Promise<string>} - New wallet address
   */
  public async createWallet(params: CreateWalletParams): Promise<string> {
    return this.factory.createWallet(params);
  }

  /**
   * Sign a user operation
   * @param {UserOperation} userOp - User operation object
   * @returns {Promise<string>} - Signature
   */
  public async signUserOp(userOp: UserOperation): Promise<string> {
    return this.utils.signUserOp(userOp, this.privateKey);
  }

  /**
   * Send a user operation through the entry point
   * @param {UserOperation} userOp - User operation object
   * @returns {Promise<string>} - Transaction hash
   */
  public async sendUserOperation(userOp: UserOperation): Promise<string> {
    return this.core.sendUserOperation(userOp);
  }
}

// Export types
export * from './types';

// Export modules
export { RyzerCore } from './modules/core';
export { RyzerFactory } from './modules/factory';
export { RyzerCrosschain } from './modules/crosschain';
export { RyzerPaymaster } from './modules/paymaster';
export { RyzerRecovery } from './modules/recovery';
export { RyzerTokenManagement } from './modules/tokenManagement';
export * as RyzerUtils from './utils';
