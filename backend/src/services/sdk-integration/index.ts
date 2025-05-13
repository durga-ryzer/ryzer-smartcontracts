/**
 * @title SDK Integration Service
 * @description Service for integrating the RyzerWallet SDK with the backend
 */

import { ethers } from 'ethers';
import { RyzerSDK } from 'ryzer-sdk';
import { getDatabase, RyzerWalletDB } from '../../config/database';
import { logger } from '../../utils/logger';
import { SUPPORTED_NETWORKS } from '../../config/networks';
import { smartAccountClients, pimlicoClients, providers, NetworkConfig } from '../relayerService';
import { createAuditLog } from '../../audit';
import { v4 as uuidv4 } from 'uuid';
import CrossChainService from '../crosschain';

// Contract addresses from environment variables or defaults
const FACTORY_ADDRESS = process.env.RYZER_FACTORY_ADDRESS || '0x1234567890123456789012345678901234567890';
const ENTRY_POINT_ADDRESS = process.env.RYZER_ENTRY_POINT_ADDRESS || '0x0000000071727De22E5E9d8BAf0edAc6f37da032';
const PAYMASTER_ADDRESS = process.env.RYZER_PAYMASTER_ADDRESS || '0x1234567890123456789012345678901234567890';

// SDK instances for each network
const sdkInstances: Record<string, RyzerSDK> = {};

/**
 * Initialize SDK instances for all supported networks
 */
export const initializeSDK = async (): Promise<void> => {
  try {
    logger.info('Initializing RyzerWallet SDK for all supported networks');
    
    for (const [chainId, networkConfig] of Object.entries(SUPPORTED_NETWORKS)) {
      const provider = new ethers.providers.JsonRpcProvider(networkConfig.rpcUrl);
      
      // Create SDK instance for this network
      const sdk = new RyzerSDK({
        provider,
        factoryAddress: FACTORY_ADDRESS,
        entryPointAddress: ENTRY_POINT_ADDRESS,
        paymasterAddress: PAYMASTER_ADDRESS
      });
      
      // Store the SDK instance
      sdkInstances[chainId] = sdk;
      logger.info(`SDK initialized for network: ${networkConfig.name} (${chainId})`);
    }
    
    logger.info('SDK initialization completed successfully');
  } catch (error) {
    logger.error('Failed to initialize SDK:', error);
    throw error;
  }
};

/**
 * Get SDK instance for a specific network
 * @param chainId - Chain ID of the network
 * @returns SDK instance for the specified network
 */
export const getSDK = (chainId: string | number): RyzerSDK => {
  const chainIdStr = chainId.toString();
  if (!sdkInstances[chainIdStr]) {
    throw new Error(`SDK not initialized for network with chain ID: ${chainIdStr}`);
  }
  return sdkInstances[chainIdStr];
};

/**
 * Connect SDK to a wallet using private key
 * @param chainId - Chain ID of the network
 * @param privateKey - Private key for signing transactions
 * @returns Connected SDK instance
 */
export const connectSDK = (chainId: string | number, privateKey: string): RyzerSDK => {
  const sdk = getSDK(chainId);
  return sdk.connect(privateKey);
};

/**
 * Create a new wallet using the SDK
 * @param chainId - Chain ID of the network
 * @param userAddress - User's Ethereum address
 * @param userId - User ID
 * @param threshold - Signature threshold
 * @param custodians - List of custodian addresses
 * @param brokers - List of broker addresses
 * @returns New wallet address
 */
export const createWallet = async (
  chainId: string | number,
  userAddress: string,
  userId: number,
  threshold: number = 1,
  custodians: string[] = [],
  brokers: string[] = []
): Promise<string> => {
  try {
    const sdk = getSDK(chainId);
    
    // Create wallet using SDK
    const walletAddress = await sdk.createWallet({
      user: userAddress,
      userId,
      threshold,
      custodians,
      brokers
    });
    
    // Store wallet info in database
    const db = await getDatabase();
    await db.wallets.add({
      address: walletAddress,
      type: 'smart',
      chainId: Number(chainId),
      owner: userAddress,
      custodians,
      brokers,
      threshold,
      createdAt: Date.now()
    });
    
    logger.info(`Created new wallet ${walletAddress} for user ${userAddress} on chain ${chainId}`);
    return walletAddress;
  } catch (error) {
    logger.error(`Failed to create wallet for user ${userAddress} on chain ${chainId}:`, error);
    throw error;
  }
};

