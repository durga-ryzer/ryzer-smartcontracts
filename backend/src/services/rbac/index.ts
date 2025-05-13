import { logger } from '../../utils/logger';
import { getDatabase } from '../../config/database';
import { createAuditLog } from '../audit';
import { IDBPDatabase, DBSchema } from 'idb';

// Role definitions
export enum UserRole {
  VIEWER = 'viewer',
  USER = 'user',
  APPROVER = 'approver',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin'
}

// Permission definitions
export enum Permission {
  // Wallet permissions
  VIEW_WALLET = 'view_wallet',
  CREATE_WALLET = 'create_wallet',
  UPDATE_WALLET = 'update_wallet',
  DELETE_WALLET = 'delete_wallet',
  
  // Transaction permissions
  VIEW_TRANSACTION = 'view_transaction',
  CREATE_TRANSACTION = 'create_transaction',
  APPROVE_TRANSACTION = 'approve_transaction',
  REJECT_TRANSACTION = 'reject_transaction',
  EXECUTE_TRANSACTION = 'execute_transaction',
  
  // User permissions
  VIEW_USER = 'view_user',
  CREATE_USER = 'create_user',
  UPDATE_USER = 'update_user',
  DELETE_USER = 'delete_user',
  
  // Role permissions
  VIEW_ROLE = 'view_role',
  ASSIGN_ROLE = 'assign_role',
  
  // System permissions
  VIEW_AUDIT_LOG = 'view_audit_log',
  CONFIGURE_SYSTEM = 'configure_system',
  MANAGE_API_KEYS = 'manage_api_keys',
  MANAGE_HSM = 'manage_hsm'
}

// Role-permission mapping
const rolePermissions: Record<UserRole, Permission[]> = {
  [UserRole.VIEWER]: [
    Permission.VIEW_WALLET,
    Permission.VIEW_TRANSACTION,
    Permission.VIEW_USER
  ],
  [UserRole.USER]: [
    Permission.VIEW_WALLET,
    Permission.CREATE_WALLET,
    Permission.VIEW_TRANSACTION,
    Permission.CREATE_TRANSACTION,
    Permission.VIEW_USER
  ],
  [UserRole.APPROVER]: [
    Permission.VIEW_WALLET,
    Permission.CREATE_WALLET,
    Permission.VIEW_TRANSACTION,
    Permission.CREATE_TRANSACTION,
    Permission.APPROVE_TRANSACTION,
    Permission.REJECT_TRANSACTION,
    Permission.VIEW_USER,
    Permission.VIEW_AUDIT_LOG
  ],
  [UserRole.ADMIN]: [
    Permission.VIEW_WALLET,
    Permission.CREATE_WALLET,
    Permission.UPDATE_WALLET,
    Permission.DELETE_WALLET,
    Permission.VIEW_TRANSACTION,
    Permission.CREATE_TRANSACTION,
    Permission.APPROVE_TRANSACTION,
    Permission.REJECT_TRANSACTION,
    Permission.EXECUTE_TRANSACTION,
    Permission.VIEW_USER,
    Permission.CREATE_USER,
    Permission.UPDATE_USER,
    Permission.VIEW_ROLE,
    Permission.ASSIGN_ROLE,
    Permission.VIEW_AUDIT_LOG,
    Permission.MANAGE_API_KEYS
  ],
  [UserRole.SUPER_ADMIN]: [
    Permission.VIEW_WALLET,
    Permission.CREATE_WALLET,
    Permission.UPDATE_WALLET,
    Permission.DELETE_WALLET,
    Permission.VIEW_TRANSACTION,
    Permission.CREATE_TRANSACTION,
    Permission.APPROVE_TRANSACTION,
    Permission.REJECT_TRANSACTION,
    Permission.EXECUTE_TRANSACTION,
    Permission.VIEW_USER,
    Permission.CREATE_USER,
    Permission.UPDATE_USER,
    Permission.DELETE_USER,
    Permission.VIEW_ROLE,
    Permission.ASSIGN_ROLE,
    Permission.VIEW_AUDIT_LOG,
    Permission.CONFIGURE_SYSTEM,
    Permission.MANAGE_API_KEYS,
    Permission.MANAGE_HSM
  ]
};

