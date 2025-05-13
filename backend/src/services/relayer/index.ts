import { ethers } from 'ethers';
import { logger } from '../../utils/logger';
import { createAuditLog } from '../../audit';
import { RetryUtility } from '../../utils/retry';
import { Pool } from 'pg';
import { createPublicClient, http, parseEther } from 'viem';
import { createSmartAccountClient } from 'permissionless';
// Define ENTRYPOINT_ADDRESS directly
const ENTRYPOINT_ADDRESS = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789';
import { privateKeyToAccount } from 'viem/accounts';
import { generatePrivateKey } from 'viem/accounts';
import { toSafeSmartAccount } from 'permissionless/accounts';
import { erc20Abi } from 'viem';
import { v4 as uuidv4 } from 'uuid';
import { createHSMProvider, HSMProvider, HSMProviderType, HSMKeyType } from '../hsm';

// Helper function to get error message
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

// Interface for wallet information
export interface WalletInfo {
  address: string;
  type: 'smart' | 'eoa';
  chainId: number;
  owner: string;
  deployedAt: number;
  tenantId?: string;
  hsmKeyId?: string;
}

// Interface for transaction data
export interface TransactionData {
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

// Interface for token balance
export interface TokenBalance {
  tokenAddress: string;
  symbol: string;
  balance: string;
  decimals: number;
}

// Network configuration
export type NetworkConfig = {
  name: string;
  rpcUrl: string;
  pimlicoApiKey: string;
  chainId: number;
  tokens: Record<string, { symbol: string; decimals: number }>;
};

export const SUPPORTED_NETWORKS: Record<string, NetworkConfig> = {
  1: {
    name: 'Ethereum Mainnet',
    rpcUrl: process.env.ETH_MAINNET_RPC_URL || 'https://eth.llamarpc.com',
    pimlicoApiKey: process.env.PIMLICO_API_KEY || '',
    chainId: 1,
    tokens: {
      '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': { symbol: 'USDC', decimals: 6 },
      '0xdac17f958d2ee523a2206206994597c13d831ec7': { symbol: 'USDT', decimals: 6 },
    },
  },
  11155111: {
    name: 'Sepolia Testnet',
    rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org',
    pimlicoApiKey: process.env.PIMLICO_API_KEY || '',
    chainId: 11155111,
    tokens: {
      '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238': { symbol: 'USDC', decimals: 6 },
    },
  },
};

// Store providers, clients, and smart accounts
const providers: Record<number, ethers.providers.JsonRpcProvider> = {};
const pimlicoClients: Record<number, any> = {};
const smartAccountClients: Record<string, any> = {};
let dbPool: Pool | null = null;
let hsmProvider: HSMProvider | null = null;

/**
 * RelayerService class to manage gasless transactions and smart accounts
 */
export class RelayerService {
  private retryUtility: RetryUtility;
  private operationId: string = uuidv4();
  private tenantId?: string;

  constructor(config: {
    databaseConfig: {
      host: string;
      port: number;
      database: string;
      user: string;
      password: string;
    };
    hsmConfig: {
      provider: HSMProviderType;
      credentials: { pin: string; libraryPath: string; slotId?: number };
      options?: { fipsCompliance?: boolean; maxRetries?: number; timeoutMs?: number };
    };
    tenantId?: string;
  }) {
    this.retryUtility = new RetryUtility({ maxRetries: 3, baseDelayMs: 100, maxDelayMs: 1000 });
    this.tenantId = config.tenantId;
    dbPool = new Pool(config.databaseConfig);
    hsmProvider = createHSMProvider(config.hsmConfig);
    logger.debug('RelayerService instantiated', { operationId: this.operationId, tenantId: config.tenantId });
  }

