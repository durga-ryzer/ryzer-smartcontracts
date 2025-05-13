import { ethers } from 'ethers';
import { logger } from '../../utils/logger';
import { getDatabase } from '../../config/database';
import { Alchemy, Network } from 'alchemy-sdk';
import { Transaction } from '../../types';

// Configuration for supported networks
const SUPPORTED_NETWORKS: Record<number, {
  name: string;
  rpcUrl: string;
  alchemyApiKey: string;
  alchemyNetwork: any;
  blockTime: number;
}> = {
  1: {
    name: 'Ethereum Mainnet',
    rpcUrl: process.env.ETH_MAINNET_RPC_URL || 'https://mainnet.infura.io/v3/your-api-key',
    alchemyApiKey: process.env.ALCHEMY_ETH_API_KEY || '',
    alchemyNetwork: Network.ETH_MAINNET,
    blockTime: 12, // Average block time in seconds
  },
  137: {
    name: 'Polygon Mainnet',
    rpcUrl: process.env.POLYGON_MAINNET_RPC_URL || 'https://polygon-rpc.com',
    alchemyApiKey: process.env.ALCHEMY_POLYGON_API_KEY || '',
    alchemyNetwork: Network.MATIC_MAINNET,
    blockTime: 2,
  },
  56: {
    name: 'Binance Smart Chain',
    rpcUrl: process.env.BSC_MAINNET_RPC_URL || 'https://bsc-dataseed.binance.org/',
    alchemyApiKey: '', // Alchemy doesn't support BSC
    alchemyNetwork: null,
    blockTime: 3,
  },
  // Add more networks as needed
};

// Provider instances for each network
const providers: Record<number, ethers.providers.JsonRpcProvider> = {};

// Alchemy instances for each network
const alchemyInstances: Record<number, Alchemy> = {};

// Store the latest processed block for each network
const latestProcessedBlocks: Record<number, number> = {};

// Polling intervals for each network
const pollingIntervals: Record<number, NodeJS.Timeout> = {};

/**
 * Initialize the indexer service
 */
export const initializeIndexerService = async (): Promise<void> => {
  try {
    logger.info('Initializing indexer service...');
    
    // Initialize providers and Alchemy instances for each supported network
    for (const [chainIdStr, network] of Object.entries(SUPPORTED_NETWORKS)) {
      const chainId = parseInt(chainIdStr);
      
      // Create provider
      const provider = new ethers.providers.JsonRpcProvider(network.rpcUrl);
      providers[chainId] = provider;
      
      // Get latest block number
      const latestBlock = await provider.getBlockNumber();
      latestProcessedBlocks[chainId] = latestBlock;
      
      logger.info(`Indexer initialized for ${network.name} at block ${latestBlock}`);
      
      // Initialize Alchemy if API key is provided
      if (network.alchemyApiKey && network.alchemyNetwork) {
        const alchemy = new Alchemy({
          apiKey: network.alchemyApiKey,
          network: network.alchemyNetwork,
        });
        
        alchemyInstances[chainId] = alchemy;
        logger.info(`Alchemy initialized for ${network.name}`);
      }
      
      // Start polling for new blocks
      const pollingInterval = Math.max(network.blockTime * 1000, 5000); // At least 5 seconds
      pollingIntervals[chainId] = setInterval(() => {
        pollNewBlocks(chainId).catch(error => {
          logger.error(`Error polling blocks for chain ${chainId}:`, error);
        });
      }, pollingInterval);
    }
    
    logger.info('Indexer service initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize indexer service:', error);
    throw error;
  }
};

/**
 * Poll for new blocks and process transactions
 * @param chainId Chain ID
 */
