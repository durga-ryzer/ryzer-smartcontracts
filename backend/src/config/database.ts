import { logger } from '../utils/logger';
import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Define database schema
export interface RyzerWalletDB extends DBSchema {
  [key: string]: {
    key: string | number;
    value: any;
    indexes?: { [indexName: string]: string | string[] };
  };

  // Store definitions
  users: {
    key: string; // wallet address
    value: {
      address: string;
      email?: string;
      username?: string;
      createdAt: number;
      lastLogin?: number;
      nonce: string; // For authentication
      nonceTimestamp?: number; // Timestamp when nonce was created
      roles?: string[]; // User roles for RBAC
      customPermissions?: string[]; // Custom permissions assigned to user
      restrictions?: string[]; // Restrictions applied to user
      walletRestrictions?: Record<string, string[]>; // Wallet-specific restrictions
    };
    indexes: { 'by-email': string };
  };
  
  user_roles: {
    key: string; // role ID
    value: {
      id: string;
      userId: string; // User wallet address
      role: string; // Role name
      assignedAt: number;
      assignedBy?: string; // Address of user who assigned this role
      expiresAt?: number; // Optional expiration timestamp
    };
    indexes: { 'by-user': string; 'by-role': string };
  };
  
  audit_logs: {
    key: string; // log ID
    value: {
      id: string;
      userId: string; // User wallet address
      action: string; // The action performed
      category: string; // Category of action (auth, wallet, transaction, etc.)
      timestamp: number;
      ipAddress?: string;
      userAgent?: string;
      details?: any; // Additional details about the action
      status: 'success' | 'failure';
      sessionId?: string;
    };
    indexes: { 'by-user': string; 'by-category': string; 'by-action': string; 'by-timestamp': number };
  };
  
  hsm_keys: {
    key: string; // key ID
    value: {
      id: string;
      provider: string; // HSM provider name
      keyType: string; // Type of key (signing, encryption, etc.)
      publicKey: string;
      metadata?: any;
      createdAt: number;
      lastUsed?: number;
      status: 'active' | 'inactive' | 'compromised' | 'rotated';
      rotatedFrom?: string; // ID of previous key if rotated
      rotatedTo?: string; // ID of new key if rotated
    };
    indexes: { 'by-provider': string; 'by-status': string; 'by-type': string };
  };
  
  multisig_wallets: {
    key: string; // wallet address
    value: {
      address: string;
      chainId: number;
      owners: string[]; // List of owner addresses
      threshold: number; // Number of signatures required
      createdAt: number;
      createdBy: string; // Creator's wallet address
      name?: string; // Optional wallet name
      description?: string;
      status: 'active' | 'inactive';
    };
    indexes: { 'by-owner': string; 'by-chain': number };
  };
  
  multisig_transactions: {
    key: string; // transaction ID
    value: {
      id: string;
      walletAddress: string; // Multisig wallet address
      to: string; // Recipient address
      value: string; // Transaction value
      data?: string; // Transaction data
      nonce: number; // Transaction nonce
      chainId: number;
      status: 'proposed' | 'approved' | 'rejected' | 'executed' | 'failed' | string;
      createdAt: number;
      expiresAt?: number; // Expiration timestamp
      createdBy: string; // Proposer's wallet address
      approvals: string[]; // List of approver addresses
      rejections: string[]; // List of rejector addresses
      executedAt?: number;
      executedBy?: string;
      rejectedAt?: number;
      rejectedBy?: string;
      description?: string; // Transaction description
      metadata?: Record<string, any>; // Additional metadata
      txHash?: string; // On-chain transaction hash
    };
    indexes: { 'by-wallet': string; 'by-status': string; 'by-creator': string };
  };

  transactions: {
    key: string; // transaction hash
    value: {
      hash: string;
      from: string;
      to: string;
      value: string;
      data?: string;
      timestamp: number;
      status: 'pending' | 'confirmed' | 'failed';
      chainId: number;
      blockNumber?: number;
      gasUsed?: string;
      gasPrice?: string;
      category?: string; // 'erc20', 'erc721', 'erc1155', 'native', etc.
      asset?: string; // Token address if applicable
    };
    indexes: { 'by-address': string[]; 'by-status': string };
  };

