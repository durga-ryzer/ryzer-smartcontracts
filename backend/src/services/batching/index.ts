import { ethers } from 'ethers';
import { getDatabase } from '../../config/database';
import { logger } from '../../utils/logger';
import { SUPPORTED_NETWORKS } from '../../config/networks';
import sdkService from '../sdk-integration';

// Transaction queue for batching
interface BatchableTransaction {
  id: string;
  chainId: number;
  walletAddress: string;
  to: string;
  data: string;
  value: string;
  priority: 'high' | 'medium' | 'low';
  timestamp: number;
  maxGasPrice?: string;
  deadline?: number;
}

// Batch of transactions
export interface Batch {
  id: string;
  chainId: number;
  walletAddress: string;
  transactions: string[];
  status: 'pending' | 'failed' | 'simulating' | 'executing' | 'completed';
  createdAt: number;
  executedAt?: number;
  error?: string;
  gasUsed?: string;
  txHash?: string;
  totalValue?: string;
  gasPrice?: string;
}

// Batch configuration
interface BatchConfig {
  maxTransactions: number;
  minTransactions: number;
  maxTimeInQueue: number; // milliseconds
  gasThreshold: string; // wei
  priorityBoost: number; // multiplier for high priority transactions
}

// Queue of transactions waiting to be batched
const transactionQueue: Record<number, BatchableTransaction[]> = {};

// Batches being processed
const batches: Record<string, Batch> = {};

// Default batch configuration
const defaultBatchConfig: BatchConfig = {
  maxTransactions: 10,
  minTransactions: 3,
  maxTimeInQueue: 5 * 60 * 1000, // 5 minutes
  gasThreshold: '50000000000', // 50 gwei
  priorityBoost: 1.5,
};

// Batch configurations per chain
const batchConfigs: Record<number, BatchConfig> = {};

/**
 * Initialize the batching service
 */
export const initializeBatchingService = async (): Promise<void> => {
  try {
    logger.info('Initializing transaction batching service...');
    
    // Initialize transaction queues for each supported network
    for (const [chainIdStr, network] of Object.entries(SUPPORTED_NETWORKS)) {
      const chainId = parseInt(chainIdStr);
      transactionQueue[chainId] = [];
      
      // Set default batch config for this chain
      batchConfigs[chainId] = { ...defaultBatchConfig };
      
      // Adjust config based on network characteristics
      if (chainId === 1) { // Ethereum Mainnet
        batchConfigs[chainId].maxTransactions = 5;
        batchConfigs[chainId].gasThreshold = '80000000000'; // 80 gwei
      } else if (chainId === 137) { // Polygon
        batchConfigs[chainId].maxTransactions = 15;
        batchConfigs[chainId].minTransactions = 5;
      }
    }
    
    // Start batch processing loop
    startBatchProcessing();
    
    logger.info('Transaction batching service initialized');
  } catch (error) {
    logger.error('Failed to initialize batching service:', error);
  }
};

/**
 * Start the batch processing loop
 */
const startBatchProcessing = (): void => {
  // Process batches every 30 seconds
  setInterval(processBatches, 30 * 1000);
  logger.info('Batch processing loop started');
};

/**
 * Process batches for all chains
 */
const processBatches = async (): Promise<void> => {
  try {
    // Process each chain's queue
    for (const chainId of Object.keys(transactionQueue).map(Number)) {
      await processChainQueue(chainId);
    }
  } catch (error) {
    logger.error('Error processing batches:', error);
  }
};

/**
 * Process the transaction queue for a specific chain
 * @param chainId Chain ID
 */