const pollNewBlocks = async (chainId: number): Promise<void> => {
  try {
    const provider = providers[chainId];
    const network = SUPPORTED_NETWORKS[chainId];
    
    // Get latest block number
    const latestBlock = await provider.getBlockNumber();
    const lastProcessedBlock = latestProcessedBlocks[chainId];
    
    // Process new blocks
    if (latestBlock > lastProcessedBlock) {
      logger.debug(`Processing blocks ${lastProcessedBlock + 1} to ${latestBlock} for ${network.name}`);
      
      // Get all wallets from database
      const db = await getDatabase();
      if (!db) {
        throw new Error('Database not initialized');
      }
      const tx = db.transaction('wallets', 'readonly');
      const store = tx.objectStore('wallets');
      const wallets = await store.getAll();
      const walletAddresses = wallets
        .filter(wallet => wallet.chainId === chainId)
        .map(wallet => wallet.address.toLowerCase());
      
      // If no wallets to track, just update the latest processed block
      if (walletAddresses.length === 0) {
        latestProcessedBlocks[chainId] = latestBlock;
        return;
      }
      
      // Process blocks in batches to avoid overloading the provider
      const batchSize = 10;
      for (let i = lastProcessedBlock + 1; i <= latestBlock; i += batchSize) {
        const endBlock = Math.min(i + batchSize - 1, latestBlock);
        await processBlockRange(chainId, i, endBlock, walletAddresses);
      }
      
      // Update latest processed block
      latestProcessedBlocks[chainId] = latestBlock;
    }
  } catch (error) {
    logger.error(`Error polling blocks for chain ${chainId}:`, error);
  }
};

/**
 * Process a range of blocks
 * @param chainId Chain ID
 * @param startBlock Start block number
 * @param endBlock End block number
 * @param walletAddresses Array of wallet addresses to track
 */
const processBlockRange = async (
  chainId: number,
  startBlock: number,
  endBlock: number,
  walletAddresses: string[]
): Promise<void> => {
  try {
    const provider = providers[chainId];
    const alchemy = alchemyInstances[chainId];
    const db = await getDatabase();
    if (!db) {
      throw new Error('Database not initialized');
    }
    
    // If Alchemy is available, use it for better performance
    if (alchemy) {
      // For each wallet address
      for (const address of walletAddresses) {
        // Get transactions for the address
        const transfers = await alchemy.core.getAssetTransfers({
          fromBlock: '0x' + startBlock.toString(16),
          toBlock: '0x' + endBlock.toString(16),
          fromAddress: address,
          category: ['external', 'internal', 'erc20', 'erc721', 'erc1155'],
        });
        
        // Process outgoing transfers
        for (const transfer of transfers.transfers) {
          await processTransfer(chainId, transfer, 'from', address);
        }
        
        // Get incoming transfers
        const incomingTransfers = await alchemy.core.getAssetTransfers({
          fromBlock: '0x' + startBlock.toString(16),
          toBlock: '0x' + endBlock.toString(16),
          toAddress: address,
          category: ['external', 'internal', 'erc20', 'erc721', 'erc1155'],
        });
        
        // Process incoming transfers
        for (const transfer of incomingTransfers.transfers) {
          await processTransfer(chainId, transfer, 'to', address);
        }
      }
    } else {
      // Fallback to standard provider if Alchemy is not available
      // Process blocks one by one
      for (let blockNumber = startBlock; blockNumber <= endBlock; blockNumber++) {
        const block = await provider.getBlockWithTransactions(blockNumber);
        
        // Process transactions in the block
        for (const tx of block.transactions) {
          const fromAddress = tx.from.toLowerCase();
          const toAddress = tx.to?.toLowerCase() || '';
          
          // Check if transaction involves any of our wallets
          const isFromWallet = walletAddresses.includes(fromAddress);
          const isToWallet = toAddress && walletAddresses.includes(toAddress);
          
          if (isFromWallet || isToWallet) {
            // Store transaction in database
            await db.put('transactions', {
              hash: tx.hash,
              from: tx.from,
              to: tx.to || '',
              value: tx.value.toString(),
              data: tx.data,
              timestamp: block.timestamp * 1000, // Convert to milliseconds
              status: 'confirmed',
              chainId,
              blockNumber,
              gasUsed: tx.gasLimit.toString(), // We don't have actual gasUsed here
              gasPrice: tx.gasPrice?.toString() || '0',
            });
            
            logger.debug(`Indexed transaction ${tx.hash} for wallet ${isFromWallet ? fromAddress : toAddress}`);
          }
        }
      }
    }
  } catch (error) {
    logger.error(`Error processing block range ${startBlock}-${endBlock} for chain ${chainId}:`, error);
  }
};