// Database type
interface RyzerWalletDB extends DBSchema {
  user_roles: {
    key: string;
    value: UserRoleMapping;
    indexes: {
      'by-user': string;
      'by-role': string;
    };
  };
}

interface RyzerWalletDBInstance extends IDBPDatabase<RyzerWalletDB> {}

interface AuditLogMetadata {
  previousRoles: UserRole[];
  newRoles: UserRole[];
  customPermissions?: Permission[];
  restrictions?: Permission[];
  walletRestrictions?: Record<string, string[]>;
}

interface AuditLog {
  action: string;
  performedBy: string;
  targetId: string;
  targetType: string;
  metadata: AuditLogMetadata;
}

// User-role mapping
export interface UserRoleMapping {
  id: string;
  userId: string;
  role: string; // Single role as per database schema
  roles?: UserRole[]; // For backward compatibility
  customPermissions?: Permission[];
  restrictions?: Permission[];
  walletRestrictions?: Record<string, string[]>;
  assignedAt: number;
  assignedBy?: string;
  expiresAt?: number;
  updatedAt?: number;
  updatedBy?: string;
}

/**
 * Check if a user has a specific permission
 * @param userId User ID
 * @param permission Permission to check
 * @param walletAddress Optional wallet address for wallet-specific permissions
 * @returns Whether the user has the permission
 */
export const hasPermission = async (
  userId: string,
  permission: Permission,
  walletAddress?: string
): Promise<boolean> => {
  try {
    // Get user roles from database
    const db = await getDatabase() as unknown as RyzerWalletDBInstance;
    const userRoleMapping = await db.get('user_roles', userId) as UserRoleMapping | undefined;
    
    if (!userRoleMapping) {
      logger.warn(`User ${userId} has no role mapping`);
      return false;
    }
    
    // Check if the user has wallet restrictions
    if (walletAddress && userRoleMapping.walletRestrictions) {
      const allRestrictions = Object.values(userRoleMapping.walletRestrictions).flat();
      if (allRestrictions.length > 0 && !allRestrictions.includes(walletAddress.toLowerCase())) {
        logger.warn(`User ${userId} is restricted from wallet ${walletAddress}`);
        return false;
      }
    }
    
    // Check if the permission is explicitly restricted
    if (userRoleMapping.restrictions && userRoleMapping.restrictions.includes(permission)) {
      logger.warn(`User ${userId} is explicitly restricted from permission ${permission}`);
      return false;
    }
    
    // Check if the permission is explicitly granted
    if (userRoleMapping.customPermissions && userRoleMapping.customPermissions.includes(permission)) {
      return true;
    }
    
    // Check if any of the user's roles grant the permission
    const roles = userRoleMapping.role ? [userRoleMapping.role as UserRole] : [];
    for (const role of roles) {
      if (rolePermissions[role as UserRole]?.includes(permission)) {
        return true;
      }
    }
    
    logger.warn(`User ${userId} does not have permission ${permission}`);
    return false;
  } catch (error) {
    logger.error(`Error checking permission ${permission} for user ${userId}:`, error);
    return false;
  }
};

/**
 * Get all permissions for a user
 * @param userId User ID
 * @returns Array of permissions
 */
export const getUserPermissions = async (userId: string): Promise<Permission[]> => {
  try {
    // Get user roles from database
    const db = await getDatabase() as unknown as RyzerWalletDBInstance;
    const userRoleMapping = await db.get('user_roles', userId) as UserRoleMapping | undefined;
    
    if (!userRoleMapping) {
      logger.warn(`User ${userId} has no role mapping`);
      return [];
    }
    
    // Collect all permissions from roles
    const permissions = new Set<Permission>();
    
    // Add permissions from roles
    const roles = userRoleMapping.role ? [userRoleMapping.role as UserRole] : [];
    for (const role of roles) {
      if (rolePermissions[role as UserRole]) {
        for (const permission of rolePermissions[role as UserRole]) {
          permissions.add(permission);
        }
      }
    }
    
    // Add custom permissions
    if (userRoleMapping.customPermissions) {
      for (const permission of userRoleMapping.customPermissions) {
        permissions.add(permission);
      }
    }
    
    // Remove restricted permissions
    if (userRoleMapping.restrictions) {
      for (const permission of userRoleMapping.restrictions) {
        permissions.delete(permission);
      }
    }
    
    return Array.from(permissions);
  } catch (error) {
    logger.error(`Error getting permissions for user ${userId}:`, error);
    return [];
  }
};