  wallets: {
    key: string; // wallet address
    value: {
      address: string;
      type: 'eoa' | 'smart';
      chainId: number;
      owner: string;
      custodians?: string[];
      threshold?: number;
      deployedAt: number;
      lastActivity?: number;
      balance?: string;
      nonce?: number;
      implementation?: string; // For upgradeable wallets
      version?: string;
      status: 'active' | 'inactive' | 'locked';
    };
    indexes: { 'by-owner': string; 'by-chainId': number };
  };

  tokens: {
    key: string; // `${chainId}-${tokenAddress}`
    value: {
      id: string;
      address: string;
      chainId: number;
      name: string;
      symbol: string;
      decimals: number;
      balance?: string;
      lastUpdated?: number;
    };
    indexes: { 'by-chainId': number };
  };

  settings: {
    key: string; // setting key
    value: {
      key: string;
      value: any;
      updatedAt: number;
    };
  };

  events: {
    key: string; // Event ID
    value: {
      id: string;
      type: string;
      walletAddress?: string;
      timestamp: number;
      data: any;
      sessionId?: string;
      chainId?: number;
      deviceInfo?: {
        userAgent?: string;
        platform?: string;
        screenSize?: string;
        language?: string;
        ip?: string;
      };
    };
    indexes: { 'by-wallet': string; 'by-type': string; 'by-session': string };
  };

  sessions: {
    key: string; // Session ID
    value: {
      id: string;
      walletAddress: string;
      startTime: number;
      endTime?: number;
      duration?: number;
      deviceInfo?: {
        userAgent?: string;
        platform?: string;
        screenSize?: string;
        language?: string;
        ip?: string;
      };
      events: string[];
    };
    indexes: { 'by-wallet': string };
  };

  analytics_aggregated: {
    key: string; // Aggregation ID
    value: {
      id: string;
      period: string; // daily, weekly, monthly
      date: string;
      timestamp: number;
      metrics: Record<string, number>;
      networks: Record<string, number>;
      events: Record<string, number>;
      uniqueUsers: number;
      newUsers: number;
      activeUsers?: {
        hourly: number;
        daily: number;
        weekly: number;
        monthly: number;
      };
      eventTypeCounts?: Record<string, number>;
      chainActivity?: Record<number, number>;
    };
    indexes: { 'by-period': string; 'by-timestamp': number };
  };

  analytics_events: {
    key: string; // Event ID
    value: {
      id: string;
      type: string;
      timestamp: number;
      walletAddress?: string;
      chainId?: number;
      data?: any;
      sessionId?: string;
      deviceInfo?: {
        userAgent?: string;
        platform?: string;
        screenSize?: string;
        language?: string;
        ip?: string;
      };
    };
    indexes: { 'by-wallet': string; 'by-type': string; 'by-timestamp': number; 'by-chain': number };
  };

  analytics_sessions: {
    key: string; // Session ID
    value: {
      id: string;
      walletAddress: string;
      startTime: number;
      endTime?: number;
      duration?: number;
      deviceInfo?: {
        userAgent?: string;
        platform?: string;
        screenSize?: string;
        language?: string;
        ip?: string;
      };
      lastActivity?: number;
    };
    indexes: { 'by-wallet': string; 'by-start-time': number };
  };

  pendingTransactions: {
    key: string; // Transaction ID
    value: {
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
    };
    indexes: { 'by-wallet': string; 'by-chain': number };
  };

  batches: {
    key: string; // Batch ID
    value: {
      id: string;
      chainId: number;
      transactions: string[];
      status: 'pending' | 'simulating' | 'executing' | 'completed' | 'failed';
      createdAt: number;
      executedAt?: number;
      error?: string;
      gasUsed?: string;
      txHash?: string;
      totalValue?: string;
    };
    indexes: { 'by-chain': number; 'by-status': string };
  };

  simulationRequests: {
    key: string; // Simulation ID
    value: {
      id: string;
      chainId: number;
      from: string;
      to: string;
      data: string;
      value: string;
      gasLimit?: string;
      timestamp: number;
      status: 'pending' | 'simulating' | 'completed' | 'failed';
    };
    indexes: { 'by-from': string; 'by-status': string };
  };

  simulationResults: {
    key: string; // Simulation ID
    value: {
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
    };
  };