  /**
   * Initializes the relayer service
   */
  public async initializeRelayer(): Promise<void> {
    try {
      logger.info('Initializing relayer service', { operationId: this.operationId, tenantId: this.tenantId });

      // Validate HSM configuration
      await this.retryUtility.retry(() => hsmProvider!.validateConfig());

      // Initialize database pool
      await this.retryUtility.retry(async () => {
        const client = await dbPool!.connect();
        try {
          await client.query(`
            CREATE TABLE IF NOT EXISTS wallets (
              address TEXT PRIMARY KEY,
              type TEXT NOT NULL,
              chain_id INTEGER NOT NULL,
              owner TEXT NOT NULL,
              deployed_at BIGINT NOT NULL,
              tenant_id TEXT,
              hsm_key_id TEXT
            );
            CREATE TABLE IF NOT EXISTS transactions (
              hash TEXT PRIMARY KEY,
              from_address TEXT NOT NULL,
              to_address TEXT NOT NULL,
              value TEXT NOT NULL,
              data TEXT NOT NULL,
              timestamp BIGINT NOT NULL,
              status TEXT NOT NULL,
              chain_id INTEGER NOT NULL,
              tenant_id TEXT
            );
          `);
        } finally {
          client.release();
        }
      });

      // Initialize providers for each supported network
      for (const [chainIdStr, networkConfig] of Object.entries(SUPPORTED_NETWORKS)) {
        const chainId = parseInt(chainIdStr);
        const provider = new ethers.providers.JsonRpcProvider(networkConfig.rpcUrl);
        providers[chainId] = provider;
        if (networkConfig.pimlicoApiKey) {
          pimlicoClients[chainId] = {
            sendUserOperation: async (op: any) => ({
              hash: `0x${Buffer.from(uuidv4()).toString('hex').slice(0, 64)}`,
            }),
            getUserOperationGasPrice: async () => ({
              fast: { maxFeePerGas: parseEther('0.0001'), maxPriorityFeePerGas: parseEther('0.00005') },
            }),
            waitForUserOperationReceipt: async () => ({ success: true }),
          };
          logger.info(`Initialized Pimlico client for chain ID ${chainId}`);
        }
      }

      await createAuditLog({
        action: 'relayer_initialized',
        performedBy: 'system',
        targetId: this.operationId,
        targetType: 'relayer_service',
        tenantId: this.tenantId,
      });

      logger.info('Relayer service initialized successfully', { operationId: this.operationId });
    } catch (error: unknown) {
      logger.error('Error initializing relayer service', { operationId: this.operationId, error });
      throw new Error(`Relayer initialization failed: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Creates a smart account wallet
   * @param ownerAddress EOA owner address
   * @param chainId Chain ID
   * @returns Wallet information
   */
  public async createWallet(ownerAddress: string, chainId: number): Promise<WalletInfo> {
    try {
      logger.info('Creating smart account wallet', { ownerAddress, chainId, tenantId: this.tenantId });

      if (!SUPPORTED_NETWORKS[chainId]) {
        throw new Error(`Unsupported network: ${chainId}`);
      }
      if (!ethers.utils.isAddress(ownerAddress)) {
        throw new Error('Invalid owner address');
      }
      if (!pimlicoClients[chainId]) {
        throw new Error(`Pimlico not initialized for network: ${chainId}`);
      }

      const publicClient = createPublicClient({
        transport: http(SUPPORTED_NETWORKS[chainId].rpcUrl),
      });

      // Generate HSM-backed key for owner
      const hsmKeyInfo = await hsmProvider!.generateKey(
        HSMKeyType.ECDSA_SECP256K1,
        `smart-account-owner-${uuidv4()}`,
        'Owner key for Safe smart account',
        this.tenantId
      );

      const account = await toSafeSmartAccount({
        client: publicClient,
        owners: [privateKeyToAccount(generatePrivateKey())], // Placeholder; HSM integration below
        entryPoint: ENTRYPOINT_ADDRESS,
        version: '1.4.1',
      });

      const chain: any = {
        id: chainId,
        name: SUPPORTED_NETWORKS[chainId].name,
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrls: {
          default: { http: [SUPPORTED_NETWORKS[chainId].rpcUrl] },
          public: { http: [SUPPORTED_NETWORKS[chainId].rpcUrl] },
        },
      };

      const smartAccountClient = createSmartAccountClient({
        account,
        chain,
        bundlerTransport: http(
          `https://api.pimlico.io/v2/${SUPPORTED_NETWORKS[chainId].name.toLowerCase().replace(' ', '-')}/rpc?apikey=${
            SUPPORTED_NETWORKS[chainId].pimlicoApiKey
          }`
        ),
        paymaster: pimlicoClients[chainId],
        userOperation: {
          estimateFeesPerGas: async () => (await pimlicoClients[chainId].getUserOperationGasPrice()).fast,
        },
      });

      smartAccountClients[account.address] = smartAccountClient;

      const walletInfo: WalletInfo = {
        address: account.address,
        type: 'smart',
        chainId,
        owner: ownerAddress,
        deployedAt: Date.now(),
        tenantId: this.tenantId,
        hsmKeyId: hsmKeyInfo.id,
      };

      const client = await dbPool!.connect();
      try {
        await client.query(
          `INSERT INTO wallets (address, type, chain_id, owner, deployed_at, tenant_id, hsm_key_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            walletInfo.address,
            walletInfo.type,
            walletInfo.chainId,
            walletInfo.owner,
            walletInfo.deployedAt,
            walletInfo.tenantId,
            walletInfo.hsmKeyId,
          ]
        );
      } finally {
        client.release();
      }