/**
 * Assign roles to a user
 * @param userId User ID
 * @param roles Roles to assign
 * @param assignedBy User ID of the assigner
 * @param customPermissions Optional custom permissions
 * @param restrictions Optional permission restrictions
 * @param walletRestrictions Optional wallet restrictions
 * @returns Updated user role mapping
 */
export const assignRoles = async (
  userId: string,
  roles: UserRole[],
  assignedBy: string,
  customPermissions?: Permission[],
  restrictions?: Permission[],
  walletRestrictions?: Record<string, string[]>
): Promise<UserRoleMapping> => {
  try {
    // Validate roles
    for (const role of roles) {
      if (!Object.values(UserRole).includes(role)) {
        throw new Error(`Invalid role: ${role}`);
      }
    }
    
    // Validate custom permissions
    if (customPermissions) {
      for (const permission of customPermissions) {
        if (!Object.values(Permission).includes(permission)) {
          throw new Error(`Invalid permission: ${permission}`);
        }
      }
    }
    
    // Validate restrictions
    if (restrictions) {
      for (const permission of restrictions) {
        if (!Object.values(Permission).includes(permission)) {
          throw new Error(`Invalid restriction: ${permission}`);
        }
      }
    }
    
    // Normalize wallet restrictions
    const normalizedWalletRestrictions = walletRestrictions ? 
      Object.fromEntries(
        Object.entries(walletRestrictions).map(([key, addresses]) => 
          [key, addresses.map((addr: string) => addr.toLowerCase())]
        )
      ) : undefined;
    
    // Create or update user role mapping
    const db = await getDatabase() as unknown as RyzerWalletDBInstance;
    const existingMapping = await db.get('user_roles', userId) as UserRoleMapping | undefined;
    
    const userRoleMapping: UserRoleMapping = {
      id: userId,
      userId: userId,
      role: roles[0],
      customPermissions,
      restrictions,
      walletRestrictions: normalizedWalletRestrictions,
      assignedAt: Date.now(),
      assignedBy: assignedBy.toLowerCase(),
      updatedAt: Date.now(),
      updatedBy: assignedBy.toLowerCase()
    };
    
    // Store in database
    await db.put('user_roles', userRoleMapping);
    
    // Create audit log
    await createAuditLog({
      action: 'user_role_changed',
      performedBy: assignedBy.toLowerCase(),
      targetId: userId,
      targetType: 'user',
      metadata: {
        previousRoles: existingMapping?.roles || [],
        newRoles: roles,
        customPermissions,
        restrictions,
        walletRestrictions: normalizedWalletRestrictions
      } as AuditLogMetadata
    } as AuditLog);
    
    logger.info(`Assigned roles ${roles.join(', ')} to user ${userId}`);
    return userRoleMapping;
  } catch (error) {
    logger.error(`Error assigning roles to user ${userId}:`, error);
    throw error;
  }
};

/**
 * Get user role mapping
 * @param userId User ID
 * @returns User role mapping or null if not found
 */
export const getUserRoleMapping = async (userId: string): Promise<UserRoleMapping | null> => {
  try {
    const db = await getDatabase() as unknown as RyzerWalletDBInstance;
    const mapping = await db.get('user_roles', userId.toLowerCase());
    return mapping || null;
  } catch (error) {
    logger.error(`Error getting role mapping for user ${userId}:`, error);
    return null;
  }
};

/**
 * Get all users with a specific role
 * @param role Role to filter by
 * @returns Array of user IDs
 */
export const getUsersByRole = async (role: UserRole): Promise<string[]> => {
  try {
    const db = await getDatabase() as unknown as RyzerWalletDBInstance;
    const allUserRoles = await db.getAll('user_roles') as UserRoleMapping[];
    
    return allUserRoles
      .filter((mapping: UserRoleMapping) => mapping.roles?.includes(role))
      .map((mapping: UserRoleMapping) => mapping.userId);
  } catch (error) {
    logger.error(`Error getting users with role ${role}:`, error);
    return [];
  }
};

export default {
  UserRole,
  Permission,
  hasPermission,
  getUserPermissions,
  assignRoles,
  getUserRoleMapping,
  getUsersByRole
};
