
import { ethers } from 'ethers';
import { logger } from '../utils/logger';
import { teeService } from './tee/teeService';
import { tssService } from './tss/tssService';
import { intrusionDetection } from './security/intrusionDetection';
import { militaryGradeEncryption } from './security/militaryGradeEncryption';
import { mfaService } from './security/mfaService';
import { 
  SecurityLevel, 
  MilitaryGradeWalletConfig, 
  AccessPolicy, 
  SecurityAudit,
  SecurityEventType 
} from '../types/security';

/**
 * Military-Grade Wallet Security Service
 * 
 * This service combines TEE, TSS, military-grade encryption, multi-factor authentication,
 * and intrusion detection to provide comprehensive military-grade security for wallet operations.
 * It manages the lifecycle of secure wallets, including creation, signing, recovery, and protection
 * against various attack vectors.
 */
export class WalletSecurityService {
  private static instance: WalletSecurityService;
  private isInitialized: boolean = false;
  
  // Maps to track wallet types and relationships
  private walletTypes: Map<string, 'tee' | 'tss' | 'military'> = new Map();
  private userWallets: Map<string, string[]> = new Map(); // userId -> walletIds[]
  private tssWalletInfo: Map<string, { threshold: number, totalShares: number }> = new Map();
  
  // Military-grade security properties
  private securityLevels: Map<string, SecurityLevel> = new Map(); // walletId -> security level
  private encryptedBackups: Map<string, string> = new Map(); // walletId -> encrypted backup
  private accessPolicies: Map<string, AccessPolicy> = new Map(); // walletId -> access policy
  private securityAudits: Map<string, SecurityAudit[]> = new Map(); // walletId -> security audits
  private emergencyLockdownEnabled: Map<string, boolean> = new Map(); // walletId -> lockdown status

  private constructor() {}

  /**
   * Get the singleton instance of WalletSecurityService
   */
  public static getInstance(): WalletSecurityService {
    if (!WalletSecurityService.instance) {
      WalletSecurityService.instance = new WalletSecurityService();
    }
    return WalletSecurityService.instance;
  }

  /**
   * Initialize the wallet security service
   */
  public async initialize(): Promise<boolean> {
    try {
      if (this.isInitialized) {
        return true;
      }

      logger.info('Initializing military-grade wallet security service');
      
      // Initialize TEE service
      const teeInitialized = await teeService.initialize();
      if (!teeInitialized) {
        throw new Error('Failed to initialize TEE service');
      }
      
      // Initialize TSS service
      const tssInitialized = await tssService.initialize();
      if (!tssInitialized) {
        throw new Error('Failed to initialize TSS service');
      }
      
      // Initialize intrusion detection
      intrusionDetection.resetAnomalyScore('system');
      
      this.isInitialized = true;
      logger.info('Military-grade wallet security service initialized successfully');
      return true;
    } catch (error) {
      logger.error('Failed to initialize military-grade wallet security service:', error);
      return false;
    }
  }

  /**
   * Create a new secure wallet using TEE
   * @param userId User identifier
   * @returns Wallet address
   */
  public async createTEEWallet(userId: string): Promise<string> {
    this.ensureInitialized();
    
    try {
      // Generate a new key pair within the TEE
      const walletAddress = await teeService.generateKeyPair(userId);
      
      // Track the wallet type
      this.walletTypes.set(walletAddress, 'tee');
      
      // Associate wallet with user
      this.addWalletToUser(userId, walletAddress);
      
      logger.info(`Created TEE wallet ${walletAddress} for user ${userId}`);
      return walletAddress;
    } catch (error) {
      logger.error(`Failed to create TEE wallet for user ${userId}:`, error);
      throw new Error('Failed to create TEE wallet');
    }
  }
  