  crossChainTransactions: {
    key: string; // Transaction ID
    value: {
      id: string;
      sourceChainId: number;
      destinationChainId: number;
      sender: string;
      recipient: string;
      token: string;
      amount: string;
      bridgeProvider: string;
      status: 'pending' | 'bridging' | 'completed' | 'failed';
      sourceTxHash?: string;
      destinationTxHash?: string;
      fee?: string;
      estimatedTime?: number;
      timestamp: number;
      completedAt?: number;
      error?: string;
    };
    indexes: { 'by-sender': string; 'by-recipient': string; 'by-status': string };
  };

  recoveryConfigs: {
    key: string; // Wallet address
    value: {
      walletAddress: string;
      guardians: Array<{
        address: string;
        name?: string;
        email?: string;
        type: 'eoa' | 'contract' | 'multisig';
        added: number;
      }>;
      threshold: number;
      delay: number;
      lastUpdated: number;
    };
  };

  recoveryRequests: {
    key: string; // Request ID
    value: {
      id: string;
      walletAddress: string;
      newOwner: string;
      guardianApprovals: string[];
      status: 'pending' | 'approved' | 'executed' | 'cancelled' | 'expired';
      createdAt: number;
      expiresAt: number;
      executedAt?: number;
      cancelledAt?: number;
      txHash?: string;
    };
    indexes: { 'by-wallet': string; 'by-status': string };
  };

  recoveryBackups: {
    key: string; // Backup ID
    value: {
      id: string;
      walletAddress: string;
      encryptedData: string;
      encryptionType: 'password' | 'social' | 'mpc';
      createdAt: number;
      lastAccessed?: number;
    };
    indexes: { 'by-wallet': string };
  };
}

// Database configuration
const DB_NAME = 'ryzer-wallet';
const DB_VERSION = 1;

// Database connection instance and state tracking
let dbInstance: IDBPDatabase<RyzerWalletDB> | null = null;
let isInitializing = false;
let initPromise: Promise<IDBPDatabase<RyzerWalletDB>> | null = null;

/**
 * Initialize database connection with retry mechanism and proper error handling
 * @param retries Number of retry attempts
 * @param delay Delay between retries in milliseconds
 * @returns Database instance
 */