/**
 * Process a transfer from Alchemy API
 * @param chainId Chain ID
 * @param transfer Transfer object from Alchemy
 * @param direction 'from' or 'to'
 * @param walletAddress Wallet address
 */
const processTransfer = async (
  chainId: number,
  transfer: any,
  direction: 'from' | 'to',
  walletAddress: string
): Promise<void> => {
  try {
    const db = await getDatabase();
    if (!db) {
      throw new Error('Database not initialized');
    }
    
    // Check if transaction already exists
    const existingTx = await db.get('transactions', transfer.hash);
    if (existingTx) {
      return; // Skip if already indexed
    }
    
    // Store transaction in database
    await db.add('transactions', {
      hash: transfer.hash,
      from: transfer.from || '',
      to: transfer.to || '',
      value: transfer.value ? ethers.utils.parseUnits(transfer.value.toString(), 'ether').toString() : '0',
      data: '',
      timestamp: Date.now(), // We don't have the exact timestamp from Alchemy
      status: 'confirmed',
      chainId,
      blockNumber: parseInt(transfer.blockNum, 16),
      category: transfer.category,
      asset: transfer.asset,
      // Store tokenId in metadata if it exists
      ...(transfer.tokenId ? { metadata: { tokenId: transfer.tokenId.toString() } } : {}),
    });
    
    logger.debug(`Indexed transfer ${transfer.hash} for wallet ${walletAddress}`);
  } catch (error) {
    logger.error(`Error processing transfer ${transfer.hash}:`, error);
  }
};

/**
 * Get transaction history for a wallet
 * @param address Wallet address
 * @param chainId Optional chain ID to filter by
 * @param limit Maximum number of transactions to return
 * @param offset Offset for pagination
 * @returns Array of transactions
 */
export const getTransactionHistory = async (
  address: string,
  chainId?: number,
  limit: number = 50,
  offset: number = 0
): Promise<any[]> => {
  try {
    const db = await getDatabase();
    if (!db) {
      throw new Error('Database not initialized');
    }
    
    const normalizedAddress = address.toLowerCase();
    
    // Get transactions from database
    const tx = db.transaction('transactions', 'readonly');
    const store = tx.objectStore('transactions');
    const index = store.index('by-address');
    const transactions = await index.getAll(normalizedAddress);
    
    // Filter by chain ID if provided
    let filteredTxs = transactions;
    if (chainId !== undefined) {
      filteredTxs = transactions.filter(tx => tx.chainId === chainId);
    }
    
    // Sort by timestamp (newest first)
    filteredTxs.sort((a, b) => b.timestamp - a.timestamp);
    
    // Apply pagination
    return filteredTxs.slice(offset, offset + limit);
  } catch (error) {
    logger.error(`Error getting transaction history for ${address}:`, error);
    throw error;
  }
};

/**
 * Get transaction details
 * @param txHash Transaction hash
 * @returns Transaction details
 */
export const getTransactionDetails = async (txHash: string): Promise<any> => {
  try {
    const db = await getDatabase();
    if (!db) {
      throw new Error('Database not initialized');
    }
    
    // Get transaction from database
    const tx = db.transaction('transactions', 'readonly');
    const store = tx.objectStore('transactions');
    const transaction = await store.get(txHash);
    
    if (!transaction) {
      throw new Error(`Transaction ${txHash} not found`);
    }
    
    // If transaction is pending, check its status
    if (transaction.status === 'pending') {
      const provider = providers[transaction.chainId];
      
      if (provider) {
        const receipt = await provider.getTransactionReceipt(txHash);
        
        if (receipt) {
          // Update transaction status
          const updatedTx: Transaction = {
            ...transaction,
            status: receipt.status ? 'confirmed' : 'failed' as 'confirmed' | 'failed',
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString()
          };
          
          // Update in database
          const updateTx = db.transaction('transactions', 'readwrite');
          const updateStore = updateTx.objectStore('transactions');
          await updateStore.put(updatedTx);
          await updateTx.done;
          
          return updatedTx;
        }
      }
    }
    
    return transaction;
  } catch (error) {
    logger.error(`Error getting transaction details for ${txHash}:`, error);
    throw error;
  }
};

