import { ethers } from 'ethers';
import { logger } from '../utils/logger';
import { teeService } from './tee/teeService';
import { tssService } from './tss/tssService';
import { militaryGradeEncryption } from './security/militaryGradeEncryption';
import { mfaService } from './security/mfaService';
import { intrusionDetectionService } from './security/intrusionDetection';

// Contract ABIs and addresses
import RyzerWalletMilitaryGradeImplABI from '../../contracts/abis/RyzerWalletMilitaryGradeImpl.json';

/**
 * Security level enum matching the contract definition
 */
export enum SecurityLevel {
  STANDARD = 0,
  HIGH = 1,
  MILITARY = 2
}

/**
 * Military-grade wallet configuration
 */
export interface MilitaryGradeWalletConfig {
  securityLevel: SecurityLevel;
  mfaRequired: boolean;
  backupFrequency: number;
  lastBackup: number;
  anomalyDetectionEnabled: boolean;
  autoLockThreshold: number; // Represented as basis points (e.g., 7000 = 0.7)
  geofencingEnabled: boolean;
  allowedCountriesHash: string;
  biometricRequired: boolean;
  hardwareKeyRequired: boolean;
}

/**
 * Access policy for military-grade wallets
 */
export interface AccessPolicy {
  allowedIPsHash: string;
  allowedTimeWindowStart: number;
  allowedTimeWindowEnd: number;
  allowedGeolocationsHash: string;
  maxTransactionAmount: string;
  requireMFA: boolean;
  allowedDevicesHash: string;
  cooldownPeriod: number;
  lastAccessed: number;
}

/**
 * Security audit record
 */
export interface SecurityAudit {
  timestamp: number;
  action: string;
  userId: number;
  ipAddressHash: string;
  deviceIdHash: string;
  success: boolean;
  riskScore: number; // Represented as basis points (e.g., 100 = 0.01)
  details: string;
}

/**
 * TEE attestation data
 */
export interface TEEAttestation {
  attestationHash: string;
  timestamp: number;
  signature: string;
  verified: boolean;
}

/**
 * TSS configuration
 */
export interface TSSConfig {
  threshold: number;
  totalShares: number;
  sharesHash: string;
}

/**
 * Intrusion detection state
 */
export interface IntrusionDetection {
  anomalyScore: number; // Represented as basis points (e.g., 7000 = 0.7)
  lastDetectionTime: number;
  locked: boolean;
  lockExpiry: number;
}

/**
 * Military-Grade Security Service
 * 
 * This service interacts with the RyzerWalletMilitaryGradeImpl contract to manage
 * military-grade security features for wallets.
 */
export class MilitaryGradeSecurityService {
  private static instance: MilitaryGradeSecurityService;
  private provider: ethers.providers.Provider;
  private signer: ethers.Signer;
  private contract: ethers.Contract;
  private contractAddress: string;
  
  private constructor() {
    // Initialize provider and signer
    this.provider = new ethers.providers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
    this.signer = new ethers.Wallet(process.env.MILITARY_GRADE_PRIVATE_KEY as string, this.provider);
    this.contractAddress = process.env.MILITARY_GRADE_CONTRACT_ADDRESS as string;
    
    // Initialize contract
    this.contract = new ethers.Contract(
      this.contractAddress,
      RyzerWalletMilitaryGradeImplABI,
      this.signer
    );
    
    logger.info('MilitaryGradeSecurityService initialized');
  }
  
  /**
   * Get the singleton instance of MilitaryGradeSecurityService
   */
  public static getInstance(): MilitaryGradeSecurityService {
    if (!MilitaryGradeSecurityService.instance) {
      MilitaryGradeSecurityService.instance = new MilitaryGradeSecurityService();
    }
    return MilitaryGradeSecurityService.instance;
  }
  
