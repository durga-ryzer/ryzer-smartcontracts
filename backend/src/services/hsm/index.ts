import { ethers } from 'ethers';
import { logger } from '../../utils/logger';
import { createAuditLog } from '../audit';
import { v4 as uuidv4 } from 'uuid';
import { RetryUtility } from '../../utils/retry';
import * as pkcs11 from 'node-pkcs11'; // Hypothetical PKCS#11 library for Node.js

// Enum for HSM provider types
export enum HSMProviderType {
  CUSTOM = 'custom',
}

// Enum for HSM key types
export enum HSMKeyType {
  ECDSA_SECP256K1 = 'ecdsa_secp256k1',
  RSA_2048 = 'rsa_2048',
}

// Interface for HSM key information
export interface HSMKeyInfo {
  id: string;
  name: string;
  description?: string;
  provider: HSMProviderType;
  keyType: HSMKeyType;
  createdAt: number;
  createdBy: string;
  lastUsedAt?: number;
  lastRotatedAt?: number;
  publicKey: string;
  walletAddress: string;
  metadata?: Record<string, any>;
  tenantId?: string;
}

// Interface for HSM configuration
export interface HSMConfig {
  provider: HSMProviderType;
  credentials: {
    userId?: string;
    pin: string;
    libraryPath: string; // Path to PKCS#11 library
    slotId?: number; // HSM slot ID
    [key: string]: any;
  };
  options?: {
    fipsCompliance?: boolean;
    maxRetries?: number;
    timeoutMs?: number;
    sessionTimeoutMs?: number;
    [key: string]: any;
  };
  tenantId?: string;
}

// Interface for HSM provider
export interface HSMProvider {
  generateKey(keyType: HSMKeyType, name: string, description?: string, tenantId?: string): Promise<HSMKeyInfo>;
  getKey(keyId: string, tenantId?: string): Promise<HSMKeyInfo>;
  listKeys(tenantId?: string): Promise<HSMKeyInfo[]>;
  sign(keyId: string, message: string, tenantId?: string): Promise<string>;
  rotateKey(keyId: string, tenantId?: string): Promise<HSMKeyInfo>;
  deleteKey(keyId: string, tenantId?: string): Promise<boolean>;
  validateConfig(): Promise<void>;
}

/**
 * Utility to derive Ethereum wallet address from public key
 * @param publicKey Public key in hex format
 * @returns Ethereum wallet address
 */
function deriveWalletAddress(publicKey: string): string {
  const pubKeyBuffer = Buffer.from(publicKey.replace('0x', ''), 'hex');
  const address = ethers.utils.computeAddress(pubKeyBuffer);
  return ethers.utils.getAddress(address);
}

/**
 * Abstract base class for HSM providers
 */
abstract class BaseHSMProvider implements HSMProvider {
  protected config: HSMConfig;
  protected type: HSMProviderType;
  protected retryUtility: RetryUtility;

  constructor(config: HSMConfig) {
    this.config = config;
    this.type = config.provider;
    this.retryUtility = new RetryUtility({
      maxRetries: config.options?.maxRetries ?? 3,
      baseDelayMs: 100,
      maxDelayMs: 1000,
    });
    this.validateConfigSync();
  }

  /**
   * Validates configuration synchronously
   * @throws Error if configuration is invalid
   */
  protected validateConfigSync(): void {
    if (!this.config.provider || !Object.values(HSMProviderType).includes(this.config.provider)) {
      throw new Error(`Invalid HSM provider type: ${this.config.provider}`);
    }
    if (!this.config.credentials || typeof this.config.credentials !== 'object') {
      throw new Error('Valid credentials are required');
    }
    if (!this.config.credentials.pin || !this.config.credentials.libraryPath) {
      throw new Error('PIN and library path are required for custom HSM');
    }
  }

  /**
   * Validates configuration asynchronously (e.g., checks connectivity)
   * @throws Error if validation fails
   */
  public abstract validateConfig(): Promise<void>;

  abstract generateKey(keyType: HSMKeyType, name: string, description?: string, tenantId?: string): Promise<HSMKeyInfo>;
  abstract getKey(keyId: string, tenantId?: string): Promise<HSMKeyInfo>;
  abstract listKeys(tenantId?: string): Promise<HSMKeyInfo[]>;
  abstract sign(keyId: string, message: string, tenantId?: string): Promise<string>;
  abstract rotateKey(keyId: string, tenantId?: string): Promise<HSMKeyInfo>;
  abstract deleteKey(keyId: string, tenantId?: string): Promise<boolean>;