/**
 * Add a guardian to a wallet using the SDK
 * @param chainId - Chain ID of the network
 * @param walletAddress - Address of the wallet
 * @param guardianAddress - Address of the guardian
 * @param weight - Guardian weight
 * @returns Transaction hash
 */
export const addGuardian = async (
  chainId: string | number,
  walletAddress: string,
  guardianAddress: string,
  weight: number = 1
): Promise<string> => {
  try {
    const sdk = getSDK(chainId);
    
    // Add guardian using SDK
    const tx = await sdk.recovery.addGuardian(walletAddress, guardianAddress, weight);
    const receipt = await tx.wait();
    
    // Update recovery config in database
    const db = await getDatabase();
    const recoveryConfig = await db.recoveryConfigs.get({ walletAddress });
    
    if (recoveryConfig) {
      const guardians = [...(recoveryConfig.guardians || [])];
      guardians.push({ address: guardianAddress, weight });
      
      await db.recoveryConfigs.update(recoveryConfig.id, { guardians });
    } else {
      await db.recoveryConfigs.add({
        walletAddress,
        guardians: [{ address: guardianAddress, weight }],
        threshold: weight,
        createdAt: Date.now()
      });
    }
    
    logger.info(`Added guardian ${guardianAddress} to wallet ${walletAddress} on chain ${chainId}`);
    return receipt.transactionHash;
  } catch (error) {
    logger.error(`Failed to add guardian to wallet ${walletAddress} on chain ${chainId}:`, error);
    throw error;
  }
};

/**
 * Initiate recovery process for a wallet using the SDK
 * @param chainId - Chain ID of the network
 * @param walletAddress - Address of the wallet
 * @param newOwner - Address of the new owner
 * @returns Recovery request ID
 */
export const initiateRecovery = async (
  chainId: string | number,
  walletAddress: string,
  newOwner: string
): Promise<string> => {
  try {
    const sdk = getSDK(chainId);
    
    // Create recovery request using SDK
    const tx = await sdk.recovery.initiateRecovery(walletAddress, newOwner);
    const receipt = await tx.wait();
    
    // Extract recovery request ID from events
    const recoveryRequestId = receipt.logs[0].topics[1]; // Assuming the first event is RecoveryInitiated
    
    // Store recovery request in database
    const db = await getDatabase();
    await db.recoveryRequests.add({
      id: recoveryRequestId,
      walletAddress,
      newOwner,
      status: 'pending',
      signatures: [],
      createdAt: Date.now()
    });
    
    logger.info(`Initiated recovery for wallet ${walletAddress} with new owner ${newOwner} on chain ${chainId}`);
    return recoveryRequestId;
  } catch (error) {
    logger.error(`Failed to initiate recovery for wallet ${walletAddress} on chain ${chainId}:`, error);
    throw error;
  }
};

/**
 * Execute cross-chain transaction using the SDK
 * @param sourceChainId - Source chain ID
 * @param destinationChainId - Destination chain ID
 * @param walletAddress - Address of the wallet
 * @param token - Token address
 * @param amount - Amount to transfer
 * @param recipient - Recipient address
 * @param bridgeProvider - Bridge provider
 * @returns Transaction hash
 */
