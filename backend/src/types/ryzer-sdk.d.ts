/**
 * Type declarations for ryzer-sdk
 */

declare module 'ryzer-sdk' {
  import { ethers } from 'ethers';

  export interface RyzerSDKConfig {
    provider: ethers.providers.Provider;
    factoryAddress: string;
    entryPointAddress: string;
    paymasterAddress: string;
    privateKey?: string;
  }

  export interface CreateWalletParams {
    user: string;
    userId: number;
    threshold: number;
    custodians: string[];
    brokers: string[];
  }

  export interface UserOperation {
    sender: string;
    nonce: ethers.BigNumberish;
    initCode: string;
    callData: string;
    callGasLimit: ethers.BigNumberish;
    verificationGasLimit: ethers.BigNumberish;
    preVerificationGas: ethers.BigNumberish;
    maxFeePerGas: ethers.BigNumberish;
    maxPriorityFeePerGas: ethers.BigNumberish;
    paymasterAndData: string;
    signature: string;
  }

  export interface TransferERC20Params {
    token: string;
    amount: ethers.BigNumberish;
    recipient: string;
    targetChainId: ethers.BigNumberish;
    adapterParams: string;
  }

  export interface SimulationResult {
    id: string;
    success: boolean;
    gasUsed?: string;
    gasLimit?: string;
    error?: string;
    stateChanges?: Array<{
      contract: string;
      variable: string;
      oldValue: string;
      newValue: string;
    }>;
    logs?: Array<{
      address: string;
      topics: string[];
      data: string;
      decodedEvent?: {
        name: string;
        params: Record<string, any>;
      };
    }>;
    balanceChanges?: Array<{
      address: string;
      token: string;
      oldBalance: string;
      newBalance: string;
      change: string;
    }>;
    riskAssessment?: {
      riskLevel: 'low' | 'medium' | 'high';
      warnings: string[];
      recommendations: string[];
    };
    timestamp: number;
  }

  export class RyzerCore {
    constructor(sdk: RyzerSDK);
    getContract(walletAddress: string): any;
    getSigner(): ethers.Wallet;
    setDelegatedSigner(walletAddress: string, signer: string, expiry: number): Promise<ethers.ContractTransaction>;
    removeDelegatedSigner(walletAddress: string, signer: string): Promise<ethers.ContractTransaction>;
    sendUserOperation(userOp: UserOperation): Promise<string>;
    batchTransactions(walletAddress: string, transactions: Array<{
      to: string;
      value: string;
      data: string;
    }>): Promise<ethers.ContractTransaction>;
    simulateTransaction(from: string, to: string, data: string, value: string): Promise<SimulationResult>;
  }

  export class RyzerFactory {
    constructor(sdk: RyzerSDK);
    getContract(): any;
    getSigner(): ethers.Wallet;
    getWallet(userAddress: string): Promise<string>;
    createWallet(params: CreateWalletParams): Promise<string>;
    isWalletDeployed(walletAddress: string): Promise<boolean>;
  }

  export class RyzerCrosschain {
    constructor(sdk: RyzerSDK);
    getContract(walletAddress: string): any;
    getSigner(): ethers.Wallet;
    transferERC20(params: TransferERC20Params, walletAddress: string): Promise<ethers.ContractTransaction>;
    estimateFee(sourceChainId: number, destinationChainId: number, token: string): Promise<string>;
    getSupportedBridges(): Promise<string[]>;
    getTransactionStatus(txHash: string, sourceChainId: number, destinationChainId: number): Promise<string>;
  }

  export class RyzerPaymaster {
    constructor(sdk: RyzerSDK);
    getContract(): any;
    getSigner(): ethers.Wallet;
    getPaymasterData(userOp: UserOperation): Promise<string>;
    depositFor(walletAddress: string, amount: string): Promise<ethers.ContractTransaction>;
    getBalance(walletAddress: string): Promise<string>;
  }

  export class RyzerRecovery {
    constructor(sdk: RyzerSDK);
    getContract(walletAddress: string): any;
    getSigner(): ethers.Wallet;
    addGuardian(walletAddress: string, guardianAddress: string, weight: number): Promise<ethers.ContractTransaction>;
    removeGuardian(walletAddress: string, guardianAddress: string): Promise<ethers.ContractTransaction>;
    updateGuardianWeight(walletAddress: string, guardianAddress: string, weight: number): Promise<ethers.ContractTransaction>;
    setRecoveryThreshold(walletAddress: string, threshold: number): Promise<ethers.ContractTransaction>;
    getGuardians(walletAddress: string): Promise<Array<{ address: string; weight: number }>>;
    initiateRecovery(walletAddress: string, newOwner: string): Promise<ethers.ContractTransaction>;
    approveRecovery(walletAddress: string, recoveryId: string): Promise<ethers.ContractTransaction>;
    executeRecovery(walletAddress: string, recoveryId: string): Promise<ethers.ContractTransaction>;
    cancelRecovery(walletAddress: string, recoveryId: string): Promise<ethers.ContractTransaction>;
  }

  export class RyzerTokenManagement {
    constructor(sdk: RyzerSDK);
    getContract(walletAddress: string): any;
    getSigner(): ethers.Wallet;
    getTokenBalance(walletAddress: string, tokenAddress: string): Promise<string>;
    transferToken(walletAddress: string, tokenAddress: string, recipient: string, amount: string): Promise<ethers.ContractTransaction>;
    approveToken(walletAddress: string, tokenAddress: string, spender: string, amount: string): Promise<ethers.ContractTransaction>;
    batchTransferTokens(walletAddress: string, transfers: Array<{
      token: string;
      recipient: string;
      amount: string;
    }>): Promise<ethers.ContractTransaction>;
  }

  export class RyzerSDK {
    readonly provider: ethers.providers.Provider;
    readonly factoryAddress: string;
    readonly entryPointAddress: string;
    readonly paymasterAddress: string;
    readonly core: RyzerCore;
    readonly factory: RyzerFactory;
    readonly crosschain: RyzerCrosschain;
    readonly paymaster: RyzerPaymaster;
    readonly recovery: RyzerRecovery;
    readonly tokenManagement: RyzerTokenManagement;
    readonly utils: any;

    constructor(config: RyzerSDKConfig);
    get privateKey(): string;
    connect(privateKey: string): RyzerSDK;
    getWalletAddress(userAddress: string): Promise<string>;
    createWallet(params: CreateWalletParams): Promise<string>;
    signUserOp(userOp: UserOperation): Promise<string>;
    sendUserOperation(userOp: UserOperation): Promise<string>;
  }
}
