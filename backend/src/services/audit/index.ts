import { logger } from '../../utils/logger';
import { getDatabase } from '../../config/database';

// Audit log action types
export enum AuditAction {
  // Wallet actions
  WALLET_CREATED = 'wallet_created',
  WALLET_UPDATED = 'wallet_updated',
  WALLET_DELETED = 'wallet_deleted',
  
  // Transaction actions
  TRANSACTION_CREATED = 'transaction_created',
  TRANSACTION_SIGNED = 'transaction_signed',
  TRANSACTION_SENT = 'transaction_sent',
  TRANSACTION_EXECUTED = 'transaction_executed',
  TRANSACTION_FAILED = 'transaction_failed',
  
  // Multisig actions
  TRANSACTION_PROPOSED = 'transaction_proposed',
  TRANSACTION_APPROVED = 'transaction_approved',
  TRANSACTION_REJECTED = 'transaction_rejected',
  
  // User actions
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  USER_CREATED = 'user_created',
  USER_UPDATED = 'user_updated',
  USER_ROLE_CHANGED = 'user_role_changed',
  
  // Admin actions
  SETTINGS_CHANGED = 'settings_changed',
  PERMISSION_CHANGED = 'permission_changed',
  
  // Security actions
  PASSWORD_CHANGED = 'password_changed',
  MFA_ENABLED = 'mfa_enabled',
  MFA_DISABLED = 'mfa_disabled',
  API_KEY_CREATED = 'api_key_created',
  API_KEY_REVOKED = 'api_key_revoked',
  
  // HSM actions
  HSM_KEY_CREATED = 'hsm_key_created',
  HSM_KEY_USED = 'hsm_key_used',
  HSM_KEY_ROTATED = 'hsm_key_rotated',
  HSM_KEY_DELETED = 'hsm_key_deleted'
}

// Target types for audit logs
export enum AuditTargetType {
  WALLET = 'wallet',
  TRANSACTION = 'transaction',
  MULTISIG_TRANSACTION = 'multisig_transaction',
  USER = 'user',
  SETTING = 'setting',
  PERMISSION = 'permission',
  API_KEY = 'api_key',
  HSM_KEY = 'hsm_key'
}

// Audit log interface
export interface AuditLog {
  id: string;
  userId: string;
  performedBy: string;
  action: string;
  category: string;
  timestamp: number;
  ipAddress?: string;
  userAgent?: string;
  details?: any;
  status: 'success' | 'failure';
  sessionId?: string;
  targetId?: string;  // Add targetId
  targetType?: string;
  walletAddress?: string;
}

// Audit log creation parameters
export interface AuditLogParams {
  action: string;
  userId: string;  // Add userId
  performedBy: string;
  performedByIp?: string;
  targetId: string;
  targetType: string;
  walletAddress?: string;
  metadata?: Record<string, any>;
  sessionId?: string;
  tenantId?: string; // Adding optional tenantId property
}

// Audit log filters interface
export interface AuditLogFilters {
  actions?: string[];
  performedBy?: string;
  targetType?: string;
  walletAddress?: string;
  fromTimestamp?: number;
  toTimestamp?: number;
  userId?: string;  // Add userId to filters
}

/**
 * Filter audit logs based on provided criteria
 */
const filterAuditLogs = (logs: AuditLog[], filters: AuditLogFilters): AuditLog[] => {
  return logs.filter(log => {
    if (filters.actions?.length && !filters.actions.includes(log.action)) {
      return false;
    }
    if (filters.performedBy && log.performedBy !== filters.performedBy.toLowerCase()) {
      return false;
    }
    if (filters.targetType && log.targetType !== filters.targetType) {
      return false;
    }
    if (filters.walletAddress && log.walletAddress !== filters.walletAddress.toLowerCase()) {
      return false;
    }
    if (filters.fromTimestamp && log.timestamp < filters.fromTimestamp) {
      return false;
    }
    if (filters.toTimestamp && log.timestamp > filters.toTimestamp) {
      return false;
    }
    if (filters.userId && log.userId !== filters.userId) {
      return false;
    }
    return true;
  });
};