/**
 * Get the indexer status
 * @returns Indexer status
 */
export const getIndexerStatus = (): Record<string, any> => {
  const networks: Record<string, any> = {};
  
  for (const [chainIdStr, network] of Object.entries(SUPPORTED_NETWORKS)) {
    const chainId = parseInt(chainIdStr);
    
    networks[chainId] = {
      name: network.name,
      latestProcessedBlock: latestProcessedBlocks[chainId] || 0,
      alchemyEnabled: !!alchemyInstances[chainId],
    };
  }
  
  return {
    status: 'active',
    networks,
  };
};

/**
 * Clean up resources when shutting down
 */
export const shutdownIndexerService = (): void => {
  // Clear all polling intervals
  for (const chainId of Object.keys(pollingIntervals).map(Number)) {
    clearInterval(pollingIntervals[chainId]);
    delete pollingIntervals[chainId];
  }
  
  logger.info('Indexer service shut down');
};

const getWalletTransactions = async (walletAddress: string): Promise<Transaction[]> => {
  try {
    const db = await getDatabase();
    if (!db) {
      throw new Error('Database not initialized');
    }

    const tx = db.transaction('transactions', 'readonly');
    const store = tx.objectStore('transactions');
    const transactions = await store.getAll();

    // Filter transactions for this wallet's from/to addresses
    const walletTxs = transactions.filter(tx => 
      tx.from.toLowerCase() === walletAddress.toLowerCase() ||
      tx.to.toLowerCase() === walletAddress.toLowerCase()
    );
    
    // Sort by timestamp descending
    walletTxs.sort((a: Transaction, b: Transaction) => b.timestamp - a.timestamp);
    
    return walletTxs;
  } catch (error) {
    logger.error(`Error getting transactions for wallet ${walletAddress}:`, error);
    throw error;
  }
};

const getTransactionsByToken = async (chainId: number, token: string): Promise<Transaction[]> => {
  try {
    const db = await getDatabase();
    if (!db) {
      throw new Error('Database not initialized');
    }

    const tx = db.transaction('transactions', 'readonly');
    const store = tx.objectStore('transactions');
    const index = store.index('by-token');
    const key = [chainId, token];
    const transactions = await index.getAll(key);
    
    // Sort transactions by timestamp
    transactions.sort((a: Transaction, b: Transaction) => {
      return a.timestamp > b.timestamp ? -1 : 1;
    });

    return transactions;
  } catch (error) {
    logger.error('Error getting transactions by token:', error);
    throw error;
  }
};

const getTransaction = async (txHash: string, chainId: number): Promise<Transaction | null> => {
  try {
    const db = await getDatabase();
    if (!db) {
      throw new Error('Database not initialized');
    }

    const tx = db.transaction('transactions', 'readonly');
    const store = tx.objectStore('transactions');
    const transaction = await store.get(txHash); // Use hash as primary key
    
    // Filter by chainId after retrieval
    if (transaction && transaction.chainId === chainId) {
      return transaction;
    }
    return null;
  } catch (error) {
    logger.error(`Error getting transaction ${txHash}:`, error);
    throw error;
  }
};

const addTransactionToIndex = async (transaction: Transaction): Promise<void> => {
  try {
    const db = await getDatabase();
    if (!db) {
      throw new Error('Database not initialized');
    }

    const tx = db.transaction('transactions', 'readwrite');
    const store = tx.objectStore('transactions');
    await store.put(transaction);
    await tx.done;
  } catch (error) {
    logger.error('Error adding transaction to index:', error);
    throw error;
  }
};
