import { ethers } from 'ethers';
import { logger } from '../../utils/logger';
import { createAuditLog } from '../../audit';
import { RetryUtility } from '../../utils/retry';
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { smartAccountClients, WalletInfo } from '../relayerService';
import { SUPPORTED_NETWORKS } from '../../config/networks';
import { createHSMProvider, HSMProvider, HSMProviderType, HSMKeyType } from '../hsm';
import { v4 as uuidv4 } from 'uuid';

// Interface for meta-transaction data
export interface MetaTransactionData {
  chainId: number;
  walletAddress: string;
  to: string;
  data: string;
  value: string;
  signature: string;
  tenantId?: string;
}

// Interface for transaction record
export interface TransactionRecord {
  hash: string;
  from: string;
  to: string;
  value: string;
  data: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
  chainId: number;
  tenantId?: string;
}

// IndexedDB schema
interface WalletDB extends DBSchema {
  wallets: {
    key: string;
    value: WalletInfo;
    indexes: { 'by-tenantId': string };
  };
  transactions: {
    key: string;
    value: TransactionRecord;
    indexes: { 'by-fromAddress': string; 'by-tenantId': string };
  };
}

/**
 * MetaTransactionService class to handle EIP-712 meta-transactions with IndexedDB
 */
export class MetaTransactionService {
  private dbPromise: Promise<IDBPDatabase<WalletDB>>;
  private hsmProvider: HSMProvider;
  private retryUtility: RetryUtility;
  private operationId: string = uuidv4();
  private tenantId?: string;

  constructor(config: {
    databaseName: string;
    hsmConfig: {
      provider: HSMProviderType;
      credentials: { pin: string; libraryPath: string; slotId?: number };
      options?: { fipsCompliance?: boolean; maxRetries?: number; timeoutMs?: number };
    };
    tenantId?: string;
  }) {
    this.dbPromise = openDB<WalletDB>(config.databaseName, 1, {
      upgrade(db) {
        const walletStore = db.createObjectStore('wallets', { keyPath: 'address' });
        walletStore.createIndex('by-tenantId', 'tenantId');

        const txStore = db.createObjectStore('transactions', { keyPath: 'hash' });
        txStore.createIndex('by-fromAddress', 'from');
        txStore.createIndex('by-tenantId', 'tenantId');
      },
    });
    this.hsmProvider = createHSMProvider(config.hsmConfig);
    this.retryUtility = new RetryUtility({ maxRetries: 3, baseDelayMs: 100, maxDelayMs: 1000 });
    this.tenantId = config.tenantId;
    logger.debug('MetaTransactionService instantiated', { operationId: this.operationId, tenantId: this.tenantId });
  }

  /**
   * Initializes the meta-transaction service
   */
  public async initialize(): Promise<void> {
    try {
      logger.info('Initializing meta-transaction service', { operationId: this.operationId, tenantId: this.tenantId });

      // Validate HSM configuration
      await this.retryUtility.retry(() => this.hsmProvider.validateConfig());

      // Ensure IndexedDB is accessible
      const db = await this.dbPromise;
      await db.getAll('wallets'); // Test database access

      await createAuditLog({
        action: 'meta_transaction_service_initialized',
        performedBy: 'system',
        targetId: this.operationId,
        targetType: 'meta_transaction_service',
        tenantId: this.tenantId,
      });

      logger.info('Meta-transaction service initialized successfully', { operationId: this.operationId });
    } catch (error) {
      logger.error('Error initializing meta-transaction service', { operationId: this.operationId, error });
      throw new Error(`Initialization failed: ${error.message}`);
    }
  }

  /**
   * Gets wallet information from IndexedDB
   * @param walletAddress Wallet address
   * @returns Wallet information or null
   */
  private async getWalletInfo(walletAddress: string): Promise<WalletInfo | null> {
    try {
      logger.debug('Getting wallet info', { walletAddress, tenantId: this.tenantId });

      if (!ethers.utils.isAddress(walletAddress)) {
        throw new Error('Invalid wallet address');
      }

      const db = await this.dbPromise;
      const wallet = await db.get('wallets', walletAddress);
      if (wallet && (!this.tenantId || wallet.tenantId === this.tenantId)) {
        return wallet;
      }
      return null;
    } catch (error) {
      logger.error('Error getting wallet info', { walletAddress, error });
      throw new Error(`Failed to get wallet info: ${error.message}`);
    }
  }