const processChainQueue = async (chainId: number): Promise<void> => {
  const queue = transactionQueue[chainId];
  const config = batchConfigs[chainId];
  
  if (!queue || queue.length === 0) {
    return; // No transactions to process
  }
  
  // Check if we have enough transactions to batch
  if (queue.length < config.minTransactions) {
    // Check if oldest transaction has been waiting too long
    const oldestTx = queue[0];
    const waitTime = Date.now() - oldestTx.timestamp;
    
    if (waitTime < config.maxTimeInQueue) {
      return; // Not enough transactions and not waiting too long
    }
  }
  
  // Group transactions by wallet address
  const walletGroups: Record<string, BatchableTransaction[]> = {};
  
  for (const tx of queue) {
    if (!walletGroups[tx.walletAddress]) {
      walletGroups[tx.walletAddress] = [];
    }
    walletGroups[tx.walletAddress].push(tx);
  }
  
  // Process each wallet's transactions
  for (const [walletAddress, txs] of Object.entries(walletGroups)) {
    if (txs.length >= config.minTransactions || 
        (txs.length > 0 && Date.now() - txs[0].timestamp > config.maxTimeInQueue)) {
      // Create a batch for this wallet
      await createAndExecuteBatch(walletAddress, txs, chainId);
    }
  }
};

/**
 * Create and execute a batch of transactions
 * @param walletAddress Wallet address
 * @param transactions Transactions to batch
 * @param chainId Chain ID
 */
const createAndExecuteBatch = async (
  walletAddress: string,
  transactions: BatchableTransaction[],
  chainId: number
): Promise<void> => {
  try {
    // Sort transactions by priority and timestamp
    transactions.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      if (a.priority !== b.priority) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return a.timestamp - b.timestamp;
    });
    
    // Limit batch size
    const config = batchConfigs[chainId];
    const batchTxs = transactions.slice(0, config.maxTransactions);
    
    // Create batch
    const batchId = `batch-${chainId}-${walletAddress}-${Date.now()}`;
    const batch: Batch = {
      id: batchId,
      chainId,
      walletAddress,
      transactions: batchTxs.map(tx => tx.id),
      status: 'pending',
      createdAt: Date.now(),
    };
    
    batches[batchId] = batch;
    
    // Update batch status
    batch.status = 'simulating';
    
    // Simulate batch
    const simulationResult = await simulateBatch(batch, batchTxs);
    
    if (!simulationResult.success) {
      batch.status = 'failed';
      batch.error = simulationResult.error;
      logger.error(`Batch ${batchId} simulation failed:`, simulationResult.error);
      return;
    }
    
    // Update batch status
    batch.status = 'executing';
    
    // Execute batch
    const executionResult = await executeBatch(batch, batchTxs);
    
    if (!executionResult.success) {
      batch.status = 'failed';
      batch.error = executionResult.error;
      logger.error(`Batch ${batchId} execution failed:`, executionResult.error);
      return;
    }
    
    // Update batch status
    batch.status = 'completed';
    batch.executedAt = Date.now();
    batch.txHash = executionResult.txHash;
    batch.gasUsed = executionResult.gasUsed;
    batch.gasPrice = executionResult.gasPrice;
    batch.totalValue = executionResult.totalValue;
    
    // Remove processed transactions from queue
    const txIds = new Set(batchTxs.map(tx => tx.id));
    transactionQueue[chainId] = transactionQueue[chainId].filter(tx => !txIds.has(tx.id));
    
    // Store batch in database
    await addBatchToDatabase(batch);
    
    logger.info(`Batch ${batchId} executed successfully with ${batchTxs.length} transactions`);
  } catch (error) {
    logger.error(`Error creating/executing batch for wallet ${walletAddress} on chain ${chainId}:`, error);
  }
};

/**
 * Simulate a batch of transactions
 * @param batch Batch
 * @param transactions Transactions to simulate
 */
const simulateBatch = async (
  batch: Batch,
  transactions: BatchableTransaction[]
): Promise<{ success: boolean; error?: string; gasEstimate?: string }> => {
  try {
    // This would typically call a simulation service or API
    // For now, we'll just return success
    return { success: true, gasEstimate: '500000' };
  } catch (error) {
    return { success: false, error: String(error) };
  }
};

/**
 * Execute a batch of transactions
 * @param batch Batch
 * @param transactions Transactions to execute
 */
