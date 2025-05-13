import { logger } from '../../utils/logger';
import { getDatabase } from '../../config/database';
import { SUPPORTED_NETWORKS } from '../../config/networks';
import { RelayerService } from '../relayer';
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import crypto from 'crypto';
import { ethers } from 'ethers';

// Database schema
interface RyzerWalletDB extends DBSchema {
  recoveryConfigs: {
    key: string;
    value: RecoveryConfig;
    indexes: {
      'by-wallet': string;
    };
  };
  recoveryRequests: {
    key: string;
    value: RecoveryRequest;
    indexes: {
      'by-wallet': string;
      'by-status': string;
    };
  };
  recoveryBackups: {
    key: string;
    value: RecoveryBackup;
    indexes: {
      'by-wallet': string;
    };
  };
}

// Use proper IDB types
type IDBStoreValue = RecoveryConfig | RecoveryRequest | RecoveryBackup;

// Guardian
interface Guardian {
  address: string;
  name?: string;
  email?: string;
  type: 'eoa' | 'contract' | 'multisig';
  added: number;
}

// Recovery configuration
interface RecoveryConfig {
  walletAddress: string;
  guardians: Guardian[];
  threshold: number;
  delay: number; // seconds
  lastUpdated: number;
}

// Recovery request
interface RecoveryRequest {
  id: string;
  walletAddress: string;
  newOwner: string;
  guardianApprovals: string[]; // Array of guardian addresses that approved
  status: 'pending' | 'approved' | 'executed' | 'cancelled' | 'expired';
  createdAt: number;
  expiresAt: number;
  executedAt?: number;
  cancelledAt?: number;
  txHash?: string;
}

// Recovery backup
interface RecoveryBackup {
  id: string;
  walletAddress: string;
  encryptedData: string; // Encrypted recovery data
  encryptionType: 'password' | 'social' | 'mpc';
  createdAt: number;
  lastAccessed?: number;
}

// Active recovery requests
const activeRequests: Record<string, RecoveryRequest> = {};

// Recovery configurations
const recoveryConfigs: Record<string, RecoveryConfig> = {};

let db: IDBPDatabase<RyzerWalletDB>;

async function getDB(): Promise<IDBPDatabase<RyzerWalletDB>> {
  if (!db) {
    db = await openDB<RyzerWalletDB>('ryzer_wallet_db', 1, {
      upgrade(database) {
        // Check if stores exist before creating them
        if (!database.objectStoreNames.includes('recoveryConfigs')) {
          const configStore = database.createObjectStore('recoveryConfigs', { keyPath: 'walletAddress' });
          configStore.createIndex('by-wallet', 'walletAddress');
        }
        
        if (!database.objectStoreNames.includes('recoveryRequests')) {
          const requestStore = database.createObjectStore('recoveryRequests', { keyPath: 'id' });
          requestStore.createIndex('by-wallet', 'walletAddress');
          requestStore.createIndex('by-status', 'status');
        }
        
        if (!database.objectStoreNames.includes('recoveryBackups')) {
          const backupStore = database.createObjectStore('recoveryBackups', { keyPath: 'id' });
          backupStore.createIndex('by-wallet', 'walletAddress');
        }
      }
    });
  }
  return db;
}

// Maximum retry attempts for database operations
const MAX_RETRIES = 3;

// Service initialization with error handling and retries
export const initializeRecoveryService = async (): Promise<void> => {
  let retries = 0;
  while (retries < MAX_RETRIES) {
    try {
      logger.info('Initializing recovery service...');
      
      const db = await getDB();
      
      // Load recovery configurations with validation
      const configs = await db.getAll('recoveryConfigs');
      for (const config of configs) {
        if (validateRecoveryConfig(config)) {
          recoveryConfigs[config.walletAddress] = config;
        } else {
          logger.warn(`Invalid recovery config found for wallet ${config.walletAddress}`);
        }
      }
      
      // Load and validate active recovery requests
      const requests = await db.getAll('recoveryRequests');
      for (const request of requests) {
        if (validateRecoveryRequest(request) && 
            (request.status === 'pending' || request.status === 'approved')) {
          activeRequests[request.id] = request;
        }
      }
      
      // Start monitoring with error handling
      startRequestMonitoring();
      
      logger.info(`Recovery service initialized with ${Object.keys(recoveryConfigs).length} configs and ${Object.keys(activeRequests).length} active requests`);
      break;
    } catch (error) {
      retries++;
      logger.error(`Failed to initialize recovery service (attempt ${retries}/${MAX_RETRIES}):`, error);
      if (retries === MAX_RETRIES) {
        throw new Error('Failed to initialize recovery service after maximum retries');
      }
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 1000 * retries));
    }
  }
};