  /**
   * Create a new military-grade wallet
   * @param userId User identifier
   * @param securityLevel Security level (STANDARD, HIGH, MILITARY)
   * @param ipAddress IP address
   * @param deviceId Device ID
   * @param geoLocation Geolocation
   * @returns The address of the created wallet and its security configuration
   */
  public async createMilitaryGradeWallet(
    userId: string,
    securityLevel: SecurityLevel,
    ipAddress: string,
    deviceId: string,
    geoLocation?: string
  ): Promise<{ address: string; securityConfig: MilitaryGradeWalletConfig }> {
    try {
      logger.info(`Creating military-grade wallet for user ${userId} with security level ${securityLevel}`);
      
      // Check if operation is allowed by intrusion detection
      const operationAllowed = intrusionDetectionService.isOperationAllowed(
        userId,
        'create_military_wallet',
        { securityLevel, ipAddress, deviceId, geoLocation }
      );
      
      if (!operationAllowed.allowed) {
        logger.error(`Operation not allowed: ${operationAllowed.reason}`);
        throw new Error(`Operation not allowed: ${operationAllowed.reason}`);
      }
      
      // Generate hashes for security parameters
      const ipAddressHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(ipAddress));
      const deviceIdHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(deviceId));
      const geoLocationHash = geoLocation 
        ? ethers.utils.keccak256(ethers.utils.toUtf8Bytes(geoLocation))
        : ethers.constants.HashZero;
      
      // Initialize TEE and TSS services if security level is MILITARY
      if (securityLevel === SecurityLevel.MILITARY) {
        await teeService.initialize();
        await tssService.initialize();
      }
      
      // Call the contract to create the wallet
      const tx = await this.contract.createMilitaryGradeWallet(
        userId,
        securityLevel,
        ipAddressHash,
        deviceIdHash,
        geoLocationHash
      );
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      
      // Extract wallet address from event logs
      const event = receipt.events?.find(e => e.event === 'MilitaryGradeWalletCreated');
      if (!event) {
        throw new Error('Failed to extract wallet address from transaction receipt');
      }
      
      const walletAddress = event.args.wallet;
      
      // Get the wallet configuration from the contract
      const securityConfig = await this.getWalletSecurityConfig(walletAddress);
      
      // Record successful operation
      intrusionDetectionService.recordSuccessfulAuthentication(userId, ipAddress, deviceId, geoLocation);
      
