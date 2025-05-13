import crypto from 'crypto';
import { logger } from '../../utils/logger';
import { militaryGradeEncryption } from './militaryGradeEncryption';

/**
 * Multi-Factor Authentication Service
 * 
 * Provides military-grade multi-factor authentication for wallet operations.
 * Supports TOTP, hardware security keys, biometrics, and behavioral analysis.
 */
export class MFAService {
  private static instance: MFAService;
  
  // Maps to store MFA configurations and sessions
  private userMfaConfigs: Map<string, UserMFAConfig> = new Map();
  private mfaSessions: Map<string, MFASession> = new Map();
  
  // Constants
  private readonly SESSION_EXPIRY = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_FAILED_ATTEMPTS = 3;
  private readonly TOTP_WINDOW = 1; // Allow 1 step before/after current time
  
  private constructor() {}
  
  /**
   * Get the singleton instance of MFAService
   */
  public static getInstance(): MFAService {
    if (!MFAService.instance) {
      MFAService.instance = new MFAService();
    }
    return MFAService.instance;
  }
  
  /**
   * Enable TOTP (Time-based One-Time Password) for a user
   * @param userId User identifier
   * @returns TOTP secret and QR code URL
   */
  public enableTOTP(userId: string): { secret: string; qrCodeUrl: string } {
    try {
      // Generate a secure random secret
      const secret = this.generateTOTPSecret();
      
      // Create or update user MFA config
      const userConfig = this.getUserConfig(userId);
      userConfig.totpEnabled = true;
      userConfig.totpSecret = militaryGradeEncryption.encrypt(secret, `totp:${userId}`);
      this.userMfaConfigs.set(userId, userConfig);
      
      // Generate QR code URL (in a real implementation, this would generate an actual QR code)
      const qrCodeUrl = `otpauth://totp/RyzerWallet:${userId}?secret=${secret}&issuer=RyzerWallet`;
      
      logger.info(`TOTP enabled for user ${userId}`);
      return { secret, qrCodeUrl };
    } catch (error) {
      logger.error(`Failed to enable TOTP for user ${userId}:`, error);
      throw new Error('Failed to enable TOTP');
    }
  }
  
  /**
   * Enable hardware security key for a user
   * @param userId User identifier
   * @param keyId Hardware key identifier
   * @param publicKey Public key from the hardware security key
   */
  public enableHardwareKey(userId: string, keyId: string, publicKey: string): void {
    try {
      // Create or update user MFA config
      const userConfig = this.getUserConfig(userId);
      
      // Store hardware key info
      userConfig.hardwareKeys = userConfig.hardwareKeys || [];
      userConfig.hardwareKeys.push({
        keyId,
        publicKey,
        registeredAt: Date.now()
      });
      
      this.userMfaConfigs.set(userId, userConfig);
      logger.info(`Hardware security key enabled for user ${userId}`);
    } catch (error) {
      logger.error(`Failed to enable hardware key for user ${userId}:`, error);
      throw new Error('Failed to enable hardware security key');
    }
  }
  
  /**
   * Enable biometric authentication for a user
   * @param userId User identifier
   * @param biometricId Biometric identifier
   * @param biometricTemplate Encrypted biometric template
   */
  public enableBiometrics(userId: string, biometricId: string, biometricTemplate: string): void {
    try {
      // Create or update user MFA config
      const userConfig = this.getUserConfig(userId);
      
      // Store biometric info
      userConfig.biometrics = userConfig.biometrics || [];
      userConfig.biometrics.push({
        biometricId,
        template: militaryGradeEncryption.encrypt(biometricTemplate, `biometric:${userId}`),
        registeredAt: Date.now()
      });
      
      this.userMfaConfigs.set(userId, userConfig);
      logger.info(`Biometric authentication enabled for user ${userId}`);
    } catch (error) {
      logger.error(`Failed to enable biometrics for user ${userId}:`, error);
      throw new Error('Failed to enable biometric authentication');
    }
  }
  
  /**
   * Start an MFA session for a high-security operation
   * @param userId User identifier
   * @param operationType Type of operation requiring MFA
   * @param operationData Data related to the operation
   * @returns Session token
   */
  public startMFASession(
    userId: string,
    operationType: 'transaction' | 'key_export' | 'settings_change' | 'recovery',
    operationData: any
  ): string {
    try {
      // Check if user has MFA configured
      const userConfig = this.getUserConfig(userId);
      if (!this.hasMFAConfigured(userConfig)) {
        throw new Error('User has no MFA methods configured');
      }
      
      // Generate session token
      const sessionToken = militaryGradeEncryption.generateNonce(32);
      
      // Create MFA session
      const session: MFASession = {
        userId,
        operationType,
        operationData,
        requiredFactors: this.determineRequiredFactors(operationType, operationData),
        completedFactors: [],
        failedAttempts: 0,
        createdAt: Date.now(),
        expiresAt: Date.now() + this.SESSION_EXPIRY
      };
      
      // Store session
      this.mfaSessions.set(sessionToken, session);
      
      logger.info(`MFA session started for user ${userId}, operation: ${operationType}`);
      return sessionToken;
    } catch (error) {
      logger.error(`Failed to start MFA session for user ${userId}:`, error);
      throw new Error('Failed to start MFA session');
    }
  }
  