  /**
   * Sanitizes input strings to prevent injection
   * @param input Input string
   * @returns Sanitized string
   */
  protected sanitizeInput(input: string): string {
    return input.replace(/[^a-zA-Z0-9-_]/g, '');
  }
}

/**
 * Custom HSM provider implementation using PKCS#11
 */
class CustomHSMProvider extends BaseHSMProvider {
  private pkcs11Client: pkcs11.PKCS11;
  private session: pkcs11.Session | null = null;

  constructor(config: HSMConfig) {
    super(config);
    this.pkcs11Client = new pkcs11.PKCS11();
    this.pkcs11Client.load(config.credentials.libraryPath);
    logger.info('Initialized Custom HSM provider', { libraryPath: config.credentials.libraryPath });
  }

  /**
   * Initializes a PKCS#11 session
   * @throws Error if session initialization fails
   */
  private async initializeSession(): Promise<void> {
    try {
      if (!this.session) {
        this.pkcs11Client.C_Initialize();
        const slots = this.pkcs11Client.C_GetSlotList(true);
        const slotId = this.config.credentials.slotId ?? slots[0];
        this.session = this.pkcs11Client.C_OpenSession(slotId, pkcs11.CKF_RW_SESSION | pkcs11.CKF_SERIAL_SESSION);
        this.pkcs11Client.C_Login(this.session, pkcs11.CKU_USER, this.config.credentials.pin);
        logger.debug('PKCS#11 session initialized', { slotId });
      }
    } catch (error: unknown) {
      logger.error('Failed to initialize PKCS#11 session', { error });
      if (error instanceof Error) {
        throw new Error(`Session initialization failed: ${error.message}`);
      } else {
        throw new Error('Session initialization failed: Unknown error');
      }
    }
  }

  /**
   * Closes the PKCS#11 session
   */
  private async closeSession(): Promise<void> {
    if (this.session) {
      this.pkcs11Client.C_Logout(this.session);
      this.pkcs11Client.C_CloseSession(this.session);
      this.session = null;
      logger.debug('PKCS#11 session closed');
    }
  }

  async validateConfig(): Promise<void> {
    try {
      logger.debug('Validating Custom HSM configuration');
      await this.initializeSession();
      await this.closeSession();
      logger.debug('Custom HSM configuration validated');
    } catch (error) {
      logger.error('Custom HSM configuration validation failed', { error });
      if (error instanceof Error) {
        throw new Error(`Failed to validate Custom HSM configuration: ${error.message}`);
      }
      throw new Error('Failed to validate Custom HSM configuration: Unknown error');
    }
  }