const executeBatch = async (
  batch: Batch,
  transactions: BatchableTransaction[]
): Promise<{ 
  success: boolean; 
  error?: string; 
  txHash?: string;
  gasUsed?: string;
  gasPrice?: string;
  totalValue?: string;
}> => {
  try {
    const { chainId, walletAddress } = batch;
    
    // Calculate total value
    const totalValue = transactions.reduce((sum, tx) => sum + BigInt(tx.value), BigInt(0));
    
    // Format transactions for SDK
    const formattedTransactions = transactions.map(tx => ({
      to: tx.to,
      value: tx.value,
      data: tx.data
    }));
    
    // Use SDK to batch transactions
    const txHash = await sdkService.batchTransactions(
      chainId,
      walletAddress,
      formattedTransactions
    );
    
    // Get transaction receipt from provider
    const provider = new ethers.providers.JsonRpcProvider(SUPPORTED_NETWORKS[chainId.toString()].rpcUrl);
    const receipt = await provider.getTransactionReceipt(txHash);
    
    return {
      success: true,
      txHash,
      gasUsed: receipt ? receipt.gasUsed.toString() : '500000', // Use actual gas used if available
      gasPrice: receipt ? receipt.effectiveGasPrice.toString() : '20000000000', // Use actual gas price if available
      totalValue: totalValue.toString(),
    };
  } catch (error) {
    logger.error(`Batch execution failed:`, error);
    return { success: false, error: String(error) };
  }
}

/**
 * Queue a transaction for batching
 * @param transaction Transaction to queue
 * @returns Transaction ID
 */
export const queueTransaction = async (
  chainId: number,
  walletAddress: string,
  to: string,
  data: string,
  value: string = '0',
  priority: 'high' | 'medium' | 'low' = 'medium',
  maxGasPrice?: string,
  deadline?: number
): Promise<string> => {
  try {
    // Generate transaction ID
    const txId = `tx-${chainId}-${walletAddress}-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    
    // Create transaction object
    const transaction: BatchableTransaction = {
      id: txId,
      chainId,
      walletAddress,
      to,
      data,
      value,
      priority,
      timestamp: Date.now(),
      maxGasPrice,
      deadline,
    };
    
    // Add to queue
    if (!transactionQueue[chainId]) {
      transactionQueue[chainId] = [];
    }
    
    transactionQueue[chainId].push(transaction);
    
    // Store in database
    const db = await getDatabase();
    if (!db) {
      throw new Error('Database not initialized');
    }
    await db.add('pendingTransactions', transaction);
    
    logger.info(`Transaction ${txId} queued for batching on chain ${chainId}`);
    
    return txId;
  } catch (error) {
    logger.error('Error queueing transaction for batching:', error);
    throw error;
  }
};

/**
 * Get batch status
 * @param batchId Batch ID
 * @returns Batch status
 */
export const getBatchStatus = async (batchId: string): Promise<Batch | null> => {
  try {
    // Check in-memory batches first
    if (batches[batchId]) {
      return batches[batchId];
    }
    
    // Check database
    const db = await getDatabase();
    if (!db) {
      throw new Error('Database not initialized');
    }
    return await db.get('batches', batchId);
  } catch (error) {
    logger.error(`Error getting batch status for ${batchId}:`, error);
    return null;
  }
};

/**
 * Get transaction status
 * @param txId Transaction ID
 * @returns Transaction status
 */
export const getTransactionStatus = async (txId: string): Promise<{
  transaction: BatchableTransaction | null;
  batchId?: string;
  batchStatus?: string;
}> => {
  try {
    // Check database for transaction
    const db = await getDatabase();
    if (!db) {
      throw new Error('Database not initialized');
    }
    const transaction = await db.get('pendingTransactions', txId);
    
    if (!transaction) {
      return { transaction: null };
    }
    
    // Check if transaction is in a batch
    for (const [batchId, batch] of Object.entries(batches)) {
      if (batch.transactions.includes(txId)) {
        return {
          transaction,
          batchId,
          batchStatus: batch.status,
        };
      }
    }
    
    // Check database for batches containing this transaction
    const allBatches = await db.getAll('batches');
    for (const batch of allBatches) {
      if (batch.transactions.includes(txId)) {
        return {
          transaction,
          batchId: batch.id,
          batchStatus: batch.status,
        };
      }
    }
    
    // Transaction is still in queue
    return { transaction };
  } catch (error) {
    logger.error(`Error getting transaction status for ${txId}:`, error);
    return { transaction: null };
  }
};

/**
 * Cancel a queued transaction
 * @param txId Transaction ID
 * @returns Success status
 */
export const cancelTransaction = async (txId: string): Promise<boolean> => {
  try {
    // Find transaction in queues
    for (const chainId of Object.keys(transactionQueue).map(Number)) {
      const index = transactionQueue[chainId].findIndex(tx => tx.id === txId);
      
      if (index !== -1) {
        // Remove from queue
        transactionQueue[chainId].splice(index, 1);
        
        // Remove from database
        const db = getDatabase();
        await db.delete('pendingTransactions', txId);
        
        logger.info(`Transaction ${txId} cancelled`);
        return true;
      }
    }
    
    logger.warn(`Transaction ${txId} not found in queue, cannot cancel`);
    return false;
  } catch (error) {
    logger.error(`Error cancelling transaction ${txId}:`, error);
    return false;
  }
};

/**
 * Get batching service status
 * @returns Service status
 */
export const getBatchingServiceStatus = (): Record<string, any> => {
  const queueSizes: Record<string, number> = {};
  
  for (const [chainId, queue] of Object.entries(transactionQueue)) {
    queueSizes[chainId] = queue.length;
  }
  
  const activeBatches = Object.values(batches).filter(
    batch => batch.status === 'simulating' || batch.status === 'executing'
  ).length;
  
  return {
    status: 'active',
    queueSizes,
    activeBatches,
    completedBatches: Object.values(batches).filter(batch => batch.status === 'completed').length,
    failedBatches: Object.values(batches).filter(batch => batch.status === 'failed').length,
    configs: batchConfigs,
  };
};

/**
 * Update batch configuration for a chain
 * @param chainId Chain ID
 * @param config New configuration
 */
export const updateBatchConfig = (chainId: number, config: Partial<BatchConfig>): void => {
  if (!batchConfigs[chainId]) {
    batchConfigs[chainId] = { ...defaultBatchConfig };
  }
  
  batchConfigs[chainId] = {
    ...batchConfigs[chainId],
    ...config,
  };
  
  logger.info(`Batch configuration updated for chain ${chainId}`);
};

export const createBatch = async (batchData: Omit<Batch, 'id' | 'createdAt' | 'status'>): Promise<string> => {
  try {
    const db = await getDatabase();
    if (!db) {
      throw new Error('Database not initialized');
    }

    const batch: Batch = {
      ...batchData,
      id: `batch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      createdAt: Date.now(),
      status: 'pending'
    };

    const tx = db.transaction('batches', 'readwrite');
    const store = tx.objectStore('batches');
    await store.put(batch);
    await tx.done;

    return batch.id;
  } catch (error) {
    logger.error('Error creating batch:', error);
    throw error;
  }
};