export const executeCrossChainTransfer = async (
  sourceChainId: string | number,
  destinationChainId: string | number,
  walletAddress: string,
  token: string,
  amount: string,
  recipient: string,
  bridgeProvider: string = 'default'
): Promise<string> => {
  try {
    logger.info(`Executing cross-chain transfer from ${walletAddress} on chain ${sourceChainId} to ${recipient} on chain ${destinationChainId}`);
    
    // Convert chain IDs to numbers
    const sourceChainIdNum = typeof sourceChainId === 'string' ? parseInt(sourceChainId) : sourceChainId;
    const destinationChainIdNum = typeof destinationChainId === 'string' ? parseInt(destinationChainId) : destinationChainId;
    
    // Use the CrossChainService directly instead of the SDK
    const transactionId = await CrossChainService.executeCrossChainTransaction(
      sourceChainIdNum,
      destinationChainIdNum,
      walletAddress,
      recipient,
      token,
      amount,
      bridgeProvider as any, // Cast to BridgeProvider enum
      walletAddress // Using wallet address as HSM key ID for simplicity
    );
    
    // Create audit log for the cross-chain transfer
    await createAuditLog({
      action: 'cross_chain_transfer_initiated',
      performedBy: walletAddress,
      targetId: transactionId,
      targetType: 'cross_chain_transaction',
      walletAddress,
      metadata: {
        sourceChainId: sourceChainIdNum,
        destinationChainId: destinationChainIdNum,
        token,
        amount,
        recipient,
        bridgeProvider
      }
    });
    
    logger.info(`Executed cross-chain transfer with ID ${transactionId} from ${walletAddress} on chain ${sourceChainId} to ${recipient} on chain ${destinationChainId}`);
    return transactionId;
  } catch (error) {
    logger.error(`Failed to execute cross-chain transfer from chain ${sourceChainId} to ${destinationChainId}:`, error);
    throw error;
  }
};

/**
 * Batch transactions using the SDK
 * @param chainId - Chain ID of the network
 * @param walletAddress - Address of the wallet
 * @param transactions - Array of transactions to batch
 * @returns Transaction hash
 */
export const batchTransactions = async (
  chainId: string | number,
  walletAddress: string,
  transactions: Array<{
    to: string;
    value: string;
    data: string;
  }>
): Promise<string> => {
  try {
    const sdk = getSDK(chainId);
    
    // Batch transactions using SDK
    const tx = await sdk.core.batchTransactions(walletAddress, transactions);
    const receipt = await tx.wait();
    
    // Store batch in database
    const db = await getDatabase();
    const batchId = `batch-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    await db.batches.add({
      id: batchId,
      walletAddress,
      chainId: Number(chainId),
      transactionHash: receipt.transactionHash,
      transactions: transactions.map((t, index) => ({
        id: `${batchId}-tx-${index}`,
        to: t.to,
        value: t.value,
        data: t.data
      })),
      status: 'completed',
      createdAt: Date.now(),
      executedAt: Date.now()
    });
    
    logger.info(`Executed batch transaction for wallet ${walletAddress} on chain ${chainId}`);
    return receipt.transactionHash;
  } catch (error) {
    logger.error(`Failed to batch transactions for wallet ${walletAddress} on chain ${chainId}:`, error);
    throw error;
  }
};

/**
 * Simulate transaction using the SDK
 * @param chainId - Chain ID of the network
 * @param from - Sender address
 * @param to - Recipient address
 * @param data - Transaction data
 * @param value - Transaction value
 * @returns Simulation result
 */
export const simulateTransaction = async (
  chainId: string | number,
  from: string,
  to: string,
  data: string,
  value: string = '0'
): Promise<any> => {
  try {
    const sdk = getSDK(chainId);
    
    // Simulate transaction using SDK
    const simulationResult = await sdk.core.simulateTransaction(from, to, data, value);
    
    // Store cross-chain transaction in database
    const db = await getDatabase();
    const simulationId = `sim-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // @ts-ignore - Ignoring TypeScript error for now, will be fixed when database schema is updated
    await db.crossChainTransactions.add({
      id: simulationId,
      from,
      to,
      data,
      value,
      chainId: Number(chainId),
      result: simulationResult,
      timestamp: Date.now()
    });
    
    logger.info(`Simulated transaction from ${from} to ${to} on chain ${chainId}`);
    return simulationResult;
  } catch (error) {
    logger.error(`Failed to simulate transaction on chain ${chainId}:`, error);
    throw error;
  }
};