  async generateKey(keyType: HSMKeyType, name: string, description?: string, tenantId?: string): Promise<HSMKeyInfo> {
    try {
      logger.info(`Generating ${keyType} key in Custom HSM`, { name, tenantId });
      const sanitizedName = this.sanitizeInput(name);

      if (!sanitizedName || sanitizedName.length > 100) {
        throw new Error('Invalid key name: must be a non-empty string up to 100 characters');
      }

      await this.initializeSession();
      if (!this.session) throw new Error('Session not initialized');

      const keyId = `custom-hsm-${uuidv4()}`;
      const keyTemplate = keyType === HSMKeyType.ECDSA_SECP256K1
        ? [
            { type: pkcs11.CKA_CLASS, value: pkcs11.CKO_PRIVATE_KEY },
            { type: pkcs11.CKA_KEY_TYPE, value: pkcs11.CKK_EC },
            { type: pkcs11.CKA_EC_PARAMS, value: Buffer.from('06082a8648ce3d030107', 'hex') }, // secp256k1
            { type: pkcs11.CKA_LABEL, value: sanitizedName },
            { type: pkcs11.CKA_ID, value: Buffer.from(keyId) },
            { type: pkcs11.CKA_TOKEN, value: true },
            { type: pkcs11.CKA_PRIVATE, value: true },
            { type: pkcs11.CKA_SIGN, value: true },
          ]
        : [
            { type: pkcs11.CKA_CLASS, value: pkcs11.CKO_PRIVATE_KEY },
            { type: pkcs11.CKA_KEY_TYPE, value: pkcs11.CKK_RSA },
            { type: pkcs11.CKA_MODULUS_BITS, value: 2048 },
            { type: pkcs11.CKA_LABEL, value: sanitizedName },
            { type: pkcs11.CKA_ID, value: Buffer.from(keyId) },
            { type: pkcs11.CKA_TOKEN, value: true },
            { type: pkcs11.CKA_PRIVATE, value: true },
            { type: pkcs11.CKA_SIGN, value: true },
          ];

      const publicKeyTemplate = [
        { type: pkcs11.CKA_CLASS, value: pkcs11.CKO_PUBLIC_KEY },
        { type: pkcs11.CKA_KEY_TYPE, value: keyType === HSMKeyType.ECDSA_SECP256K1 ? pkcs11.CKK_EC : pkcs11.CKK_RSA },
        { type: pkcs11.CKA_LABEL, value: sanitizedName },
        { type: pkcs11.CKA_ID, value: Buffer.from(keyId) },
        { type: pkcs11.CKA_TOKEN, value: true },
        { type: pkcs11.CKA_VERIFY, value: true },
      ];

      const [publicKeyHandle, privateKeyHandle] = await this.retryUtility.retry(() =>
        this.pkcs11Client.C_GenerateKeyPair(
          this.session!,
          { mechanism: keyType === HSMKeyType.ECDSA_SECP256K1 ? pkcs11.CKM_EC_KEY_PAIR_GEN : pkcs11.CKM_RSA_PKCS_KEY_PAIR_GEN },
          publicKeyTemplate,
          keyTemplate
        )
      );

      // Retrieve public key
      const publicKeyAttr = this.pkcs11Client.C_GetAttributeValue(this.session!, publicKeyHandle, [
        { type: keyType === HSMKeyType.ECDSA_SECP256K1 ? pkcs11.CKA_EC_POINT : pkcs11.CKA_MODULUS },
      ]);
      const publicKey = `0x${Buffer.from(publicKeyAttr[0].value).toString('hex')}`;
      const walletAddress = deriveWalletAddress(publicKey);

      const keyInfo: HSMKeyInfo = {
        id: keyId,
        name: sanitizedName,
        description,
        provider: HSMProviderType.CUSTOM,
        keyType,
        createdAt: Date.now(),
        createdBy: this.config.credentials.userId || 'system',
        publicKey,
        walletAddress,
        tenantId,
        metadata: {
          slotId: this.config.credentials.slotId,
          fipsCompliant: this.config.options?.fipsCompliance ?? true,
          pkcs11Library: this.config.credentials.libraryPath,
        },
      };

      await createAuditLog({
        userId: this.config.credentials.userId || 'system',
        action: 'hsm_key_created',
        performedBy: this.config.credentials.userId || 'system',
        category: 'hsm',
        timestamp: Date.now(),
        status: 'success',
        targetId: keyId,
        targetType: 'hsm_key',
        details: { chainId: tenantId, walletAddress }
      });

      logger.debug('Key generated successfully', { keyId, walletAddress });
      return keyInfo;
    } catch (error) {
      logger.error('Error generating key in Custom HSM', { keyType, name, tenantId, error });
      if (error instanceof Error) {
        throw new Error(`Failed to generate key: ${error.message}`);
      }
      throw new Error('Failed to generate key: Unknown error');
    } finally {
      await this.closeSession();
    }
  }

  async getKey(keyId: string, tenantId?: string): Promise<HSMKeyInfo> {
    try {
      logger.info(`Retrieving key from Custom HSM`, { keyId, tenantId });

      if (!keyId || typeof keyId !== 'string') {
        throw new Error('Invalid key ID');
      }

      await this.initializeSession();
      if (!this.session) throw new Error('Session not initialized');

      const objects = this.pkcs11Client.C_FindObjectsInit(this.session!, [
        { type: pkcs11.CKA_ID, value: Buffer.from(keyId) },
        { type: pkcs11.CKA_CLASS, value: pkcs11.CKO_PUBLIC_KEY },
      ]);

      const objectHandle = this.pkcs11Client.C_FindObjects(this.session!);
      if (!objectHandle) {
        throw new Error(`Key not found: ${keyId}`);
      }

      const attributes = this.pkcs11Client.C_GetAttributeValue(this.session!, objectHandle, [
        { type: pkcs11.CKA_LABEL },
        { type: pkcs11.CKA_KEY_TYPE },
        { type: pkcs11.CKA_EC_POINT },
        { type: pkcs11.CKA_MODULUS },
      ]);

      const publicKey = attributes.find(attr => attr.type === pkcs11.CKA_EC_POINT || attr.type === pkcs11.CKA_MODULUS)
        ? `0x${Buffer.from(attributes.find(attr => attr.type === pkcs11.CKA_EC_POINT || attr.type === pkcs11.CKA_MODULUS)!.value).toString('hex')}`
        : '';
      const walletAddress = publicKey ? deriveWalletAddress(publicKey) : '';

      return {
        id: keyId,
        name: attributes.find(attr => attr.type === pkcs11.CKA_LABEL)?.value.toString() || keyId,
        description: undefined,
        provider: HSMProviderType.CUSTOM,
        keyType: attributes.find(attr => attr.type === pkcs11.CKA_KEY_TYPE)?.value === pkcs11.CKK_EC
          ? HSMKeyType.ECDSA_SECP256K1
          : HSMKeyType.RSA_2048,
        createdAt: Date.now(), // Placeholder, actual timestamp requires HSM metadata
        createdBy: this.config.credentials.userId || 'system',
        publicKey,
        walletAddress,
        tenantId,
        metadata: {
          slotId: this.config.credentials.slotId,
          fipsCompliant: this.config.options?.fipsCompliance ?? true,
        },
      };
    } catch (error) {
      logger.error('Error retrieving key from Custom HSM', { keyId, tenantId, error });
      if (error instanceof Error) {
        throw new Error(`Failed to retrieve key: ${error.message}`);
      }
      throw new Error('Failed to retrieve key: Unknown error');
    } finally {
      await this.closeSession();
    }
  }