/**
 * Create an audit log entry
 * @param params Audit log parameters
 * @returns Created audit log
 */
export const createAuditLog = async (logData: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> => {
  try {
    const db = await getDatabase();
    if (!db) {
      throw new Error('Database not initialized');
    }

    const auditLog: AuditLog = {
      ...logData,
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: Date.now(),
      performedBy: logData.userId, // Ensure performedBy is set
      targetType: logData.details?.targetType || 'unknown',
      walletAddress: logData.details?.walletAddress
    };

    const tx = db.transaction('audit_logs', 'readwrite');
    const store = tx.objectStore('audit_logs');
    await store.add(auditLog);
    await tx.done;

    logger.debug(`Audit log created: ${auditLog.id}`);
  } catch (error) {
    logger.error('Error creating audit log:', error);
    throw error;
  }
};

/**
 * Get audit logs for a specific target
 * @param targetId Target ID
 * @param targetType Target type
 * @param limit Maximum number of logs to return
 * @param offset Offset for pagination
 * @returns Audit logs
 */
export const getAuditLogsForTarget = async (
  targetId: string,
  targetType: string,
  limit: number = 50,
  offset: number = 0
): Promise<AuditLog[]> => {
  try {
    const db = await getDatabase();
    if (!db) {
      throw new Error('Database not initialized');
    }
    
    const logs = await db.getAllFromIndex('audit_logs', 'by-target', [targetType, targetId]);
    
    // Transform logs to include required properties
    const transformedLogs: AuditLog[] = logs.map(log => ({
      ...log,
      performedBy: log.userId,
      targetType: log.details?.targetType || targetType,
      walletAddress: log.details?.walletAddress
    }));
    
    // Sort by timestamp in descending order
    transformedLogs.sort((a, b) => b.timestamp - a.timestamp);
    
    // Apply pagination
    return transformedLogs.slice(offset, offset + limit);
  } catch (error) {
    logger.error('Error getting audit logs for target:', error);
    throw error;
  }
};

/**
 * Get audit logs for a specific wallet
 * @param walletAddress Wallet address
 * @param limit Maximum number of logs to return
 * @param offset Offset for pagination
 * @returns Audit logs
 */
export const getAuditLogsForWallet = async (
  walletAddress: string,
  limit: number = 50,
  offset: number = 0
): Promise<AuditLog[]> => {
  try {
    const db = await getDatabase();
    if (!db) {
      throw new Error('Database not initialized');
    }
    
    const logs = await db.getAllFromIndex('audit_logs', 'by-wallet', walletAddress.toLowerCase());
    
    // Transform logs to include required properties
    const transformedLogs: AuditLog[] = logs.map(log => ({
      ...log,
      performedBy: log.userId,
      targetType: log.details?.targetType || 'wallet',
      walletAddress: log.details?.walletAddress || walletAddress
    }));
    
    // Sort by timestamp in descending order
    transformedLogs.sort((a, b) => b.timestamp - a.timestamp);
    
    // Apply pagination
    return transformedLogs.slice(offset, offset + limit);
  } catch (error) {
    logger.error('Error getting audit logs for wallet:', error);
    throw error;
  }
};

/**
 * Get audit logs for a specific user
 * @param userAddress User address
 * @param limit Maximum number of logs to return
 * @param offset Offset for pagination
 * @returns Audit logs
 */
export const getAuditLogsForUser = async (
  userAddress: string,
  limit: number = 50,
  offset: number = 0
): Promise<AuditLog[]> => {
  try {
    const db = await getDatabase();
    if (!db) {
      throw new Error('Database not initialized');
    }
    
    // Get audit logs from the database
    const logs = await db.getAllFromIndex('audit_logs', 'by-performer', userAddress.toLowerCase());
    
    // Transform logs to include required properties
    const transformedLogs: AuditLog[] = logs.map(log => ({
      ...log,
      performedBy: log.userId,
      targetType: log.details?.targetType || 'unknown',
      walletAddress: log.details?.walletAddress
    }));
    
    // Sort by timestamp in descending order
    transformedLogs.sort((a, b) => b.timestamp - a.timestamp);
    
    // Apply pagination
    return transformedLogs.slice(offset, offset + limit);
  } catch (error) {
    logger.error('Error getting audit logs for user:', error);
    throw error;
  }
};

/**
 * Search audit logs by various criteria
 * @param criteria Search criteria
 * @param limit Maximum number of logs to return
 * @param offset Offset for pagination
 * @returns Audit logs
 */
export const searchAuditLogs = async (
  criteria: AuditLogFilters,
  limit: number = 50,
  offset: number = 0
): Promise<AuditLog[]> => {
  try {
    const db = await getDatabase();
    if (!db) {
      throw new Error('Database not initialized');
    }
    
    // Get all audit logs and transform them
    const allLogs = await db.getAll('audit_logs');
    const transformedLogs: AuditLog[] = allLogs.map(log => ({
      ...log,
      performedBy: log.userId,
      targetType: log.details?.targetType || 'unknown',
      walletAddress: log.details?.walletAddress
    }));
    
    // Filter logs based on criteria
    const filteredLogs = filterAuditLogs(transformedLogs, criteria);
    
    // Sort by timestamp in descending order
    filteredLogs.sort((a, b) => b.timestamp - a.timestamp);
    
    // Apply pagination
    return filteredLogs.slice(offset, offset + limit);
  } catch (error) {
    logger.error('Error searching audit logs:', error);
    throw error;
  }
};

// Update the getAuditLogs function to include required properties
export const getAuditLogs = async (filters?: AuditLogFilters): Promise<AuditLog[]> => {
  try {
    const db = await getDatabase();
    if (!db) {
      throw new Error('Database not initialized');
    }

    const tx = db.transaction('audit_logs', 'readonly');
    const store = tx.objectStore('audit_logs');
    let logs = await store.getAll();

    // Transform logs to include required properties
    logs = logs.map(log => ({
      ...log,
      performedBy: log.userId, // Set performedBy to userId if not present
      targetType: log.details?.targetType || 'unknown',
      walletAddress: log.details?.walletAddress
    })) as AuditLog[];

    // Apply filters if provided
    if (filters) {
      logs = filterAuditLogs(logs as AuditLog[], filters);
    }

    return logs as AuditLog[];
  } catch (error) {
    logger.error('Error getting audit logs:', error);
    throw error;
  }
};

// Update other functions to include required properties
export const getRecentAuditLogs = async (limit: number = 100): Promise<AuditLog[]> => {
  try {
    const db = await getDatabase();
    if (!db) {
      throw new Error('Database not initialized');
    }

    const tx = db.transaction('audit_logs', 'readonly');
    const store = tx.objectStore('audit_logs');
    let logs = await store.getAll();

    // Transform and sort logs
    logs = logs
      .map(log => ({
        ...log,
        performedBy: log.userId,
        targetType: log.details?.targetType || 'unknown',
        walletAddress: log.details?.walletAddress
      }))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit) as AuditLog[];

    return logs;
  } catch (error) {
    logger.error('Error getting recent audit logs:', error);
    throw error;
  }
};

// Update getUserAuditLogs to include required properties
export const getUserAuditLogs = async (userId: string): Promise<AuditLog[]> => {
  try {
    const db = await getDatabase();
    if (!db) {
      throw new Error('Database not initialized');
    }

    const tx = db.transaction('audit_logs', 'readonly');
    const store = tx.objectStore('audit_logs');
    let logs = await store.getAll();

    // Filter by userId and transform
    logs = logs
      .filter(log => log.userId === userId)
      .map(log => ({
        ...log,
        performedBy: log.userId,
        targetType: log.details?.targetType || 'unknown',
        walletAddress: log.details?.walletAddress
      })) as AuditLog[];

    return logs;
  } catch (error) {
    logger.error(`Error getting audit logs for user ${userId}:`, error);
    throw error;
  }
};

export default {
  createAuditLog,
  getAuditLogsForTarget,
  getAuditLogsForWallet,
  getAuditLogsForUser,
  searchAuditLogs,
  getAuditLogs,
  getRecentAuditLogs,
  getUserAuditLogs
};