      logger.info(`Military-grade wallet created successfully: ${walletAddress}`);
      return { address: walletAddress, securityConfig };
    } catch (error) {
      logger.error('Failed to create military-grade wallet:', error);
      
      // Record failed operation
      intrusionDetectionService.recordFailedAuthentication(userId, ipAddress, deviceId, geoLocation);
      
      throw error;
    }
  }
  
  /**
   * Verify a security operation with military-grade checks
   * @param walletAddress The wallet address
   * @param operationType The type of operation being performed
   * @param userId User identifier
   * @param ipAddress IP address
   * @param deviceId Device ID
   * @param geoLocation Geolocation
   * @param mfaVerified Whether MFA has been verified
   * @param biometricVerified Whether biometric verification has been completed
   * @param hardwareKeyVerified Whether hardware key verification has been completed
   * @returns Whether the operation is allowed
   */
  public async verifySecurityOperation(
    walletAddress: string,
    operationType: string,
    userId: string,
    ipAddress: string,
    deviceId: string,
    geoLocation?: string,
    mfaVerified: boolean = false,
    biometricVerified: boolean = false,
    hardwareKeyVerified: boolean = false
  ): Promise<boolean> {
    try {
      logger.info(`Verifying security operation ${operationType} for wallet ${walletAddress}`);
      
      // Check if operation is allowed by intrusion detection
      const operationAllowed = intrusionDetectionService.isOperationAllowed(
        userId,
        operationType,
        { walletAddress, ipAddress, deviceId, geoLocation }
      );
      
      if (!operationAllowed.allowed) {
        logger.error(`Operation not allowed: ${operationAllowed.reason}`);
        throw new Error(`Operation not allowed: ${operationAllowed.reason}`);
      }
      
      // Generate hashes for security parameters
      const ipAddressHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(ipAddress));
      const deviceIdHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(deviceId));
      const geoLocationHash = geoLocation 
        ? ethers.utils.keccak256(ethers.utils.toUtf8Bytes(geoLocation))
        : ethers.constants.HashZero;
      
      // Call the contract to verify the operation
      const isAllowed = await this.contract.verifySecurityOperation(
        walletAddress,
        operationType,
        ipAddressHash,
        deviceIdHash,
        geoLocationHash,
        mfaVerified,
        biometricVerified,
        hardwareKeyVerified
      );
      
      if (isAllowed) {
        // Record successful operation
        intrusionDetectionService.recordSuccessfulAuthentication(userId, ipAddress, deviceId, geoLocation);
        
        // Record security audit
        await this.recordSecurityAudit(
          walletAddress,
          operationType,
          userId,
          ipAddress,
          deviceId,
          true,
          operationAllowed.anomalyScore,
          JSON.stringify({ mfaVerified, biometricVerified, hardwareKeyVerified })
        );
        
        logger.info(`Security operation ${operationType} verified successfully for wallet ${walletAddress}`);
      } else {
        // Record failed operation
        intrusionDetectionService.recordFailedAuthentication(userId, ipAddress, deviceId, geoLocation);
        
        // Record security audit
        await this.recordSecurityAudit(
          walletAddress,
          operationType,
          userId,
          ipAddress,
          deviceId,
          false,
          operationAllowed.anomalyScore,
          JSON.stringify({ mfaVerified, biometricVerified, hardwareKeyVerified })
        );
        
        logger.error(`Security operation ${operationType} verification failed for wallet ${walletAddress}`);
      }
      
      return isAllowed;
    } catch (error) {
      logger.error(`Failed to verify security operation ${operationType}:`, error);
      
      // Record failed operation
      intrusionDetectionService.recordFailedAuthentication(userId, ipAddress, deviceId, geoLocation);
      
      throw error;
    }
  }
  
  /**
   * Record a security audit event
   * @param walletAddress The wallet address
   * @param action The action being performed
   * @param userId User identifier
   * @param ipAddress IP address
   * @param deviceId Device ID
   * @param success Whether the action was successful
   * @param riskScore The risk score (in basis points)
   * @param details Additional details about the action
   */
  public async recordSecurityAudit(
    walletAddress: string,
    action: string,
    userId: string,
    ipAddress: string,
    deviceId: string,
    success: boolean,
    riskScore: number,
    details: string
  ): Promise<void> {
    try {
      logger.info(`Recording security audit for wallet ${walletAddress}: ${action}`);
      
      // Generate hashes for security parameters
      const ipAddressHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(ipAddress));
      const deviceIdHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(deviceId));
      
      // Call the contract to record the audit
      const tx = await this.contract.recordSecurityAudit(
        walletAddress,
        action,
        userId,
        ipAddressHash,
        deviceIdHash,
        success,
        riskScore,
        ethers.utils.toUtf8Bytes(details)
      );
      
      // Wait for transaction to be mined
      await tx.wait();
      
      logger.info(`Security audit recorded successfully for wallet ${walletAddress}`);
    } catch (error) {
      logger.error('Failed to record security audit:', error);
      throw error;
    }
  }
  
  /**
   * Update the anomaly score for intrusion detection
   * @param walletAddress The wallet address
   * @param anomalyScore The new anomaly score (in basis points)
   * @param lock Whether to lock the wallet
   * @param lockDuration The duration of the lock (in seconds)
   */
  public async updateAnomalyScore(
    walletAddress: string,
    anomalyScore: number,
    lock: boolean,
    lockDuration: number
  ): Promise<void> {
    try {
      logger.info(`Updating anomaly score for wallet ${walletAddress}: ${anomalyScore}`);
      
      // Call the contract to update the anomaly score
      const tx = await this.contract.updateAnomalyScore(
        walletAddress,
        anomalyScore,
        lock,
        lockDuration
      );
      
      // Wait for transaction to be mined
      await tx.wait();
      
      logger.info(`Anomaly score updated successfully for wallet ${walletAddress}`);
    } catch (error) {
      logger.error('Failed to update anomaly score:', error);
      throw error;
    }
  }
  
  /**
   * Unlock a wallet that was locked due to anomaly detection
   * @param walletAddress The wallet address
   */
  public async unlockWallet(walletAddress: string): Promise<void> {
    try {
      logger.info(`Unlocking wallet ${walletAddress}`);
      
      // Call the contract to unlock the wallet
      const tx = await this.contract.unlockWallet(walletAddress);
      
      // Wait for transaction to be mined
      await tx.wait();
      
      logger.info(`Wallet ${walletAddress} unlocked successfully`);
    } catch (error) {
      logger.error('Failed to unlock wallet:', error);
      throw error;
    }
  }
  
  /**
   * Set emergency lockdown status for a wallet
   * @param walletAddress The wallet address
   * @param enabled Whether to enable or disable emergency lockdown
   */
  public async setEmergencyLockdown(walletAddress: string, enabled: boolean): Promise<void> {
    try {
      logger.info(`Setting emergency lockdown for wallet ${walletAddress}: ${enabled}`);
      
      // Call the contract to set emergency lockdown
      const tx = await this.contract.setEmergencyLockdown(walletAddress, enabled);
      
      // Wait for transaction to be mined
      await tx.wait();
      
      logger.info(`Emergency lockdown set successfully for wallet ${walletAddress}: ${enabled}`);
    } catch (error) {
      logger.error('Failed to set emergency lockdown:', error);
      throw error;
    }
  }
  
  /**
   * Update the military-grade security configuration for a wallet
   * @param walletAddress The wallet address
   * @param config The new security configuration
   */
  public async updateSecurityConfig(
    walletAddress: string,
    config: MilitaryGradeWalletConfig
  ): Promise<void> {
    try {
      logger.info(`Updating security configuration for wallet ${walletAddress}`);
      
      // Call the contract to update the security configuration
      const tx = await this.contract.updateSecurityConfig(walletAddress, config);
      
      // Wait for transaction to be mined
      await tx.wait();
      
      logger.info(`Security configuration updated successfully for wallet ${walletAddress}`);
    } catch (error) {
      logger.error('Failed to update security configuration:', error);
      throw error;
    }
  }
  
  /**
   * Update the access policy for a wallet
   * @param walletAddress The wallet address
   * @param policy The new access policy
   */
  public async updateAccessPolicy(
    walletAddress: string,
    policy: AccessPolicy
  ): Promise<void> {
    try {
      logger.info(`Updating access policy for wallet ${walletAddress}`);
      
      // Call the contract to update the access policy
      const tx = await this.contract.updateAccessPolicy(walletAddress, policy);
      
      // Wait for transaction to be mined
      await tx.wait();
      
      logger.info(`Access policy updated successfully for wallet ${walletAddress}`);
    } catch (error) {
      logger.error('Failed to update access policy:', error);
      throw error;
    }
  }
  
  /**
   * Register TEE attestation for a wallet
   * @param walletAddress The wallet address
   * @param attestationData Attestation data from the TEE
   */
  public async registerTEEAttestation(
    walletAddress: string,
    attestationData: string
  ): Promise<void> {
    try {
      logger.info(`Registering TEE attestation for wallet ${walletAddress}`);
      
      // Generate attestation hash
      const attestationHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(attestationData));
      
      // Sign the attestation hash with the TEE
      const signature = await teeService.signMessage(walletAddress, attestationHash);
      
      // Verify the attestation
      const verified = await teeService.verifyAttestation(walletAddress, attestationHash, signature);
      
      // Call the contract to register the attestation
      const tx = await this.contract.registerTEEAttestation(
        walletAddress,
        attestationHash,
        signature,
        verified
      );
      
      // Wait for transaction to be mined
      await tx.wait();
      
      logger.info(`TEE attestation registered successfully for wallet ${walletAddress}`);
    } catch (error) {
      logger.error('Failed to register TEE attestation:', error);
      throw error;
    }
  }
  
  /**
   * Configure TSS for a wallet
   * @param walletAddress The wallet address
   * @param threshold The threshold number of shares needed
   * @param totalShares The total number of shares
   */
  public async configureTSS(
    walletAddress: string,
    threshold: number,
    totalShares: number
  ): Promise<void> {
    try {
      logger.info(`Configuring TSS for wallet ${walletAddress}: ${threshold}/${totalShares}`);
      
      // Generate a distributed key with the TSS service
      await tssService.generateDistributedKey(walletAddress, threshold, totalShares);
      
      // Get the shares hash
      const sharesHash = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes(`${walletAddress}:${threshold}:${totalShares}:${Date.now()}`)
      );
      
      // Call the contract to configure TSS
      const tx = await this.contract.configureTSS(
        walletAddress,
        threshold,
        totalShares,
        sharesHash
      );
      
      // Wait for transaction to be mined
      await tx.wait();
      
      logger.info(`TSS configured successfully for wallet ${walletAddress}`);
    } catch (error) {
      logger.error('Failed to configure TSS:', error);
      throw error;
    }
  }
  
  /**
   * Get the wallet security configuration
   * @param walletAddress The wallet address
   * @returns The security configuration
   */
  public async getWalletSecurityConfig(walletAddress: string): Promise<MilitaryGradeWalletConfig> {
    try {
      logger.info(`Getting security configuration for wallet ${walletAddress}`);
      
      // Call the contract to get the security configuration
      const config = await this.contract.militaryGradeConfigs(walletAddress);
      
      return {
        securityLevel: config.securityLevel,
        mfaRequired: config.mfaRequired,
        backupFrequency: config.backupFrequency.toNumber(),
        lastBackup: config.lastBackup.toNumber(),
        anomalyDetectionEnabled: config.anomalyDetectionEnabled,
        autoLockThreshold: config.autoLockThreshold.toNumber(),
        geofencingEnabled: config.geofencingEnabled,
        allowedCountriesHash: config.allowedCountriesHash,
        biometricRequired: config.biometricRequired,
        hardwareKeyRequired: config.hardwareKeyRequired
      };
    } catch (error) {
      logger.error('Failed to get wallet security configuration:', error);
      throw error;
    }
  }
  
  /**
   * Get the wallet access policy
   * @param walletAddress The wallet address
   * @returns The access policy
   */
  public async getWalletAccessPolicy(walletAddress: string): Promise<AccessPolicy> {
    try {
      logger.info(`Getting access policy for wallet ${walletAddress}`);
      
      // Call the contract to get the access policy
      const policy = await this.contract.accessPolicies(walletAddress);
      
      return {
        allowedIPsHash: policy.allowedIPsHash,
        allowedTimeWindowStart: policy.allowedTimeWindowStart.toNumber(),
        allowedTimeWindowEnd: policy.allowedTimeWindowEnd.toNumber(),
        allowedGeolocationsHash: policy.allowedGeolocationsHash,
        maxTransactionAmount: policy.maxTransactionAmount.toString(),
        requireMFA: policy.requireMFA,
        allowedDevicesHash: policy.allowedDevicesHash,
        cooldownPeriod: policy.cooldownPeriod.toNumber(),
        lastAccessed: policy.lastAccessed.toNumber()
      };
    } catch (error) {
      logger.error('Failed to get wallet access policy:', error);
      throw error;
    }
  }
  
  /**
   * Get the wallet intrusion detection state
   * @param walletAddress The wallet address
   * @returns The intrusion detection state
   */
  public async getWalletIntrusionDetection(walletAddress: string): Promise<IntrusionDetection> {
    try {
      logger.info(`Getting intrusion detection state for wallet ${walletAddress}`);
      
      // Call the contract to get the intrusion detection state
      const detection = await this.contract.intrusionDetection(walletAddress);
      
      return {
        anomalyScore: detection.anomalyScore.toNumber(),
        lastDetectionTime: detection.lastDetectionTime.toNumber(),
        locked: detection.locked,
        lockExpiry: detection.lockExpiry.toNumber()
      };
    } catch (error) {
      logger.error('Failed to get wallet intrusion detection state:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const militaryGradeSecurityService = MilitaryGradeSecurityService.getInstance();