// Update deleteBatch function to use proper database operations
export const deleteBatch = async (batchId: string): Promise<void> => {
  try {
    const db = await getDatabase();
    if (!db) {
      throw new Error('Database not initialized');
    }

    await deleteBatchFromDatabase(batchId);

    logger.debug(`Batch ${batchId} deleted`);
  } catch (error) {
    logger.error(`Error deleting batch ${batchId}:`, error);
    throw error;
  }
};

// Fix getBatch function return type
export const getBatch = async (batchId: string): Promise<Batch | null> => {
  try {
    const db = await getDatabase();
    if (!db) {
      throw new Error('Database not initialized');
    }

    const tx = db.transaction('batches', 'readonly');
    const store = tx.objectStore('batches');
    const batch = await store.get(batchId);

    return batch || null;
  } catch (error) {
    logger.error(`Error getting batch ${batchId}:`, error);
    throw error;
  }
};

// Fix database operations
const addBatchToDatabase = async (batch: Batch) => {
  const db = await getDatabase();
  if (!db) {
    throw new Error('Database not initialized');
  }
  
  const tx = db.transaction('batches', 'readwrite');
  const store = tx.objectStore('batches');
  await store.add(batch);
  await tx.done;
};

const deleteBatchFromDatabase = async (batchId: string) => {
  const db = await getDatabase();
  if (!db) {
    throw new Error('Database not initialized');
  }
  
  const tx = db.transaction('batches', 'readwrite');
  const store = tx.objectStore('batches');
  await store.delete(batchId);
  await tx.done;
};