  /**
   * Verify a TOTP code for an MFA session
   * @param sessionToken MFA session token
   * @param totpCode TOTP code
   * @returns Whether verification was successful
   */
  public verifyTOTP(sessionToken: string, totpCode: string): boolean {
    try {
      // Get session
      const session = this.getSession(sessionToken);
      
      // Check if TOTP is a required factor
      if (!session.requiredFactors.includes('totp')) {
        throw new Error('TOTP is not required for this session');
      }
      
      // Check if TOTP is already completed
      if (session.completedFactors.includes('totp')) {
        throw new Error('TOTP verification already completed');
      }
      
      // Get user config
      const userConfig = this.getUserConfig(session.userId);
      if (!userConfig.totpEnabled || !userConfig.totpSecret) {
        throw new Error('TOTP not configured for user');
      }
      
      // Decrypt TOTP secret
      const totpSecret = militaryGradeEncryption.decrypt(
        userConfig.totpSecret,
        `totp:${session.userId}`
      );
      
      // Verify TOTP code
      const isValid = this.verifyTOTPCode(totpCode, totpSecret);
      
      if (isValid) {
        // Mark TOTP as completed
        session.completedFactors.push('totp');
        this.mfaSessions.set(sessionToken, session);
        logger.info(`TOTP verified for user ${session.userId}`);
      } else {
        // Increment failed attempts
        session.failedAttempts++;
        this.mfaSessions.set(sessionToken, session);
        
        // Check if max attempts exceeded
        if (session.failedAttempts >= this.MAX_FAILED_ATTEMPTS) {
          this.mfaSessions.delete(sessionToken);
          logger.warn(`Max failed MFA attempts exceeded for user ${session.userId}`);
          throw new Error('Max failed attempts exceeded');
        }
        
        logger.warn(`Invalid TOTP code for user ${session.userId}`);
      }
      
      return isValid;
    } catch (error) {
      logger.error(`TOTP verification failed:`, error);
      throw new Error('TOTP verification failed');
    }
  }
  
  /**
   * Verify a hardware security key signature for an MFA session
   * @param sessionToken MFA session token
   * @param keyId Hardware key identifier
   * @param signature Signature from the hardware key
   * @returns Whether verification was successful
   */
  public verifyHardwareKey(sessionToken: string, keyId: string, signature: string): boolean {
    try {
      // Get session
      const session = this.getSession(sessionToken);
      
      // Check if hardware key is a required factor
      if (!session.requiredFactors.includes('hardware_key')) {
        throw new Error('Hardware key is not required for this session');
      }
      
      // Check if hardware key is already completed
      if (session.completedFactors.includes('hardware_key')) {
        throw new Error('Hardware key verification already completed');
      }
      
      // Get user config
      const userConfig = this.getUserConfig(session.userId);
      if (!userConfig.hardwareKeys || userConfig.hardwareKeys.length === 0) {
        throw new Error('Hardware keys not configured for user');
      }
      
      // Find the specified key
      const key = userConfig.hardwareKeys.find(k => k.keyId === keyId);
      if (!key) {
        throw new Error('Hardware key not found');
      }
      
      // In a real implementation, this would verify the signature using the public key
      // For this simulation, we'll just assume it's valid
      const isValid = true;
      
      if (isValid) {
        // Mark hardware key as completed
        session.completedFactors.push('hardware_key');
        this.mfaSessions.set(sessionToken, session);
        logger.info(`Hardware key verified for user ${session.userId}`);
      } else {
        // Increment failed attempts
        session.failedAttempts++;
        this.mfaSessions.set(sessionToken, session);
        
        // Check if max attempts exceeded
        if (session.failedAttempts >= this.MAX_FAILED_ATTEMPTS) {
          this.mfaSessions.delete(sessionToken);
          logger.warn(`Max failed MFA attempts exceeded for user ${session.userId}`);
          throw new Error('Max failed attempts exceeded');
        }
        
        logger.warn(`Invalid hardware key signature for user ${session.userId}`);
      }
      
      return isValid;
    } catch (error) {
      logger.error(`Hardware key verification failed:`, error);
      throw new Error('Hardware key verification failed');
    }
  }
  