// Validate recovery configuration
function validateRecoveryConfig(config: RecoveryConfig): boolean {
  try {
    if (!config.walletAddress || !ethers.utils.isAddress(config.walletAddress)) {
      return false;
    }
    
    if (!Array.isArray(config.guardians) || config.guardians.length === 0) {
      return false;
    }
    
    if (!config.guardians.every(g => ethers.utils.isAddress(g.address))) {
      return false;
    }
    
    if (typeof config.threshold !== 'number' || 
        config.threshold <= 0 || 
        config.threshold > config.guardians.length) {
      return false;
    }
    
    if (typeof config.delay !== 'number' || config.delay < 0) {
      return false;
    }
    
    return true;
  } catch (error) {
    logger.error('Error validating recovery config:', error);
    return false;
  }
}

// Validate recovery request
function validateRecoveryRequest(request: RecoveryRequest): boolean {
  try {
    if (!request.id || typeof request.id !== 'string') {
      return false;
    }
    
    if (!ethers.utils.isAddress(request.walletAddress) || 
        !ethers.utils.isAddress(request.newOwner)) {
      return false;
    }
    
    if (!Array.isArray(request.guardianApprovals) || 
        !request.guardianApprovals.every(addr => ethers.utils.isAddress(addr))) {
      return false;
    }
    
    const validStatuses = ['pending', 'approved', 'executed', 'cancelled', 'expired'];
    if (!validStatuses.includes(request.status)) {
      return false;
    }
    
    if (typeof request.createdAt !== 'number' || 
        typeof request.expiresAt !== 'number' ||
        request.expiresAt <= request.createdAt) {
      return false;
    }
    
    return true;
  } catch (error) {
    logger.error('Error validating recovery request:', error);
    return false;
  }
}

/**
 * Start monitoring active recovery requests
 */
const startRequestMonitoring = (): void => {
  // Monitor requests every minute
  setInterval(monitorRequests, 60 * 1000);
  logger.info('Recovery request monitoring started');
};

/**
 * Monitor active recovery requests
 */
const monitorRequests = async (): Promise<void> => {
  try {
    const now = Date.now();
    
    for (const [requestId, request] of Object.entries(activeRequests)) {
      // Check if request has expired
      if (request.expiresAt < now && request.status === 'pending') {
        request.status = 'expired';
        
        // Update in database
        const db = await getDB();
        await db.put('recoveryRequests', request);
        
        // Remove from active requests
        delete activeRequests[requestId];
        
        logger.info(`Recovery request ${requestId} expired`);
        continue;
      }
      
      // Check if request has enough approvals to execute
      if (request.status === 'approved') {
        await executeRecovery(requestId);
      }
    }
  } catch (error) {
    logger.error('Error monitoring recovery requests:', error);
  }
};

/**
 * Execute recovery
 * @param requestId Request ID
 */
const executeRecovery = async (requestId: string): Promise<void> => {
  try {
    const request = activeRequests[requestId];
    
    if (!request || request.status !== 'approved') {
      return;
    }
    
    logger.info(`Executing recovery request ${requestId} for wallet ${request.walletAddress}...`);
    
    // Get recovery configuration
    const config = await getRecoveryConfig(request.walletAddress);
    if (!config) {
      throw new Error('Recovery configuration not found');
    }

    // Initialize relayer service with network configuration
    const relayer = new RelayerService({
      networkId: config.networkId || 1, // Default to mainnet if not specified
      provider: getProvider(config.networkId || 1)
    });
    
    // Execute recovery transaction
    const tx = await relayer.executeRecovery({
      walletAddress: request.walletAddress,
      newOwner: request.newOwner,
      guardianSignatures: request.guardianApprovals,
      threshold: config.threshold
    });
    
    // Update request status
    request.status = 'executed';
    request.executedAt = Date.now();
    request.txHash = tx.hash;
    
    // Update in database
    const db = await getDB();
    await db.put('recoveryRequests', request);
    
    // Remove from active requests
    delete activeRequests[requestId];
    
    logger.info(`Recovery request ${requestId} executed successfully with tx hash ${tx.hash}`);
  } catch (error) {
    logger.error(`Error executing recovery request ${requestId}:`, error);
    throw error;
  }
};