  async listKeys(tenantId?: string): Promise<HSMKeyInfo[]> {
    try {
      logger.info('Listing keys from Custom HSM', { tenantId });

      await this.initializeSession();
      if (!this.session) throw new Error('Session not initialized');

      const keys: HSMKeyInfo[] = [];
      this.pkcs11Client.C_FindObjectsInit(this.session!, [{ type: pkcs11.CKA_CLASS, value: pkcs11.CKO_PUBLIC_KEY }]);

      let objectHandle;
      while ((objectHandle = this.pkcs11Client.C_FindObjects(this.session!))) {
        const attributes = this.pkcs11Client.C_GetAttributeValue(this.session!, objectHandle, [
          { type: pkcs11.CKA_ID },
        ]);
        const keyId = attributes.find(attr => attr.type === pkcs11.CKA_ID)?.value.toString();
        if (keyId) {
          const keyInfo = await this.getKey(keyId, tenantId);
          if (!tenantId || keyInfo.tenantId === tenantId) {
            keys.push(keyInfo);
          }
        }
      }

      this.pkcs11Client.C_FindObjectsFinal(this.session!);
      logger.debug('Keys listed successfully', { count: keys.length, tenantId });
      return keys;
    } catch (error) {
      logger.error('Error listing keys from Custom HSM', { tenantId, error });
      if (error instanceof Error) {
        throw new Error(`Failed to list keys: ${error.message}`);
      }
      throw new Error('Failed to list keys: Unknown error');
    } finally {
      await this.closeSession();
    }
  }