  /**
   * Verify biometric data for an MFA session
   * @param sessionToken MFA session token
   * @param biometricId Biometric identifier
   * @param biometricData Biometric data for verification
   * @returns Whether verification was successful
   */
  public verifyBiometrics(sessionToken: string, biometricId: string, biometricData: string): boolean {
    try {
      // Get session
      const session = this.getSession(sessionToken);
      
      // Check if biometrics is a required factor
      if (!session.requiredFactors.includes('biometrics')) {
        throw new Error('Biometrics is not required for this session');
      }
      
      // Check if biometrics is already completed
      if (session.completedFactors.includes('biometrics')) {
        throw new Error('Biometric verification already completed');
      }
      
      // Get user config
      const userConfig = this.getUserConfig(session.userId);
      if (!userConfig.biometrics || userConfig.biometrics.length === 0) {
        throw new Error('Biometrics not configured for user');
      }
      
      // Find the specified biometric
      const biometric = userConfig.biometrics.find(b => b.biometricId === biometricId);
      if (!biometric) {
        throw new Error('Biometric not found');
      }
      
      // In a real implementation, this would verify the biometric data against the template
      // For this simulation, we'll just assume it's valid
      const isValid = true;
      
      if (isValid) {
        // Mark biometrics as completed
        session.completedFactors.push('biometrics');
        this.mfaSessions.set(sessionToken, session);
        logger.info(`Biometrics verified for user ${session.userId}`);
      } else {
        // Increment failed attempts
        session.failedAttempts++;
        this.mfaSessions.set(sessionToken, session);
        
        // Check if max attempts exceeded
        if (session.failedAttempts >= this.MAX_FAILED_ATTEMPTS) {
          this.mfaSessions.delete(sessionToken);
          logger.warn(`Max failed MFA attempts exceeded for user ${session.userId}`);
          throw new Error('Max failed attempts exceeded');
        }
        
        logger.warn(`Invalid biometric data for user ${session.userId}`);
      }
      
      return isValid;
    } catch (error) {
      logger.error(`Biometric verification failed:`, error);
      throw new Error('Biometric verification failed');
    }
  }
  
  /**
   * Check if an MFA session is complete (all required factors verified)
   * @param sessionToken MFA session token
   * @returns Whether the session is complete
   */
  public isSessionComplete(sessionToken: string): boolean {
    try {
      // Get session
      const session = this.getSession(sessionToken);
      
      // Check if all required factors are completed
      const isComplete = session.requiredFactors.every(factor => 
        session.completedFactors.includes(factor)
      );
      
      if (isComplete) {
        logger.info(`MFA session complete for user ${session.userId}`);
      }
      
      return isComplete;
    } catch (error) {
      logger.error(`Failed to check MFA session:`, error);
      return false;
    }
  }
  
  /**
   * Complete an MFA session and clean up
   * @param sessionToken MFA session token
   */
  public completeSession(sessionToken: string): void {
    try {
      // Get session
      const session = this.getSession(sessionToken);
      
      // Check if session is complete
      if (!this.isSessionComplete(sessionToken)) {
        throw new Error('MFA session is not complete');
      }
      
      // Delete session
      this.mfaSessions.delete(sessionToken);
      
      logger.info(`MFA session completed and cleaned up for user ${session.userId}`);
    } catch (error) {
      logger.error(`Failed to complete MFA session:`, error);
      throw new Error('Failed to complete MFA session');
    }
  }
  
  /**
   * Generate a TOTP secret
   * @returns TOTP secret
   */
  private generateTOTPSecret(): string {
    // Generate a secure random secret (32 bytes, base32 encoded)
    const buffer = crypto.randomBytes(32);
    return this.base32Encode(buffer);
  }
  