/**
 * Set up recovery configuration
 * @param walletAddress Wallet address
 * @param guardians Guardian addresses
 * @param threshold Approval threshold
 * @param delay Time delay in seconds
 * @returns Success status
 */
export const setupRecovery = async (
  walletAddress: string,
  guardians: Guardian[],
  threshold: number,
  delay: number
): Promise<boolean> => {
  try {
    // Validate parameters
    if (!walletAddress) {
      throw new Error('Wallet address is required');
    }
    
    if (!guardians || guardians.length === 0) {
      throw new Error('At least one guardian is required');
    }
    
    if (threshold <= 0 || threshold > guardians.length) {
      throw new Error(`Threshold must be between 1 and ${guardians.length}`);
    }
    
    if (delay < 0) {
      throw new Error('Delay must be non-negative');
    }
    
    // Create recovery configuration
    const config: RecoveryConfig = {
      walletAddress,
      guardians,
      threshold,
      delay,
      lastUpdated: Date.now(),
    };
    
    // Store in memory
    recoveryConfigs[walletAddress] = config;
    
    // Store in database
    const db = await getDB();
    await db.put('recoveryConfigs', config);
    
    logger.info(`Recovery configuration set up for wallet ${walletAddress} with ${guardians.length} guardians and threshold ${threshold}`);
    
    return true;
  } catch (error) {
    logger.error(`Error setting up recovery for wallet ${walletAddress}:`, error);
    return false;
  }
};

/**
 * Get recovery configuration
 * @param walletAddress Wallet address
 * @returns Recovery configuration
 */
export const getRecoveryConfig = async (walletAddress: string): Promise<RecoveryConfig | null> => {
  try {
    // Check in-memory cache first
    if (recoveryConfigs[walletAddress]) {
      return recoveryConfigs[walletAddress];
    }
    
    // Check database
    const db = await getDB();
    const config = await db.get('recoveryConfigs', walletAddress);
    return config || null;
  } catch (error) {
    logger.error(`Error getting recovery configuration for wallet ${walletAddress}:`, error);
    return null;
  }
};

/**
 * Update recovery configuration
 * @param walletAddress Wallet address
 * @param updates Updates to apply
 * @returns Success status
 */
export const updateRecoveryConfig = async (
  walletAddress: string,
  updates: Partial<RecoveryConfig>
): Promise<boolean> => {
  try {
    // Get current configuration
    const config = await getRecoveryConfig(walletAddress);
    
    if (!config) {
      throw new Error(`No recovery configuration found for wallet ${walletAddress}`);
    }
    
    // Apply updates
    const updatedConfig: RecoveryConfig = {
      ...config,
      ...updates,
      lastUpdated: Date.now(),
    };
    
    // Validate updated configuration
    if (updatedConfig.threshold <= 0 || updatedConfig.threshold > updatedConfig.guardians.length) {
      throw new Error(`Threshold must be between 1 and ${updatedConfig.guardians.length}`);
    }
    
    // Store in memory
    recoveryConfigs[walletAddress] = updatedConfig;
    
    // Store in database
    const db = await getDB();
    await db.put('recoveryConfigs', updatedConfig);
    
    logger.info(`Recovery configuration updated for wallet ${walletAddress}`);
    
    return true;
  } catch (error) {
    logger.error(`Error updating recovery configuration for wallet ${walletAddress}:`, error);
    return false;
  }
};

/**
 * Add guardian
 * @param walletAddress Wallet address
 * @param guardian Guardian to add
 * @returns Success status
 */
export const addGuardian = async (
  walletAddress: string,
  guardian: Guardian
): Promise<boolean> => {
  try {
    // Get current configuration
    const config = await getRecoveryConfig(walletAddress);
    
    if (!config) {
      throw new Error(`No recovery configuration found for wallet ${walletAddress}`);
    }
    
    // Check if guardian already exists
    if (config.guardians.some(g => g.address === guardian.address)) {
      throw new Error(`Guardian ${guardian.address} already exists`);
    }
    
    // Add guardian
    const updatedGuardians = [...config.guardians, { ...guardian, added: Date.now() }];
    
    // Update configuration
    return await updateRecoveryConfig(walletAddress, {
      guardians: updatedGuardians,
    });
  } catch (error) {
    logger.error(`Error adding guardian for wallet ${walletAddress}:`, error);
    return false;
  }
};

