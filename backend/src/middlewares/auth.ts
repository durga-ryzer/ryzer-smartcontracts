import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from './errorHandler';
import { logger } from '../utils/logger';
import { UserRole } from '../services/rbac';
import { createAuditLog, AuditLog } from '../services/audit';

// Define user interface
export interface AuthUser {
  walletAddress: string;
  isAdmin?: boolean;
  roles: UserRole[];
  sessionId?: string;
  ipAddress?: string;
  lastLogin?: number;
}

// Extend Express Request interface to include user property
// Using module augmentation instead of global declaration
import 'express';

declare module 'express' {
  interface Request {
    user: AuthUser | undefined;
  }
}

/**
 * Generate a JWT token for a user
 * @param user User data to include in the token
 * @param ipAddress IP address of the user
 * @returns JWT token
 */
export const generateToken = (user: AuthUser, ipAddress?: string): string => {
  try {
    const secret = process.env.JWT_SECRET || 'ryzer-wallet-secret';
    
    // Generate a unique session ID
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Create user object with session information
    const userWithSession: AuthUser = {
      ...user,
      sessionId,
      ipAddress,
      lastLogin: Date.now(),
      roles: user.roles || []
    };
    
    // Create audit log for login
    const auditLogData: Omit<AuditLog, "id" | "timestamp"> = {
      action: 'user_login',
      userId: user.walletAddress,
      performedBy: user.walletAddress,
      category: 'auth',
      status: 'success',
      targetId: user.walletAddress,
      targetType: 'user',
      sessionId,
      ipAddress: ipAddress,
      details: {
        roles: user.roles,
        isAdmin: user.isAdmin
      }
    };
    
    createAuditLog(auditLogData).catch(error => {
      logger.error('Error creating login audit log:', error);
    });
    
    return jwt.sign(userWithSession, secret, { expiresIn: '24h' });
  } catch (error) {
    logger.error('Error generating token:', error);
    throw new Error('Failed to generate authentication token');
  }
};

/**
 * Middleware to authenticate JWT tokens
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Authentication required');
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      throw new ApiError(401, 'Authentication token missing');
    }
    
    // Verify token
    const decoded = verifyToken(token, req.ip);
    
    // Attach user to request
    req.user = decoded;
    
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new ApiError(401, 'Invalid token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new ApiError(401, 'Token expired'));
    } else {
      logger.error('Authentication error:', error);
      next(error);
    }
  }
};

/**
 * Verify a JWT token and extract user data
 * @param token JWT token to verify
 * @param ipAddress Current IP address of the user
 * @returns User data from the token
 */
export const verifyToken = (token: string, ipAddress?: string): AuthUser => {
  try {
    const secret = process.env.JWT_SECRET || 'ryzer-wallet-secret';
    const decoded = jwt.verify(token, secret) as AuthUser;
    
    // Ensure the roles property exists
    if (!decoded.roles) {
      decoded.roles = decoded.isAdmin ? [UserRole.ADMIN] : [UserRole.USER];
    }
    
    // Check for IP address change if configured to do so
    if (process.env.ENFORCE_IP_CHECK === 'true' && 
        decoded.ipAddress && 
        ipAddress && 
        decoded.ipAddress !== ipAddress) {
      logger.warn(`IP address mismatch for user ${decoded.walletAddress}: ${decoded.ipAddress} vs ${ipAddress}`);
      
      // Create audit log for suspicious activity
      const suspiciousActivityLog: Omit<AuditLog, "id" | "timestamp"> = {
        action: 'suspicious_activity',
        userId: decoded.walletAddress,
        performedBy: decoded.walletAddress,
        category: 'security',
        status: 'failure',
        targetId: decoded.walletAddress,
        targetType: 'user',
        sessionId: decoded.sessionId,
        ipAddress: ipAddress,
        details: {
          reason: 'ip_address_change',
          originalIp: decoded.ipAddress,
          newIp: ipAddress
        }
      };
      
      createAuditLog(suspiciousActivityLog).catch(error => {
        logger.error('Error creating suspicious activity audit log:', error);
      });
      
      // Optionally throw an error to invalidate the session
      if (process.env.STRICT_IP_ENFORCEMENT === 'true') {
        throw new ApiError(401, 'Session invalidated due to IP address change');
      }
    }
    
    return decoded;
  } catch (error) {
    logger.error('Error verifying token:', error);
    throw new ApiError(401, 'Invalid or expired token');
  }
};

/**
 * Middleware to check if user has required role
 * @param requiredRoles Array of allowed roles
 */
export const authorize = (requiredRoles: UserRole[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new ApiError(401, 'Authentication required');
      }
      
      // Check if user has any of the required roles
      const hasRequiredRole = requiredRoles.some(role => 
        req.user?.roles?.includes(role)
      );
      
      if (!hasRequiredRole) {
        // Create audit log for unauthorized access attempt
        const unauthorizedLog: Omit<AuditLog, "id" | "timestamp"> = {
          action: 'unauthorized_access',
          userId: req.user.walletAddress,
          performedBy: req.user.walletAddress,
          category: 'auth',
          status: 'failure',
          targetId: req.originalUrl,
          targetType: 'endpoint',
          sessionId: req.user.sessionId,
          ipAddress: req.ip,
          details: {
            requiredRoles,
            userRoles: req.user.roles,
            method: req.method
          }
        };
        
        createAuditLog(unauthorizedLog).catch(error => {
          logger.error('Error creating unauthorized access audit log:', error);
        });
        
        throw new ApiError(403, 'Insufficient permissions');
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to check if user has specific permission
 * @param permission Required permission
 */
export const requirePermission = (permission: import('../services/rbac').Permission) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new ApiError(401, 'Authentication required');
      }
      
      // Import the RBAC service
      const { hasPermission } = await import('../services/rbac');
      
      // Get the wallet address from the request if it exists
      const walletAddress = req.params.walletAddress || req.body.walletAddress;
      
      // Check if user has the required permission
      const permitted = await hasPermission(req.user.walletAddress, permission, walletAddress);
      
      if (!permitted) {
        // Create audit log for permission denied
        const permissionDeniedLog: Omit<AuditLog, "id" | "timestamp"> = {
          action: 'permission_denied',
          userId: req.user.walletAddress,
          performedBy: req.user.walletAddress,
          category: 'auth',
          status: 'failure',
          targetId: req.originalUrl,
          targetType: 'endpoint',
          sessionId: req.user.sessionId,
          ipAddress: req.ip,
          details: {
            requiredPermission: permission,
            method: req.method,
            walletAddress
          }
        };
        
        createAuditLog(permissionDeniedLog).catch(error => {
          logger.error('Error creating permission denied audit log:', error);
        });
        
        throw new ApiError(403, 'Permission denied');
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};