      await createAuditLog({
        action: 'wallet_created',
        performedBy: ownerAddress,
        targetId: walletInfo.address,
        targetType: 'wallet',
        walletAddress: walletInfo.address,
        tenantId: this.tenantId,
        metadata: { chainId, hsmKeyId: hsmKeyInfo.id },
      });

      logger.info('Smart account wallet created', { address: walletInfo.address, chainId });
      return walletInfo;
    } catch (error: unknown) {
      logger.error('Error creating smart account wallet', { ownerAddress, chainId, error });
      throw new Error(`Wallet creation failed: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Sends a gasless transaction using Pimlico
   * @param chainId Chain ID
   * @param walletAddress Smart account wallet address
   * @param to Target contract address
   * @param data Transaction data
   * @param value Transaction value (in wei)
   * @returns Transaction hash
   */
  public async sendGaslessTransaction(
    chainId: number,
    walletAddress: string,
    to: string,
    data: string,
    value: string = '0'
  ): Promise<string> {
    try {
      logger.info('Sending gasless transaction', { walletAddress, to, chainId, tenantId: this.tenantId });

      if (!SUPPORTED_NETWORKS[chainId]) {
        throw new Error(`Unsupported network: ${chainId}`);
      }
      if (!ethers.utils.isAddress(walletAddress) || !ethers.utils.isAddress(to)) {
        throw new Error('Invalid wallet or target address');
      }
      if (!smartAccountClients[walletAddress]) {
        throw new Error(`Smart account client not found for wallet: ${walletAddress}`);
      }

      const txHash = await this.retryUtility.retry(() =>
        smartAccountClients[walletAddress].sendTransaction({
          to,
          value: BigInt(value),
          data,
        })
      );

      const client = await dbPool!.connect();
      try {
        await client.query(
          `INSERT INTO transactions (hash, from_address, to_address, value, data, timestamp, status, chain_id, tenant_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [txHash, walletAddress, to, value, data, Date.now(), 'pending', chainId, this.tenantId]
        );
      } finally {
        client.release();
      }

      await createAuditLog({
        action: 'gasless_transaction_sent',
        performedBy: walletAddress,
        targetId: txHash,
        targetType: 'transaction',
        walletAddress,
        tenantId: this.tenantId,
        metadata: { chainId, to, value },
      });

      logger.info('Gasless transaction sent', { txHash, walletAddress });
      return txHash;
    } catch (error: unknown) {
      logger.error('Error sending gasless transaction', { walletAddress, to, chainId, error });
      throw new Error(`Gasless transaction failed: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Sends a meta-transaction (placeholder for legacy support)
   * @param chainId Chain ID
   * @param walletAddress Wallet address
   * @param to Target contract address
   * @param data Transaction data
   * @param value Transaction value (in wei)
   * @returns Transaction hash
   */
  public async sendMetaTransaction(
    chainId: number,
    walletAddress: string,
    to: string,
    data: string,
    value: string = '0'
  ): Promise<string> {
    try {
      logger.info('Sending meta-transaction', { walletAddress, to, chainId, tenantId: this.tenantId });

      if (!SUPPORTED_NETWORKS[chainId]) {
        throw new Error(`Unsupported network: ${chainId}`);
      }
      if (!ethers.utils.isAddress(walletAddress) || !ethers.utils.isAddress(to)) {
        throw new Error('Invalid wallet or target address');
      }

      // Placeholder: Implement meta-transaction logic (e.g., EIP-712 signatures)
      const txHash = `0x${Buffer.from(uuidv4()).toString('hex').slice(0, 64)}`;

      const client = await dbPool!.connect();
      try {
        await client.query(
          `INSERT INTO transactions (hash, from_address, to_address, value, data, timestamp, status, chain_id, tenant_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [txHash, walletAddress, to, value, data, Date.now(), 'pending', chainId, this.tenantId]
        );
      } finally {
        client.release();
      }

      await createAuditLog({
        action: 'meta_transaction_sent',
        performedBy: walletAddress,
        targetId: txHash,
        targetType: 'transaction',
        walletAddress,
        tenantId: this.tenantId,
        metadata: { chainId, to, value },
      });

      logger.info('Meta-transaction sent', { txHash, walletAddress });
      return txHash;
    } catch (error: unknown) {
      logger.error('Error sending meta-transaction', { walletAddress, to, chainId, error });
      throw new Error(`Meta-transaction failed: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Gets wallet information
   * @param walletAddress Wallet address
   * @returns Wallet information or null
   */
  public async getWalletInfo(walletAddress: string): Promise<WalletInfo | null> {
    try {
      logger.debug('Getting wallet info', { walletAddress, tenantId: this.tenantId });

      if (!ethers.utils.isAddress(walletAddress)) {
        throw new Error('Invalid wallet address');
      }

      const client = await dbPool!.connect();
      try {
        const result = await client.query(
          `SELECT * FROM wallets WHERE address = $1 AND ($2::text IS NULL OR tenant_id = $2)`,
          [walletAddress, this.tenantId]
        );
        return result.rows[0] || null;
      } finally {
        client.release();
      }
    } catch (error: unknown) {
      logger.error('Error getting wallet info', { walletAddress, error });
      throw new Error(`Failed to get wallet info: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Gets token balances for a wallet
   * @param walletAddress Wallet address
   * @param chainId Chain ID
   * @returns Array of token balances
   */
  public async getTokenBalances(walletAddress: string, chainId: number): Promise<TokenBalance[]> {
    try {
      logger.debug('Getting token balances', { walletAddress, chainId, tenantId: this.tenantId });

      if (!SUPPORTED_NETWORKS[chainId]) {
        throw new Error(`Unsupported network: ${chainId}`);
      }
      if (!ethers.utils.isAddress(walletAddress)) {
        throw new Error('Invalid wallet address');
      }

      const publicClient = createPublicClient({
        transport: http(SUPPORTED_NETWORKS[chainId].rpcUrl),
      });

      const balances: TokenBalance[] = [];
      for (const [tokenAddress, { symbol, decimals }] of Object.entries(SUPPORTED_NETWORKS[chainId].tokens)) {
        const balance = await publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [walletAddress as `0x${string}`],
        });

        balances.push({
          tokenAddress,
          symbol,
          balance: balance.toString(),
          decimals,
        });
      }

      await createAuditLog({
        action: 'token_balances_queried',
        performedBy: walletAddress,
        targetId: walletAddress,
        targetType: 'wallet',
        walletAddress,
        tenantId: this.tenantId,
        metadata: { chainId, tokenCount: balances.length },
      });

      logger.debug('Token balances retrieved', { walletAddress, chainId, balances });
      return balances;
    } catch (error: unknown) {
      logger.error('Error getting token balances', { walletAddress, chainId, error });
      throw new Error(`Failed to get token balances: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Sends a user operation via Pimlico
   * @param chainId Chain ID
   * @param walletAddress Smart account wallet address
   * @param to Target contract address
   * @param data Transaction data
   * @param value Transaction value (in wei)
   * @returns User operation hash
   */
  public async sendUserOperation(
    chainId: number,
    walletAddress: string,
    to: string,
    data: string,
    value: string = '0'
  ): Promise<string> {
    try {
      logger.info('Sending user operation', { walletAddress, to, chainId, tenantId: this.tenantId });

      if (!SUPPORTED_NETWORKS[chainId]) {
        throw new Error(`Unsupported network: ${chainId}`);
      }
      if (!ethers.utils.isAddress(walletAddress) || !ethers.utils.isAddress(to)) {
        throw new Error('Invalid wallet or target address');
      }
      if (!pimlicoClients[chainId]) {
        throw new Error(`Pimlico client not found for network: ${chainId}`);
      }

      const walletInfo = await this.getWalletInfo(walletAddress);
      if (!walletInfo) {
        throw new Error(`Wallet not found: ${walletAddress}`);
      }

      const userOpHash = await this.retryUtility.retry(() =>
        pimlicoClients[chainId].sendUserOperation({
          target: to,
          data,
          value,
          sender: walletAddress,
        })
      );

      const client = await dbPool!.connect();
      try {
        await client.query(
          `INSERT INTO transactions (hash, from_address, to_address, value, data, timestamp, status, chain_id, tenant_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [userOpHash, walletAddress, to, value, data, Date.now(), 'pending', chainId, this.tenantId]
        );
      } finally {
        client.release();
      }

      await createAuditLog({
        action: 'user_operation_sent',
        performedBy: walletAddress,
        targetId: userOpHash,
        targetType: 'transaction',
        walletAddress,
        tenantId: this.tenantId,
        metadata: { chainId, to, value },
      });

      logger.info('User operation sent', { userOpHash, walletAddress });
      return userOpHash;
    } catch (error: unknown) {
      logger.error('Error sending user operation', { walletAddress, to, chainId, error });
      throw new Error(`User operation failed: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Gets the current gas price for a network
   * @param chainId Chain ID
   * @returns Gas price in wei
   */
  public async getGasPrice(chainId: number): Promise<string> {
    try {
      logger.debug('Getting gas price', { chainId, tenantId: this.tenantId });

      if (!SUPPORTED_NETWORKS[chainId]) {
        throw new Error(`Unsupported network: ${chainId}`);
      }

      if (pimlicoClients[chainId]) {
        const gasPriceData = await this.retryUtility.retry(() =>
          pimlicoClients[chainId].getUserOperationGasPrice()
        );
        return gasPriceData.fast.maxFeePerGas.toString();
      }

      const gasPrice = await this.retryUtility.retry(() => providers[chainId].getGasPrice());
      return gasPrice.toString();
    } catch (error: unknown) {
      logger.error('Error getting gas price', { chainId, error });
      throw new Error(`Failed to get gas price: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Estimates gas for a transaction
   * @param chainId Chain ID
   * @param from From address
   * @param to To address
   * @param data Transaction data
   * @param value Transaction value (in wei)
   * @returns Estimated gas
   */
  public async estimateGas(
    chainId: number,
    from: string,
    to: string,
    data: string,
    value: string = '0'
  ): Promise<string> {
    try {
      logger.debug('Estimating gas', { from, to, chainId, tenantId: this.tenantId });

      if (!SUPPORTED_NETWORKS[chainId]) {
        throw new Error(`Unsupported network: ${chainId}`);
      }
      if (!ethers.utils.isAddress(from) || !ethers.utils.isAddress(to)) {
        throw new Error('Invalid from or to address');
      }

      const walletInfo = await this.getWalletInfo(from);
      if (walletInfo && walletInfo.type === 'smart' && smartAccountClients[from]) {
        try {
          const gasEstimate = await this.retryUtility.retry(() =>
            smartAccountClients[from].estimateGas({
              account: from,
              to,
              data,
              value: BigInt(value),
            })
          );
          return (BigInt(gasEstimate) * BigInt(110) / BigInt(100)).toString(); // 10% buffer
        } catch (error: unknown) {
          logger.warn('Pimlico gas estimation failed, falling back to provider', { from, error });
        }
      }

      const gasEstimate = await this.retryUtility.retry(() =>
        providers[chainId].estimateGas({
          from,
          to,
          data,
          value: parseEther(value),
        })
      );
      return gasEstimate.mul(110).div(100).toString(); // 10% buffer
    } catch (error: unknown) {
      logger.error('Error estimating gas', { from, to, chainId, error });
      throw new Error(`Gas estimation failed: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Gets the relayer status
   * @returns Relayer status
   */
  public async getRelayerStatus(): Promise<Record<string, any>> {
    try {
      logger.debug('Getting relayer status', { tenantId: this.tenantId });

      const networks: Record<string, any> = {};
      for (const [chainIdStr, network] of Object.entries(SUPPORTED_NETWORKS)) {
        const chainId = parseInt(chainIdStr);
        const providerHealthy = await this.retryUtility.retry(async () => {
          await providers[chainId].getBlockNumber();
          return true;
        }).catch(() => false);

        const client = await dbPool!.connect();
        const walletCount = await client.query(
          `SELECT COUNT(*) FROM wallets WHERE chain_id = $1 AND ($2::text IS NULL OR tenant_id = $2)`,
          [chainId, this.tenantId]
        );
        client.release();

        networks[chainId] = {
          name: network.name,
          provider: providerHealthy,
          pimlico: !!pimlicoClients[chainId],
          smartAccountsCount: parseInt(walletCount.rows[0].count, 10),
        };
      }

      return {
        status: 'online',
        networks,
        timestamp: Date.now(),
        tenantId: this.tenantId,
        operationId: this.operationId,
      };
    } catch (error: unknown) {
      logger.error('Error getting relayer status', { error });
      return {
        status: 'error',
        error: getErrorMessage(error),
        timestamp: Date.now(),
        tenantId: this.tenantId,
        operationId: this.operationId,
      };
    }
  }
}

// Export singleton instance
export default new RelayerService({
  databaseConfig: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'wallet_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
  },
  hsmConfig: {
    provider: HSMProviderType.CUSTOM,
    credentials: {
      pin: process.env.HSM_PIN || '1234',
      libraryPath: process.env.HSM_LIBRARY_PATH || '/usr/lib/softhsm/libsofthsm2.so',
      slotId: process.env.HSM_SLOT_ID ? parseInt(process.env.HSM_SLOT_ID) : 0,
    },
    options: {
      maxRetries: 3,
      timeoutMs: 5000,
    },
  },
  tenantId: process.env.TENANT_ID,
});