/**
 * Remove guardian
 * @param walletAddress Wallet address
 * @param guardianAddress Guardian address to remove
 * @returns Success status
 */
export const removeGuardian = async (
  walletAddress: string,
  guardianAddress: string
): Promise<boolean> => {
  try {
    // Get current configuration
    const config = await getRecoveryConfig(walletAddress);
    
    if (!config) {
      throw new Error(`No recovery configuration found for wallet ${walletAddress}`);
    }
    
    // Check if guardian exists
    if (!config.guardians.some(g => g.address === guardianAddress)) {
      throw new Error(`Guardian ${guardianAddress} not found`);
    }
    
    // Remove guardian
    const updatedGuardians = config.guardians.filter(g => g.address !== guardianAddress);
    
    // Check if threshold needs adjustment
    let updatedThreshold = config.threshold;
    if (updatedThreshold > updatedGuardians.length) {
      updatedThreshold = updatedGuardians.length;
    }
    
    // Update configuration
    return await updateRecoveryConfig(walletAddress, {
      guardians: updatedGuardians,
      threshold: updatedThreshold,
    });
  } catch (error) {
    logger.error(`Error removing guardian for wallet ${walletAddress}:`, error);
    return false;
  }
};

/**
 * Initiate recovery
 * @param walletAddress Wallet address to recover
 * @param newOwner New owner address
 * @returns Recovery request ID
 */
export const initiateRecovery = async (
  walletAddress: string,
  newOwner: string
): Promise<string> => {
  try {
    // Get recovery configuration
    const config = await getRecoveryConfig(walletAddress);
    
    if (!config) {
      throw new Error(`No recovery configuration found for wallet ${walletAddress}`);
    }
    
    // Generate request ID
    const requestId = `recovery-${walletAddress}-${Date.now()}`;
    
    // Create recovery request
    const request: RecoveryRequest = {
      id: requestId,
      walletAddress,
      newOwner,
      guardianApprovals: [],
      status: 'pending',
      createdAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    };
    
    // Store in memory
    activeRequests[requestId] = request;
    
    // Store in database
    const db = await getDB();
    await db.add('recoveryRequests', request);
    
    logger.info(`Recovery initiated for wallet ${walletAddress} with new owner ${newOwner}`);
    
    return requestId;
  } catch (error) {
    logger.error(`Error initiating recovery for wallet ${walletAddress}:`, error);
    throw error;
  }
};

/**
 * Approve recovery
 * @param requestId Request ID
 * @param guardianAddress Guardian address
 * @returns Success status
 */
export const approveRecovery = async (
  requestId: string,
  guardianAddress: string
): Promise<boolean> => {
  try {
    // Get recovery request
    const request = activeRequests[requestId];
    
    if (!request) {
      throw new Error(`Recovery request ${requestId} not found or no longer active`);
    }
    
    if (request.status !== 'pending') {
      throw new Error(`Recovery request ${requestId} is not pending`);
    }
    
    // Get recovery configuration
    const config = await getRecoveryConfig(request.walletAddress);
    
    if (!config) {
      throw new Error(`No recovery configuration found for wallet ${request.walletAddress}`);
    }
    
    // Check if guardian is valid
    const isValidGuardian = config.guardians.some(g => g.address === guardianAddress);
    
    if (!isValidGuardian) {
      throw new Error(`${guardianAddress} is not a valid guardian for wallet ${request.walletAddress}`);
    }
    
    // Check if guardian has already approved
    if (request.guardianApprovals.includes(guardianAddress)) {
      throw new Error(`Guardian ${guardianAddress} has already approved this recovery request`);
    }
    
    // Add approval
    request.guardianApprovals.push(guardianAddress);
    
    // Check if threshold is reached
    if (request.guardianApprovals.length >= config.threshold) {
      request.status = 'approved';
    }
    
    // Update in database
    const db = await getDB();
    await db.put('recoveryRequests', request);
    
    logger.info(`Guardian ${guardianAddress} approved recovery request ${requestId}`);
    
    return true;
  } catch (error) {
    logger.error(`Error approving recovery request ${requestId} by guardian ${guardianAddress}:`, error);
    return false;
  }
};

/**
 * Cancel recovery
 * @param requestId Request ID
 * @param walletAddress Wallet address
 * @returns Success status
 */