/**
 * Get cross-chain transfer fee
 * @param sourceChainId - Source chain ID
 * @param destinationChainId - Destination chain ID
 * @param token - Token address
 * @param amount - Amount to transfer
 * @param bridgeProvider - Bridge provider
 * @returns Fee information
 */
export const getCrossChainTransferFee = async (
  sourceChainId: string | number,
  destinationChainId: string | number,
  token: string,
  amount: string,
  bridgeProvider: string = 'default'
): Promise<{
  fee: string;
  estimatedTime: number;
  bridgeProvider: string;
}> => {
  try {
    // Convert chain IDs to numbers
    const sourceChainIdNum = typeof sourceChainId === 'string' ? parseInt(sourceChainId) : sourceChainId;
    const destinationChainIdNum = typeof destinationChainId === 'string' ? parseInt(destinationChainId) : destinationChainId;
    
    // Use the CrossChainService directly to get fee information
    const bridgeFee = await CrossChainService.getBridgeFee(
      bridgeProvider as any, // Cast to BridgeProvider enum
      sourceChainIdNum,
      destinationChainIdNum,
      token,
      amount
    );
    
    if (!bridgeFee) {
      throw new Error(`No fee information available for bridge provider ${bridgeProvider}`);
    }
    
    return {
      fee: bridgeFee.amount,
      estimatedTime: bridgeFee.estimatedTime,
      bridgeProvider
    };
  } catch (error) {
    logger.error(`Failed to get cross-chain transfer fee:`, error);
    throw error;
  }
};

/**
 * Monitor cross-chain transfer status
 * @param txHash - Transaction hash
 * @param sourceChainId - Source chain ID
 * @param destinationChainId - Destination chain ID
 * @param bridgeProvider - Bridge provider
 * @returns Current status
 */
export const monitorCrossChainTransfer = async (
  txHash: string,
  sourceChainId: string | number,
  destinationChainId: string | number,
  bridgeProvider: string = 'default'
): Promise<'pending' | 'bridging' | 'completed' | 'failed'> => {
  try {
    // Convert chain IDs to numbers
    const sourceChainIdNum = typeof sourceChainId === 'string' ? parseInt(sourceChainId) : sourceChainId;
    const destinationChainIdNum = typeof destinationChainId === 'string' ? parseInt(destinationChainId) : destinationChainId;
    
    // Use the CrossChainService to get the transaction status
    return await CrossChainService.getCrossChainTransactionStatus(
      txHash,
      sourceChainIdNum,
      destinationChainIdNum
    );
  } catch (error) {
    logger.error(`Failed to monitor cross-chain transfer:`, error);
    return 'pending';
  }
};

/**
 * Get cross-chain service status
 * @returns Service status information
 */
export const getCrossChainServiceStatus = async (): Promise<{ active: boolean; pendingTransactions: number }> => {
  try {
    return await CrossChainService.getCrossChainServiceStatus();
  } catch (error) {
    logger.error('Failed to get cross-chain service status:', error);
    return { active: false, pendingTransactions: 0 };
  }
};

/**
 * Get supported bridge routes
 * @returns List of supported bridge routes
 */
export const getSupportedBridgeRoutes = (): { sourceChainId: number; destinationChainId: number; provider: string }[] => {
  try {
    const routes = CrossChainService.getSupportedBridgeRoutes();
    return routes.map(route => ({
      sourceChainId: route.sourceChainId,
      destinationChainId: route.destinationChainId,
      provider: route.provider
    }));
  } catch (error) {
    logger.error('Failed to get supported bridge routes:', error);
    return [];
  }
};

export default {
  initializeSDK,
  getSDK,
  connectSDK,
  createWallet,
  addGuardian,
  initiateRecovery,
  executeCrossChainTransfer,
  batchTransactions,
  simulateTransaction,
  getCrossChainTransferFee,
  monitorCrossChainTransfer,
  getCrossChainServiceStatus,
  getSupportedBridgeRoutes
};