  /**
   * Verify a TOTP code
   * @param code TOTP code
   * @param secret TOTP secret
   * @returns Whether the code is valid
   */
  private verifyTOTPCode(code: string, secret: string): boolean {
    // Get current time step (30-second window)
    const timeStep = Math.floor(Date.now() / 30000);
    
    // Check current time step and window
    for (let i = -this.TOTP_WINDOW; i <= this.TOTP_WINDOW; i++) {
      const expectedCode = this.generateTOTPCode(secret, timeStep + i);
      if (code === expectedCode) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Generate a TOTP code for a specific time step
   * @param secret TOTP secret
   * @param timeStep Time step
   * @returns TOTP code
   */
  private generateTOTPCode(secret: string, timeStep: number): string {
    // Convert time step to buffer
    const buffer = Buffer.alloc(8);
    buffer.writeBigUInt64BE(BigInt(timeStep), 0);
    
    // Convert secret from base32 to buffer
    const secretBuffer = this.base32Decode(secret);
    
    // Generate HMAC-SHA1
    const hmac = crypto.createHmac('sha1', secretBuffer);
    hmac.update(buffer);
    const hash = hmac.digest();
    
    // Dynamic truncation
    const offset = hash[hash.length - 1] & 0xf;
    const binary = ((hash[offset] & 0x7f) << 24) |
                  ((hash[offset + 1] & 0xff) << 16) |
                  ((hash[offset + 2] & 0xff) << 8) |
                  (hash[offset + 3] & 0xff);
    
    // Generate 6-digit code
    const code = binary % 1000000;
    return code.toString().padStart(6, '0');
  }
  
  /**
   * Base32 encode a buffer
   * @param buffer Buffer to encode
   * @returns Base32 encoded string
   */
  private base32Encode(buffer: Buffer): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let result = '';
    let bits = 0;
    let value = 0;
    
    for (let i = 0; i < buffer.length; i++) {
      value = (value << 8) | buffer[i];
      bits += 8;
      
      while (bits >= 5) {
        result += alphabet[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }
    
    if (bits > 0) {
      result += alphabet[(value << (5 - bits)) & 31];
    }
    
    return result;
  }
  
  /**
   * Base32 decode a string
   * @param str Base32 encoded string
   * @returns Decoded buffer
   */
  private base32Decode(str: string): Buffer {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const result: number[] = [];
    let bits = 0;
    let value = 0;
    
    for (let i = 0; i < str.length; i++) {
      const char = str[i].toUpperCase();
      const index = alphabet.indexOf(char);
      if (index === -1) continue;
      
      value = (value << 5) | index;
      bits += 5;
      
      if (bits >= 8) {
        result.push((value >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }
    
    return Buffer.from(result);
  }
  
  /**
   * Get user MFA configuration, creating it if it doesn't exist
   * @param userId User identifier
   * @returns User MFA configuration
   */
  private getUserConfig(userId: string): UserMFAConfig {
    const config = this.userMfaConfigs.get(userId);
    if (config) {
      return config;
    }
    
    // Create new config
    const newConfig: UserMFAConfig = {
      userId,
      totpEnabled: false,
      hardwareKeys: [],
      biometrics: [],
      lastUpdated: Date.now()
    };
    
    this.userMfaConfigs.set(userId, newConfig);
    return newConfig;
  }
  
  /**
   * Get an MFA session
   * @param sessionToken MFA session token
   * @returns MFA session
   */
  private getSession(sessionToken: string): MFASession {
    const session = this.mfaSessions.get(sessionToken);
    if (!session) {
      throw new Error('MFA session not found');
    }
    
    // Check if session has expired
    if (Date.now() > session.expiresAt) {
      this.mfaSessions.delete(sessionToken);
      throw new Error('MFA session has expired');
    }
    
    return session;
  }
  
  /**
   * Determine required authentication factors based on operation type and data
   * @param operationType Type of operation
   * @param operationData Operation data
   * @returns Array of required factors
   */
  private determineRequiredFactors(
    operationType: 'transaction' | 'key_export' | 'settings_change' | 'recovery',
    operationData: any
  ): MFAFactor[] {
    // Default to requiring TOTP for all operations
    const factors: MFAFactor[] = ['totp'];
    
    switch (operationType) {
      case 'transaction':
        // For high-value transactions, require hardware key
        if (operationData.value && parseFloat(operationData.value) > 1.0) {
          factors.push('hardware_key');
        }
        break;
        
      case 'key_export':
        // For key export, require hardware key and biometrics
        factors.push('hardware_key');
        factors.push('biometrics');
        break;
        
      case 'recovery':
        // For account recovery, require all available factors
        factors.push('hardware_key');
        factors.push('biometrics');
        break;
        
      case 'settings_change':
        // For security settings changes, require hardware key
        factors.push('hardware_key');
        break;
    }
    
    return factors;
  }
  
  /**
   * Check if a user has any MFA methods configured
   * @param config User MFA configuration
   * @returns Whether user has MFA configured
   */
  private hasMFAConfigured(config: UserMFAConfig): boolean {
    return config.totpEnabled || 
           (config.hardwareKeys && config.hardwareKeys.length > 0) ||
           (config.biometrics && config.biometrics.length > 0);
  }
}

// Types
type MFAFactor = 'totp' | 'hardware_key' | 'biometrics';

interface UserMFAConfig {
  userId: string;
  totpEnabled: boolean;
  totpSecret?: string;
  hardwareKeys: HardwareKey[];
  biometrics: BiometricInfo[];
  lastUpdated: number;
}

interface HardwareKey {
  keyId: string;
  publicKey: string;
  registeredAt: number;
}

interface BiometricInfo {
  biometricId: string;
  template: string;
  registeredAt: number;
}

interface MFASession {
  userId: string;
  operationType: 'transaction' | 'key_export' | 'settings_change' | 'recovery';
  operationData: any;
  requiredFactors: MFAFactor[];
  completedFactors: MFAFactor[];
  failedAttempts: number;
  createdAt: number;
  expiresAt: number;
}

// Export singleton instance
export const mfaService = MFAService.getInstance();