export const cancelRecovery = async (
  requestId: string,
  walletAddress: string
): Promise<boolean> => {
  try {
    // Get recovery request
    const request = activeRequests[requestId];
    
    if (!request) {
      throw new Error(`Recovery request ${requestId} not found or no longer active`);
    }
    
    if (request.status !== 'pending' && request.status !== 'approved') {
      throw new Error(`Recovery request ${requestId} cannot be cancelled`);
    }
    
    // Check if wallet address matches
    if (request.walletAddress !== walletAddress) {
      throw new Error(`Wallet address mismatch`);
    }
    
    // Cancel request
    request.status = 'cancelled';
    request.cancelledAt = Date.now();
    
    // Update in database
    const db = await getDB();
    await db.put('recoveryRequests', request);
    
    // Remove from active requests
    delete activeRequests[requestId];
    
    logger.info(`Recovery request ${requestId} cancelled by wallet ${walletAddress}`);
    
    return true;
  } catch (error) {
    logger.error(`Error cancelling recovery request ${requestId}:`, error);
    return false;
  }
};

/**
 * Get recovery request
 * @param requestId Request ID
 * @returns Recovery request
 */
export const getRecoveryRequest = async (requestId: string): Promise<RecoveryRequest | null> => {
  try {
    // Check in-memory cache first
    if (activeRequests[requestId]) {
      return activeRequests[requestId];
    }
    
    // Check database
    const db = await getDB();
    const request = await db.get('recoveryRequests', requestId);
    return request || null;
  } catch (error) {
    logger.error(`Error getting recovery request ${requestId}:`, error);
    return null;
  }
};

/**
 * Get recovery requests for wallet
 * @param walletAddress Wallet address
 * @returns Recovery requests
 */
export const getRecoveryRequestsForWallet = async (walletAddress: string): Promise<RecoveryRequest[]> => {
  try {
    // Get all requests from database
    const db = await getDB();
    const requests = await db.getAll('recoveryRequests');
    
    // Filter by wallet address
    return requests.filter(req => req.walletAddress === walletAddress);
  } catch (error) {
    logger.error(`Error getting recovery requests for wallet ${walletAddress}:`, error);
    return [];
  }
};

/**
 * Create recovery backup
 * @param walletAddress Wallet address
 * @param data Backup data
 * @param password Encryption password
 * @returns Backup ID
 */
export const createRecoveryBackup = async (
  walletAddress: string,
  data: string,
  password: string
): Promise<string> => {
  try {
    // Generate backup ID
    const backupId = `backup-${walletAddress}-${Date.now()}`;
    
    // Encrypt data
    const encryptedData = encryptData(data, password);
    
    // Create backup
    const backup: RecoveryBackup = {
      id: backupId,
      walletAddress,
      encryptedData,
      encryptionType: 'password',
      createdAt: Date.now(),
    };
    
    // Store in database
    const db = await getDB();
    await db.add('recoveryBackups', backup);
    
    logger.info(`Recovery backup created for wallet ${walletAddress}`);
    
    return backupId;
  } catch (error) {
    logger.error(`Error creating recovery backup for wallet ${walletAddress}:`, error);
    throw error;
  }
};

/**
 * Get recovery backup
 * @param backupId Backup ID
 * @param password Decryption password
 * @returns Decrypted backup data
 */
export const getRecoveryBackup = async (
  backupId: string,
  password: string
): Promise<string | null> => {
  try {
    // Get backup from database
    const db = await getDB();
    const backup = await db.get('recoveryBackups', backupId);
    
    if (!backup) {
      throw new Error(`Backup ${backupId} not found`);
    }
    
    // Decrypt data
    const decryptedData = decryptData(backup.encryptedData, password);
    
    // Update last accessed
    backup.lastAccessed = Date.now();
    await db.put('recoveryBackups', backup);
    
    return decryptedData;
  } catch (error) {
    logger.error(`Error getting recovery backup ${backupId}:`, error);
    return null;
  }
};

/**
 * Get recovery backups for wallet
 * @param walletAddress Wallet address
 * @returns Recovery backups
 */
export const getRecoveryBackupsForWallet = async (walletAddress: string): Promise<RecoveryBackup[]> => {
  try {
    // Get all backups from database
    const db = await getDB();
    const backups = await db.getAll('recoveryBackups');
    
    // Filter by wallet address
    return backups.filter(backup => backup.walletAddress === walletAddress);
  } catch (error) {
    logger.error(`Error getting recovery backups for wallet ${walletAddress}:`, error);
    return [];
  }
};