async function initDatabase(retries = 3, delay = 1000): Promise<IDBPDatabase<RyzerWalletDB>> {
  try {
    logger.info('Initializing IndexedDB database...');
    
    const db = await openDB<RyzerWalletDB>(DB_NAME, DB_VERSION, {
      upgrade(database, oldVersion, newVersion) {
        logger.info(`Upgrading database from version ${oldVersion} to ${newVersion}`);
        
        // Create stores and indexes
        const stores = [
          { name: 'users', keyPath: 'address', indexes: [{ name: 'by-email', keyPath: 'email' }] },
          { name: 'user_roles', keyPath: 'id', indexes: [{ name: 'by-user', keyPath: 'userId' }, { name: 'by-role', keyPath: 'role' }] },
          { name: 'audit_logs', keyPath: 'id', indexes: [{ name: 'by-user', keyPath: 'userId' }, { name: 'by-timestamp', keyPath: 'timestamp' }] },
          { name: 'hsm_keys', keyPath: 'id', indexes: [{ name: 'by-provider', keyPath: 'provider' }, { name: 'by-status', keyPath: 'status' }] },
          { name: 'multisig_wallets', keyPath: 'address', indexes: [{ name: 'by-owner', keyPath: 'owners' }, { name: 'by-chain', keyPath: 'chainId' }] },
          { name: 'multisig_transactions', keyPath: 'id', indexes: [{ name: 'by-wallet', keyPath: 'walletAddress' }, { name: 'by-status', keyPath: 'status' }] },
          { name: 'transactions', keyPath: 'hash', indexes: [{ name: 'by-address', keyPath: ['from', 'to'] }, { name: 'by-status', keyPath: 'status' }] },
          { name: 'wallets', keyPath: 'address', indexes: [{ name: 'by-owner', keyPath: 'owner' }, { name: 'by-chainId', keyPath: 'chainId' }] },
          { name: 'tokens', keyPath: 'id', indexes: [{ name: 'by-chainId', keyPath: 'chainId' }] },
          { name: 'settings', keyPath: 'key' },
          { name: 'events', keyPath: 'id', indexes: [{ name: 'by-wallet', keyPath: 'walletAddress' }, { name: 'by-type', keyPath: 'type' }] },
          { name: 'sessions', keyPath: 'id', indexes: [{ name: 'by-wallet', keyPath: 'walletAddress' }] },
          { name: 'analytics_aggregated', keyPath: 'id', indexes: [{ name: 'by-period', keyPath: 'period' }, { name: 'by-timestamp', keyPath: 'timestamp' }] },
          { name: 'analytics_events', keyPath: 'id', indexes: [{ name: 'by-wallet', keyPath: 'walletAddress' }, { name: 'by-type', keyPath: 'type' }] },
          { name: 'analytics_sessions', keyPath: 'id', indexes: [{ name: 'by-wallet', keyPath: 'walletAddress' }, { name: 'by-start-time', keyPath: 'startTime' }] },
          { name: 'pendingTransactions', keyPath: 'id', indexes: [{ name: 'by-wallet', keyPath: 'walletAddress' }, { name: 'by-chain', keyPath: 'chainId' }] },
          { name: 'batches', keyPath: 'id', indexes: [{ name: 'by-chain', keyPath: 'chainId' }, { name: 'by-status', keyPath: 'status' }] },
          { name: 'simulationRequests', keyPath: 'id', indexes: [{ name: 'by-from', keyPath: 'from' }, { name: 'by-status', keyPath: 'status' }] },
          { name: 'simulationResults', keyPath: 'id' },
          { name: 'crossChainTransactions', keyPath: 'id', indexes: [{ name: 'by-sender', keyPath: 'sender' }, { name: 'by-status', keyPath: 'status' }] },
          { name: 'recoveryConfigs', keyPath: 'walletAddress' },
          { name: 'recoveryRequests', keyPath: 'id', indexes: [{ name: 'by-wallet', keyPath: 'walletAddress' }, { name: 'by-status', keyPath: 'status' }] },
          { name: 'recoveryBackups', keyPath: 'id', indexes: [{ name: 'by-wallet', keyPath: 'walletAddress' }] }
        ];

        for (const store of stores) {
          if (!database.objectStoreNames.contains(store.name)) {
            const objectStore = database.createObjectStore(store.name, { keyPath: store.keyPath });
            
            // Create indexes
            if (store.indexes) {
              for (const index of store.indexes) {
                objectStore.createIndex(index.name, index.keyPath);
              }
            }
            
            logger.info(`Created object store: ${store.name}`);
          }
        }
      },
      blocked() {
        logger.warn('Database blocked by another version');
      },
      blocking() {
        logger.warn('Database is blocking a newer version');
      },
      terminated() {
        logger.error('Database connection terminated unexpectedly');
        dbInstance = null;
      }
    });

    // Set up error event handler
    db.addEventListener('error', (event) => {
      logger.error('Database error:', event);
    });

    // Set up close event handler
    db.addEventListener('close', () => {
      logger.info('Database connection closed');
      dbInstance = null;
    });

    logger.info('Database initialized successfully');
    return db;
  } catch (error) {
    logger.error('Database initialization failed:', error);

    if (retries > 0) {
      const nextDelay = Math.min(delay * 2, 30000); // Cap maximum delay at 30 seconds
      logger.info(`Retrying database initialization in ${nextDelay}ms... (${retries} attempts remaining)`);
      await new Promise(resolve => setTimeout(resolve, nextDelay));
      return initDatabase(retries - 1, nextDelay);
    }

    throw new Error(`Database initialization failed after multiple attempts: ${error.message}`);
  }
}

/**
 * Get the database instance with connection pooling and proper synchronization
 * @returns Database instance
 */
export const getDatabase = async (): Promise<IDBPDatabase<RyzerWalletDB>> => {
  // Return existing instance if available
  if (dbInstance) {
    return dbInstance;
  }

  // Return existing initialization promise if one is in progress
  if (isInitializing && initPromise) {
    return initPromise;
  }

  // Start new initialization
  isInitializing = true;
  initPromise = initDatabase().then((db) => {
    dbInstance = db;
    isInitializing = false;
    initPromise = null;
    return db;
  }).catch((error) => {
    isInitializing = false;
    initPromise = null;
    throw error;
  });

  return initPromise;
};

/**
 * Close the database connection and clean up resources
 */
export const closeDatabase = async (): Promise<void> => {
  if (dbInstance) {
    try {
      await dbInstance.close();
      dbInstance = null;
      logger.info('Database connection closed successfully');
    } catch (error) {
      logger.error('Error closing database connection:', error);
      // Reset instance even if close fails
      dbInstance = null;
      throw error;
    }
  }
};