  async sign(keyId: string, message: string, tenantId?: string): Promise<string> {
    try {
      logger.info(`Signing message with Custom HSM key`, { keyId, tenantId });

      if (!keyId || !message || typeof message !== 'string') {
        throw new Error('Invalid key ID or message');
      }

      await this.initializeSession();
      if (!this.session) throw new Error('Session not initialized');

      const messageHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(message));
      const privateKeyHandle = this.pkcs11Client.C_FindObjectsInit(this.session!, [
        { type: pkcs11.CKA_ID, value: Buffer.from(keyId) },
        { type: pkcs11.CKA_CLASS, value: pkcs11.CKO_PRIVATE_KEY },
      ]);

      const keyHandle = this.pkcs11Client.C_FindObjects(this.session!);
      if (!keyHandle) {
        throw new Error(`Private key not found: ${keyId}`);
      }

      const signature = await this.retryUtility.retry(() =>
        this.pkcs11Client.C_Sign(
          this.session!,
          keyHandle,
          { mechanism: pkcs11.CKM_ECDSA },
          Buffer.from(messageHash.slice(2), 'hex')
        )
      );

      const keyInfo = await this.getKey(keyId, tenantId);

      await createAuditLog({
        userId: this.config.credentials.userId || 'system',
        action: 'hsm_key_used',
        performedBy: this.config.credentials.userId || 'system',
        category: 'hsm',
        timestamp: Date.now(),
        status: 'success',
        targetId: keyId,
        targetType: 'hsm_key',
        details: { chainId: tenantId, walletAddress: keyInfo.walletAddress }
      });

      const signatureHex = `0x${Buffer.from(signature).toString('hex')}`;
      logger.debug('Message signed successfully', { keyId, messageHash });
      return signatureHex;
    } catch (error) {
      logger.error('Error signing message with Custom HSM key', { keyId, tenantId, error });
      if (error instanceof Error) {
        throw new Error(`Failed to sign message: ${error.message}`);
      }
      throw new Error('Failed to sign message: Unknown error');
    } finally {
      await this.closeSession();
    }
  }

  async rotateKey(keyId: string, tenantId?: string): Promise<HSMKeyInfo> {
    try {
      logger.info(`Rotating Custom HSM key`, { keyId, tenantId });

      if (!keyId || typeof keyId !== 'string') {
        throw new Error('Invalid key ID');
      }

      const keyInfo = await this.getKey(keyId, tenantId);
      const newKeyInfo = await this.generateKey(
        keyInfo.keyType,
        `${keyInfo.name}-rotated-${Date.now()}`,
        keyInfo.description,
        tenantId
      );

      newKeyInfo.metadata = {
        ...newKeyInfo.metadata,
        rotatedFrom: keyId,
        rotatedAt: Date.now(),
        tenantId,
      };

      await createAuditLog({
        userId: this.config.credentials.userId || 'system',
        action: 'hsm_key_rotated',
        performedBy: this.config.credentials.userId || 'system',
        category: 'hsm',
        timestamp: Date.now(),
        status: 'success',
        targetId: keyId,
        targetType: 'hsm_key',
        details: { chainId: tenantId, walletAddress: newKeyInfo.walletAddress }
      });

      logger.debug('Key rotated successfully', { oldKeyId: keyId, newKeyId: newKeyInfo.id });
      return newKeyInfo;
    } catch (error) {
      logger.error('Error rotating Custom HSM key', { keyId, tenantId, error });
      if (error instanceof Error) {
        throw new Error(`Failed to rotate key: ${error.message}`);
      }
      throw new Error('Failed to rotate key: Unknown error');
    } finally {
      await this.closeSession();
    }
  }

  async deleteKey(keyId: string, tenantId?: string): Promise<boolean> {
    try {
      logger.info(`Deleting Custom HSM key`, { keyId, tenantId });

      if (!keyId || typeof keyId !== 'string') {
        throw new Error('Invalid key ID');
      }

      await this.initializeSession();
      if (!this.session) throw new Error('Session not initialized');

      const keyInfo = await this.getKey(keyId, tenantId);
      const privateKeyHandle = this.pkcs11Client.C_FindObjectsInit(this.session!, [
        { type: pkcs11.CKA_ID, value: Buffer.from(keyId) },
        { type: pkcs11.CKA_CLASS, value: pkcs11.CKO_PRIVATE_KEY },
      ]);

      const keyHandle = this.pkcs11Client.C_FindObjects(this.session!);
      if (keyHandle) {
        await this.retryUtility.retry(() => this.pkcs11Client.C_DestroyObject(this.session!, keyHandle));
      }

      const publicKeyHandle = this.pkcs11Client.C_FindObjectsInit(this.session!, [
        { type: pkcs11.CKA_ID, value: Buffer.from(keyId) },
        { type: pkcs11.CKA_CLASS, value: pkcs11.CKO_PUBLIC_KEY },
      ]);

      const pubKeyHandle = this.pkcs11Client.C_FindObjects(this.session!);
      if (pubKeyHandle) {
        await this.retryUtility.retry(() => this.pkcs11Client.C_DestroyObject(this.session!, pubKeyHandle));
      }

      await createAuditLog({
        userId: this.config.credentials.userId || 'system',
        action: 'hsm_key_deleted',
        performedBy: this.config.credentials.userId || 'system',
        category: 'hsm',
        timestamp: Date.now(),
        status: 'success',
        targetId: keyId,
        targetType: 'hsm_key',
        details: { chainId: tenantId, walletAddress: keyInfo.walletAddress }
      });

      logger.debug('Key deleted successfully', { keyId });
      return true;
    } catch (error) {
      logger.error('Error deleting Custom HSM key', { keyId, tenantId, error });
      if (error instanceof Error) {
        throw new Error(`Failed to delete key: ${error.message}`);
      }
      throw new Error('Failed to delete key: Unknown error');
    } finally {
      await this.closeSession();
    }
  }
}

/**
 * HSM provider factory
 * @param config HSM configuration
 * @returns HSM provider instance
 * @throws Error if provider is unsupported
 */
export function createHSMProvider(config: HSMConfig): HSMProvider {
  try {
    logger.debug('Creating HSM provider', { provider: config.provider });

    if (config.provider === HSMProviderType.CUSTOM) {
      return new CustomHSMProvider(config);
    }
    throw new Error(`Unsupported HSM provider: ${config.provider}`);
  } catch (error) {
    logger.error('Error creating HSM provider', { provider: config.provider, error });
    if (error instanceof Error) {
      throw new Error(`Failed to create HSM provider: ${error.message}`);
    }
    throw new Error('Failed to create HSM provider: Unknown error');
  }
}

// Export enums and factory
export default {
  createHSMProvider,
  HSMProviderType,
  HSMKeyType,
};