/**
 * Delete recovery backup
 * @param backupId Backup ID
 * @param walletAddress Wallet address
 * @returns Success status
 */
export const deleteRecoveryBackup = async (
  backupId: string,
  walletAddress: string
): Promise<boolean> => {
  try {
    // Get backup from database
    const db = await getDB();
    const backup = await db.get('recoveryBackups', backupId);
    
    if (!backup) {
      throw new Error(`Backup ${backupId} not found`);
    }
    
    // Check if wallet address matches
    if (backup.walletAddress !== walletAddress) {
      throw new Error(`Wallet address mismatch`);
    }
    
    // Delete backup
    await db.delete('recoveryBackups', backupId);
    
    logger.info(`Recovery backup ${backupId} deleted`);
    
    return true;
  } catch (error) {
    logger.error(`Error deleting recovery backup ${backupId}:`, error);
    return false;
  }
};

/**
 * Encrypt data
 * @param data Data to encrypt
 * @param password Encryption password
 * @returns Encrypted data
 */
const encryptData = (data: string, password: string): string => {
  try {
    // Generate salt
    const salt = crypto.randomBytes(16);
    
    // Derive key from password
    const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
    
    // Generate IV
    const iv = crypto.randomBytes(16);
    
    // Create cipher
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    // Encrypt data
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Combine salt, IV, and encrypted data
    return `${salt.toString('hex')}:${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    logger.error('Error encrypting data:', error);
    throw error;
  }
};

/**
 * Decrypt data
 * @param encryptedData Encrypted data
 * @param password Decryption password
 * @returns Decrypted data
 */
const decryptData = (encryptedData: string, password: string): string => {
  try {
    // Split encrypted data into salt, IV, and encrypted parts
    const parts = encryptedData.split(':');
    
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const salt = Buffer.from(parts[0], 'hex');
    const iv = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    // Derive key from password
    const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
    
    // Create decipher
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    
    // Decrypt data
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    logger.error('Error decrypting data:', error);
    throw error;
  }
};

/**
 * Get recovery service status
 * @returns Service status
 */
export const getRecoveryServiceStatus = (): Record<string, any> => {
  return {
    status: 'active',
    activeRequests: Object.keys(activeRequests).length,
    configuredWallets: Object.keys(recoveryConfigs).length,
  };
};

export const executeRecoveryOperation = async (
  config: RecoveryConfig,
  walletAddress: string,
  recoveryData: string
): Promise<string> => {
  try {
    // Validate inputs
    if (!validateRecoveryConfig(config)) {
      throw new Error('Invalid recovery configuration');
    }
    
    if (!ethers.utils.isAddress(walletAddress)) {
      throw new Error('Invalid wallet address');
    }
    
    // Get provider with retry mechanism
    const provider = await getProviderWithRetry(config.chainId);
    const relayerService = new RelayerService(provider);
    
    // Verify transaction data
    if (!recoveryData.startsWith('0x')) {
      throw new Error('Invalid recovery data format');
    }
    
    // Execute recovery transaction with gas estimation
    const tx = await relayerService.sendTransaction({
      to: walletAddress,
      data: recoveryData,
      chainId: config.chainId,
      gasLimit: await relayerService.estimateGas({
        to: walletAddress,
        data: recoveryData
      })
    });

    logger.info(`Recovery operation executed successfully for wallet ${walletAddress}`);
    return tx.hash;
  } catch (error) {
    logger.error('Failed to execute recovery operation:', error);
    throw new Error(`Recovery execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Helper function to get provider with retry
async function getProviderWithRetry(chainId: number): Promise<ethers.providers.Provider> {
  let retries = 0;
  while (retries < MAX_RETRIES) {
    try {
      const network = SUPPORTED_NETWORKS[chainId.toString()];
      if (!network?.rpcUrl) {
        throw new Error(`Unsupported chain ID: ${chainId}`);
      }
      
      const provider = new ethers.providers.JsonRpcProvider(network.rpcUrl);
      await provider.getNetwork(); // Test the connection
      return provider;
    } catch (error) {
      retries++;
      if (retries === MAX_RETRIES) {
        throw new Error('Failed to connect to provider after maximum retries');
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * retries));
    }
  }
  throw new Error('Failed to get provider'); // Typescript requires this
}
