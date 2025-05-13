import crypto from 'crypto';
import { logger } from '../../utils/logger';

/**
 * Military-Grade Encryption Service
 * 
 * Implements AES-256-GCM encryption with PBKDF2 key derivation and secure random IVs.
 * This provides military-grade security for sensitive wallet data.
 */
export class MilitaryGradeEncryption {
  private static instance: MilitaryGradeEncryption;
  
  // AES-256-GCM parameters
  private readonly ALGORITHM = 'aes-256-gcm';
  private readonly KEY_LENGTH = 32; // 256 bits
  private readonly IV_LENGTH = 16; // 128 bits
  private readonly AUTH_TAG_LENGTH = 16; // 128 bits
  private readonly SALT_LENGTH = 64; // 512 bits
  
  // PBKDF2 parameters
  private readonly ITERATIONS = 310000; // High iteration count for key stretching
  private readonly DIGEST = 'sha512';
  
  // Master encryption key (in a real implementation, this would be stored in a hardware security module)
  private masterKey: Buffer;
  
  private constructor() {
    // Generate a secure random master key
    this.masterKey = crypto.randomBytes(this.KEY_LENGTH);
  }
  
  /**
   * Get the singleton instance of MilitaryGradeEncryption
   */
  public static getInstance(): MilitaryGradeEncryption {
    if (!MilitaryGradeEncryption.instance) {
      MilitaryGradeEncryption.instance = new MilitaryGradeEncryption();
    }
    return MilitaryGradeEncryption.instance;
  }
  
  /**
   * Encrypt data with military-grade security
   * @param data Data to encrypt
   * @param context Additional context for key derivation (e.g., user ID, wallet ID)
   * @returns Encrypted data in format: salt:iv:authTag:ciphertext
   */
  public encrypt(data: string, context: string): string {
    try {
      // Generate a secure random salt
      const salt = crypto.randomBytes(this.SALT_LENGTH);
      
      // Derive a key using PBKDF2 with the master key and context
      const derivedKey = this.deriveKey(salt, context);
      
      // Generate a secure random initialization vector
      const iv = crypto.randomBytes(this.IV_LENGTH);
      
      // Create cipher with derived key and IV
      const cipher = crypto.createCipheriv(this.ALGORITHM, derivedKey, iv);
      
      // Encrypt the data
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Get the authentication tag
      const authTag = cipher.getAuthTag();
      
      // Combine all components: salt:iv:authTag:ciphertext
      return Buffer.concat([
        salt,
        iv,
        authTag,
        Buffer.from(encrypted, 'hex')
      ]).toString('base64');
    } catch (error) {
      logger.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }
  
  /**
   * Decrypt data that was encrypted with military-grade security
   * @param encryptedData Encrypted data in format: salt:iv:authTag:ciphertext
   * @param context Additional context for key derivation (e.g., user ID, wallet ID)
   * @returns Decrypted data
   */
  public decrypt(encryptedData: string, context: string): string {
    try {
      // Decode the base64 encrypted data
      const buffer = Buffer.from(encryptedData, 'base64');
      
      // Extract components
      const salt = buffer.subarray(0, this.SALT_LENGTH);
      const iv = buffer.subarray(this.SALT_LENGTH, this.SALT_LENGTH + this.IV_LENGTH);
      const authTag = buffer.subarray(
        this.SALT_LENGTH + this.IV_LENGTH,
        this.SALT_LENGTH + this.IV_LENGTH + this.AUTH_TAG_LENGTH
      );
      const encrypted = buffer.subarray(
        this.SALT_LENGTH + this.IV_LENGTH + this.AUTH_TAG_LENGTH
      ).toString('hex');
      
      // Derive the key using PBKDF2 with the master key and context
      const derivedKey = this.deriveKey(salt, context);
      
      // Create decipher with derived key and IV
      const decipher = crypto.createDecipheriv(this.ALGORITHM, derivedKey, iv);
      
      // Set the authentication tag
      decipher.setAuthTag(authTag);
      
      // Decrypt the data
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data: data may be tampered or corrupted');
    }
  }
  
  /**
   * Derive a key using PBKDF2 with the master key and context
   * @param salt Random salt for key derivation
   * @param context Additional context for key derivation
   * @returns Derived key
   */
  private deriveKey(salt: Buffer, context: string): Buffer {
    // Combine master key with context
    const keyMaterial = Buffer.concat([
      this.masterKey,
      Buffer.from(context, 'utf8')
    ]);
    
    // Derive a key using PBKDF2
    return crypto.pbkdf2Sync(
      keyMaterial,
      salt,
      this.ITERATIONS,
      this.KEY_LENGTH,
      this.DIGEST
    );
  }
  
  /**
   * Generate a secure random key
   * @returns Secure random key as hex string
   */
  public generateSecureKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }
  
  /**
   * Compute a secure hash of data
   * @param data Data to hash
   * @returns Secure hash
   */
  public secureHash(data: string): string {
    return crypto.createHash('sha3-512').update(data).digest('hex');
  }
  
  /**
   * Generate a secure random nonce
   * @param length Length of nonce in bytes
   * @returns Secure random nonce
   */
  public generateNonce(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }
}

// Export singleton instance
export const militaryGradeEncryption = MilitaryGradeEncryption.getInstance();
