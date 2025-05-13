import { logger } from './utils/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Parameters for creating an audit log
 */
export interface AuditLogParams {
  action: string;
  performedBy: string;
  targetId: string;
  targetType: string;
  walletAddress?: string;
  tenantId?: string;
  metadata?: Record<string, any>;
}

/**
 * Audit log entry
 */
export interface AuditLog extends AuditLogParams {
  id: string;
  timestamp: number;
}

// In-memory store for audit logs (would be replaced with a database in production)
const auditLogs: AuditLog[] = [];

/**
 * Creates an audit log entry
 * @param params Audit log parameters
 * @returns Created audit log
 */
export const createAuditLog = async (params: AuditLogParams): Promise<AuditLog> => {
  try {
    const auditLog: AuditLog = {
      id: uuidv4(),
      timestamp: Date.now(),
      ...params,
    };

    // In a real implementation, this would write to a database
    auditLogs.push(auditLog);

    logger.debug('Audit log created', {
      action: auditLog.action,
      performedBy: auditLog.performedBy,
      targetId: auditLog.targetId,
      targetType: auditLog.targetType,
    });

    return auditLog;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Error creating audit log', { error: errorMessage });
    throw new Error(`Failed to create audit log: ${errorMessage}`);
  }
};

/**
 * Gets audit logs for a specific target
 * @param targetId Target ID
 * @param targetType Target type
 * @returns Audit logs
 */
export const getAuditLogsForTarget = async (
  targetId: string,
  targetType: string
): Promise<AuditLog[]> => {
  try {
    return auditLogs.filter(
      (log) => log.targetId === targetId && log.targetType === targetType
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Error getting audit logs for target', { targetId, targetType, error: errorMessage });
    throw new Error(`Failed to get audit logs: ${errorMessage}`);
  }
};

/**
 * Gets audit logs for a specific wallet
 * @param walletAddress Wallet address
 * @returns Audit logs
 */
export const getAuditLogsForWallet = async (walletAddress: string): Promise<AuditLog[]> => {
  try {
    return auditLogs.filter((log) => log.walletAddress === walletAddress);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Error getting audit logs for wallet', { walletAddress, error: errorMessage });
    throw new Error(`Failed to get audit logs: ${errorMessage}`);
  }
};

export default {
  createAuditLog,
  getAuditLogsForTarget,
  getAuditLogsForWallet,
};