  /**
   * Create a new military-grade secure wallet
   * @param userId User identifier
   * @param ipAddress IP address of the request
   * @param deviceId Device identifier
   * @param geoLocation Geographic location
   * @returns Wallet address and security configuration
   */
  public async createMilitaryGradeWallet(
    userId: string,
    ipAddress: string,
    deviceId: string,
    geoLocation?: string
  ): Promise<{ address: string; securityConfig: MilitaryGradeWalletConfig }> {
    this.ensureInitialized();
    
    try {
      // Check for intrusion or suspicious activity
      const securityCheck = intrusionDetection.isOperationAllowed(
        userId,
        'key_export',
        { operation: 'create_military_wallet', deviceId }
      );
      
      if (!securityCheck.allowed) {
        throw new Error(`Security check failed: ${securityCheck.reason}`);
      }
      
      // 1. Generate a wallet using TEE for secure key generation
      const teeWalletAddress = await teeService.generateKeyPair(userId);
      
      // 2. Create a distributed key with TSS for backup and recovery
      const tssWalletId = `military-${userId}-${Date.now()}`;
      const threshold = 3; // Require 3 shares for reconstruction
      const totalShares = 5; // Generate 5 total shares
      await tssService.generateDistributedKey(tssWalletId, threshold, totalShares);
      
      // 3. Create a secure backup encrypted with military-grade encryption
      const backupData = {
        teeWalletAddress,
        tssWalletId,
        createdAt: Date.now(),
        userId
      };
      
      const encryptedBackup = militaryGradeEncryption.encrypt(
        JSON.stringify(backupData),
        `military:${userId}:${teeWalletAddress}`
      );
      
      // 4. Store the encrypted backup
      this.encryptedBackups.set(teeWalletAddress, encryptedBackup);
      
      // 5. Set up MFA for the wallet
      const mfaSession = mfaService.startMFASession(
        userId,
        'key_export',
        { walletAddress: teeWalletAddress },
        ipAddress
      );
      
      // 6. Configure security settings
      const securityConfig: MilitaryGradeWalletConfig = {
        securityLevel: SecurityLevel.MILITARY,
        mfaRequired: true,
        backupFrequency: 24 * 60 * 60 * 1000, // Daily backups
        lastBackup: Date.now(),
        anomalyDetectionEnabled: true,
        autoLockThreshold: 0.7, // Lock wallet if risk score exceeds 0.7
        geofencingEnabled: true,
        allowedCountries: geoLocation ? [geoLocation] : [],
        biometricRequired: true,
        hardwareKeyRequired: true
      };
      
      // 7. Set up access policy
      const accessPolicy: AccessPolicy = {
        allowedIPs: [ipAddress],
        allowedTimeWindows: [{ start: 0, end: 24 * 60 * 60 * 1000 }], // 24 hours initially
        allowedGeolocations: geoLocation ? [geoLocation] : [],
        maxTransactionAmount: '10.0', // 10 ETH initial limit
        requireMFA: true,
        allowedDevices: [deviceId],
        cooldownPeriod: 60 * 60 * 1000, // 1 hour cooldown between high-value transactions
        lastAccessed: Date.now()
      };
      
      // 8. Create initial security audit record
      const securityAudit: SecurityAudit = {
        timestamp: Date.now(),
        action: 'create_military_wallet',
        userId,
        ipAddress,
        deviceId,
        success: true,
        riskScore: 0.1, // Low initial risk score
        details: {
          walletAddress: teeWalletAddress,
          securityLevel: SecurityLevel.MILITARY
        }
      };
      
      // 9. Store all security configurations
      this.walletTypes.set(teeWalletAddress, 'military');
      this.addWalletToUser(userId, teeWalletAddress);
      this.securityLevels.set(teeWalletAddress, SecurityLevel.MILITARY);
      this.accessPolicies.set(teeWalletAddress, accessPolicy);
      this.securityAudits.set(teeWalletAddress, [securityAudit]);
      this.emergencyLockdownEnabled.set(teeWalletAddress, false);
      
      // 10. Record successful creation in intrusion detection system
      intrusionDetection.recordEvent(
        userId,
        SecurityEventType.SUCCESSFUL_AUTH,
        { walletAddress: teeWalletAddress, operation: 'create_military_wallet' },
        ipAddress
      );
      
      logger.info(`Created military-grade wallet ${teeWalletAddress} for user ${userId}`);
      return { address: teeWalletAddress, securityConfig };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to create military-grade wallet for user ${userId}:`, error);
      
      // Record failure in intrusion detection system
      intrusionDetection.recordEvent(
        userId,
        SecurityEventType.FAILED_AUTH,
        { operation: 'create_military_wallet', error: errorMessage }
      );
      
      throw new Error('Failed to create military-grade wallet: ' + errorMessage);
    }
  }

  /**
   * Create a new distributed wallet using TSS
   * @param userId User identifier
   * @param threshold Minimum number of shares needed
   * @param totalShares Total number of shares to generate
   * @returns Wallet address
   */
  public async createTSSWallet(
    userId: string,
    threshold: number,
    totalShares: number
  ): Promise<string> {
    this.ensureInitialized();
    
    try {
      // Generate a unique wallet ID
      const walletId = `tss-${userId}-${Date.now()}`;
      
      // Generate a distributed key
      const walletAddress = await tssService.generateDistributedKey(walletId, threshold, totalShares);
      
      // Track the wallet type
      this.walletTypes.set(walletAddress, 'tss');
      
      // Associate wallet with user
      this.addWalletToUser(userId, walletAddress);
      
      // Store TSS wallet info
      this.tssWalletInfo.set(walletAddress, { threshold, totalShares });
      
      logger.info(`Created TSS wallet ${walletAddress} for user ${userId} with threshold ${threshold}/${totalShares}`);
      return walletAddress;
    } catch (error) {
      logger.error(`Failed to create TSS wallet for user ${userId}:`, error);
      throw new Error('Failed to create TSS wallet');
    }
  }

  /**
   * Sign a message using a secure wallet
   * @param userId User identifier
   * @param walletAddress Wallet address
   * @param message Message to sign
   * @param shareIndexes (Optional) Indexes of shares to use for TSS wallets
   * @returns Signature
   */
  public async signMessage(
    userId: string,
    walletAddress: string,
    message: string,
    shareIndexes?: number[]
  ): Promise<string> {
    this.ensureInitialized();
    
    try {
      // Verify the wallet belongs to the user
      this.verifyWalletOwnership(userId, walletAddress);
      
      // Get wallet type
      const walletType = this.walletTypes.get(walletAddress);
      if (!walletType) {
        throw new Error('Wallet not found');
      }
      
      // Sign using the appropriate method
      if (walletType === 'tee') {
        return await teeService.signMessage(userId, message);
      } else if (walletType === 'tss') {
        // For TSS wallets, we need share indexes
        if (!shareIndexes || shareIndexes.length === 0) {
          throw new Error('Share indexes required for TSS wallet');
        }
        
        // Get the wallet ID from the address (in a real implementation, this would be stored)
        const walletId = `tss-${userId}-${walletAddress}`;
        
        return await tssService.signMessage(walletId, message, shareIndexes);
      } else {
        throw new Error('Unknown wallet type');
      }
    } catch (error) {
      logger.error(`Failed to sign message for wallet ${walletAddress}:`, error);
      throw new Error('Failed to sign message');
    }
  }

  /**
   * Sign a transaction using a secure wallet
   * @param userId User identifier
   * @param walletAddress Wallet address
   * @param transaction Transaction data
   * @param shareIndexes (Optional) Indexes of shares to use for TSS wallets
   * @returns Signed transaction
   */
  public async signTransaction(
    userId: string,
    walletAddress: string,
    transaction: ethers.TransactionRequest,
    shareIndexes?: number[]
  ): Promise<string> {
    this.ensureInitialized();
    
    try {
      // Verify the wallet belongs to the user
      this.verifyWalletOwnership(userId, walletAddress);
      
      // Get wallet type
      const walletType = this.walletTypes.get(walletAddress);
      if (!walletType) {
        throw new Error('Wallet not found');
      }
      
      // Sign using the appropriate method
      if (walletType === 'tee') {
        return await teeService.signTransaction(userId, transaction);
      } else if (walletType === 'tss') {
        // For TSS wallets, we need share indexes
        if (!shareIndexes || shareIndexes.length === 0) {
          throw new Error('Share indexes required for TSS wallet');
        }
        
        // Get the wallet ID from the address (in a real implementation, this would be stored)
        const walletId = `tss-${userId}-${walletAddress}`;
        
        return await tssService.signTransaction(walletId, transaction, shareIndexes);
      } else {
        throw new Error('Unknown wallet type');
      }
    } catch (error) {
      logger.error(`Failed to sign transaction for wallet ${walletAddress}:`, error);
      throw new Error('Failed to sign transaction');
    }
  }

  /**
   * Get wallet information
   * @param userId User identifier
   * @param walletAddress Wallet address
   * @returns Wallet information
   */
  public getWalletInfo(userId: string, walletAddress: string): {
    type: 'tee' | 'tss';
    threshold?: number;
    totalShares?: number;
  } {
    this.ensureInitialized();
    
    // Verify the wallet belongs to the user
    this.verifyWalletOwnership(userId, walletAddress);
    
    // Get wallet type
    const walletType = this.walletTypes.get(walletAddress);
    if (!walletType) {
      throw new Error('Wallet not found');
    }
    
    if (walletType === 'tee') {
      return { type: 'tee' };
    } else if (walletType === 'tss') {
      const tssInfo = this.tssWalletInfo.get(walletAddress);
      if (!tssInfo) {
        throw new Error('TSS wallet info not found');
      }
      
      return {
        type: 'tss',
        threshold: tssInfo.threshold,
        totalShares: tssInfo.totalShares,
      };
    } else {
      throw new Error('Unknown wallet type');
    }
  }

  /**
   * Get all wallets for a user
   * @param userId User identifier
   * @returns Array of wallet addresses
   */
  public getUserWallets(userId: string): string[] {
    this.ensureInitialized();
    
    return this.userWallets.get(userId) || [];
  }

  /**
   * Associate a wallet with a user
   * @param userId User identifier
   * @param walletAddress Wallet address
   */
  private addWalletToUser(userId: string, walletAddress: string): void {
    const userWallets = this.userWallets.get(userId) || [];
    userWallets.push(walletAddress);
    this.userWallets.set(userId, userWallets);
  }

  /**
   * Verify a wallet belongs to a user
   * @param userId User identifier
   * @param walletAddress Wallet address
   * @throws Error if the wallet doesn't belong to the user
   */
  private verifyWalletOwnership(userId: string, walletAddress: string): void {
    const userWallets = this.userWallets.get(userId) || [];
    if (!userWallets.includes(walletAddress)) {
      throw new Error('Wallet does not belong to the user');
    }
  }

  /**
   * Ensure the wallet security service is initialized before use
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Wallet security service not initialized');
    }
  }
}

// Export singleton instance
// Types for military-grade security features
enum SecurityLevel {
  STANDARD = 'standard',
  HIGH = 'high',
  MILITARY = 'military',
  CLASSIFIED = 'classified'
}

interface AccessPolicy {
  allowedIPs: string[];
  allowedTimeWindows: { start: number; end: number }[];
  allowedGeolocations: string[];
  maxTransactionAmount: string;
  requireMFA: boolean;
  allowedDevices: string[];
  cooldownPeriod: number; // in milliseconds
  lastAccessed: number;
}

interface SecurityAudit {
  timestamp: number;
  action: string;
  userId: string;
  ipAddress: string;
  deviceId: string;
  success: boolean;
  riskScore: number;
  details: any;
}

interface MilitaryGradeWalletConfig {
  securityLevel: SecurityLevel;
  mfaRequired: boolean;
  backupFrequency: number; // in milliseconds
  lastBackup: number;
  anomalyDetectionEnabled: boolean;
  autoLockThreshold: number; // risk score threshold for auto-locking
  geofencingEnabled: boolean;
  allowedCountries: string[];
  biometricRequired: boolean;
  hardwareKeyRequired: boolean;
}

type TransactionRequest = {
  to: string;
  value?: bigint | string;
  data?: string;
  gasLimit?: bigint | string;
  nonce?: number;
};

export const walletSecurityService = WalletSecurityService.getInstance();