  /**
   * Sends an EIP-712 meta-transaction
   * @param metaTx Meta-transaction data
   * @returns Transaction hash
   */
  public async sendMetaTransaction(metaTx: MetaTransactionData): Promise<string> {
    try {
      logger.info('Sending meta-transaction', {
        walletAddress: metaTx.walletAddress,
        to: metaTx.to,
        chainId: metaTx.chainId,
        tenantId: this.tenantId,
      });

      // Validate inputs
      if (!SUPPORTED_NETWORKS[metaTx.chainId]) {
        throw new Error(`Unsupported network: ${metaTx.chainId}`);
      }
      if (!ethers.utils.isAddress(metaTx.walletAddress) || !ethers.utils.isAddress(metaTx.to)) {
        throw new Error('Invalid wallet or target address');
      }
      if (!ethers.utils.isHexString(metaTx.data)) {
        throw new Error('Invalid transaction data');
      }
      if (!ethers.utils.isHexString(metaTx.signature, 65)) {
        throw new Error('Invalid signature');
      }
      if (!/^\d+$/.test(metaTx.value)) {
        throw new Error('Invalid transaction value');
      }

      // Verify smart account client
      if (!smartAccountClients[metaTx.walletAddress]) {
        throw new Error(`Smart account client not found for wallet: ${metaTx.walletAddress}`);
      }

      // Get wallet info
      const walletInfo = await this.getWalletInfo(metaTx.walletAddress);
      if (!walletInfo || !walletInfo.owner) {
        throw new Error(`Wallet info not found or missing owner: ${metaTx.walletAddress}`);
      }

      // Construct EIP-712 typed data
      const domain = {
        name: 'Wallet',
        version: '1',
        chainId: metaTx.chainId,
        verifyingContract: metaTx.walletAddress,
      };

      const types = {
        Transaction: [
          { name: 'to', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'data', type: 'bytes' },
          { name: 'nonce', type: 'uint256' },
        ],
      };

      // Fetch nonce from IndexedDB
      const nonce = await this.retryUtility.retry(async () => {
        const db = await this.dbPromise;
        const txs = await db.getAllFromIndex('transactions', 'by-fromAddress', metaTx.walletAddress);
        const tenantTxs = txs.filter((tx) => !this.tenantId || tx.tenantId === this.tenantId);
        return tenantTxs.length;
      });

      const message = {
        to: metaTx.to,
        value: metaTx.value,
        data: metaTx.data,
        nonce,
      };

      // Verify signature using HSM
      const typedDataHash = ethers.utils._TypedDataEncoder.hash(domain, types, message);
      const signatureValid = await this.retryUtility.retry(async () => {
        if (!walletInfo.hsmKeyId) {
          throw new Error('HSM key ID not found for wallet');
        }
        const publicKey = (await this.hsmProvider.getKey(walletInfo.hsmKeyId, this.tenantId)).publicKey;
        const signer = ethers.utils.recoverAddress(typedDataHash, metaTx.signature);
        return signer.toLowerCase() === ethers.utils.computeAddress(publicKey).toLowerCase();
      });

      if (!signatureValid) {
        throw new Error('Invalid signature: signer does not match wallet owner');
      }

      // Send transaction through smart account client
      const txHash = await this.retryUtility.retry(() =>
        smartAccountClients[metaTx.walletAddress].sendTransaction({
          to: metaTx.to,
          value: BigInt(metaTx.value),
          data: metaTx.data,
        })
      );

      // Store transaction in IndexedDB
      const transaction: TransactionRecord = {
        hash: txHash,
        from: metaTx.walletAddress,
        to: metaTx.to,
        value: metaTx.value,
        data: metaTx.data,
        timestamp: Date.now(),
        status: 'pending',
        chainId: metaTx.chainId,
        tenantId: this.tenantId,
      };

      const db = await this.dbPromise;
      await db.put('transactions', transaction);

      // Log audit event
      await createAuditLog({
        action: 'meta_transaction_sent',
        performedBy: walletInfo.owner,
        targetId: txHash,
        targetType: 'transaction',
        walletAddress: metaTx.walletAddress,
        tenantId: this.tenantId,
        metadata: {
          chainId: metaTx.chainId,
          to: metaTx.to,
          value: metaTx.value,
          nonce,
          hsmKeyId: walletInfo.hsmKeyId,
        },
      });

      logger.info('Meta-transaction sent', { txHash, walletAddress: metaTx.walletAddress });
      return txHash;
    } catch (error) {
      logger.error('Error sending meta-transaction', {
        walletAddress: metaTx.walletAddress,
        to: metaTx.to,
        chainId: metaTx.chainId,
        error,
      });
      throw new Error(`Meta-transaction failed: ${error.message}`);
    }
  }
}

// Export singleton instance
export default new MetaTransactionService({
  databaseName: process.env.DB_NAME || 'wallet_db',
  hsmConfig: {
    provider: HSMProviderType.CUSTOM,
    credentials: {
      pin: process.env.HSM_PIN || '123456',
      libraryPath: process.env.HSM_LIBRARY_PATH || '/usr/lib/pkcs11.so',
    },
    options: { fipsCompliance: true },
  },
  tenantId: process.env.TENANT_ID,
});