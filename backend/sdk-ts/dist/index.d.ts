/**
 * @title Ryzer SDK
 * @description A comprehensive TypeScript SDK for interacting with the Ryzer Wallet ecosystem
 * @version 1.0.0
 */
import { ethers } from 'ethers';
import { RyzerCore, RyzerFactory, RyzerCrosschain, RyzerPaymaster, RyzerRecovery, RyzerTokenManagement } from './modules/index';
import * as RyzerUtils from './utils';
import { RyzerSDKConfig, CreateWalletParams, UserOperation } from './types';
/**
 * Main Ryzer SDK class that integrates all modules
 */
export declare class RyzerSDK {
    /** Web3 provider */
    readonly provider: ethers.providers.Provider;
    /** Address of the RyzerWalletFactory contract */
    readonly factoryAddress: string;
    /** Address of the EntryPoint contract */
    readonly entryPointAddress: string;
    /** Address of the RyzerPaymaster contract */
    readonly paymasterAddress: string;
    /** Private key for signing transactions */
    private _privateKey?;
    /** Core module for interacting with RyzerWalletCore */
    readonly core: RyzerCore;
    /** Factory module for interacting with RyzerWalletFactory */
    readonly factory: RyzerFactory;
    /** Crosschain module for interacting with RyzerCrosschain */
    readonly crosschain: RyzerCrosschain;
    /** Paymaster module for interacting with RyzerPaymaster */
    readonly paymaster: RyzerPaymaster;
    /** Recovery module for interacting with RyzerWalletRecovery */
    readonly recovery: RyzerRecovery;
    /** TokenManagement module for interacting with RyzerTokenManagement */
    readonly tokenManagement: RyzerTokenManagement;
    /** Utility functions */
    readonly utils: typeof RyzerUtils;
    /**
     * Initialize the Ryzer SDK
     * @param {RyzerSDKConfig} config - Configuration object
     */
    constructor(config: RyzerSDKConfig);
    /**
     * Get the private key
     * @returns {string | undefined} - Private key
     * @throws {Error} If private key is not set
     */
    get privateKey(): string;
    /**
     * Connect to a wallet using private key
     * @param {string} privateKey - Private key for signing transactions
     * @returns {RyzerSDK} - Returns the SDK instance for chaining
     */
    connect(privateKey: string): RyzerSDK;
    /**
     * Get a user's wallet address
     * @param {string} userAddress - User's Ethereum address
     * @returns {Promise<string>} - Wallet address
     */
    getWalletAddress(userAddress: string): Promise<string>;
    /**
     * Create a new wallet for a user
     * @param {CreateWalletParams} params - Wallet creation parameters
     * @returns {Promise<string>} - New wallet address
     */
    createWallet(params: CreateWalletParams): Promise<string>;
    /**
     * Sign a user operation
     * @param {UserOperation} userOp - User operation object
     * @returns {Promise<string>} - Signature
     */
    signUserOp(userOp: UserOperation): Promise<string>;
    /**
     * Send a user operation through the entry point
     * @param {UserOperation} userOp - User operation object
     * @returns {Promise<string>} - Transaction hash
     */
    sendUserOperation(userOp: UserOperation): Promise<string>;
}
export * from './types';
export { RyzerCore } from './modules/core';
export { RyzerFactory } from './modules/factory';
export { RyzerCrosschain } from './modules/crosschain';
export { RyzerPaymaster } from './modules/paymaster';
export { RyzerRecovery } from './modules/recovery';
export { RyzerTokenManagement } from './modules/tokenManagement';
export * as RyzerUtils from './utils';
