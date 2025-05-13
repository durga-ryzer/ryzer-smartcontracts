import { providers, ethers } from 'ethers';
import { getDatabase } from '../../config/database';
import { logger } from '../../utils/logger';
import { NetworkConfig as ImportedNetworkConfig } from '../../config/networks';
import { createHSMProvider, HSMProviderType, HSMProvider } from '../hsm';
import { createAuditLog } from '../../audit';
import { RetryUtility } from '../../utils/retry';
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { v4 as uuidv4 } from 'uuid';
import sdkService from '../sdk-integration';
import { simulateTransaction } from '../simulation';

// Enum for bridge providers
export enum BridgeProvider {
  AXELAR = 'axelar',
  WORMHOLE = 'wormhole',
  LAYERZERO = 'layerzero',
  SYNAPSE = 'synapse',
  ACROSS = 'across',
  STARGATE = 'stargate',
  CONNEXT = 'connext',
  CELER = 'celer',
  HYPHEN = 'hyphen',
}

// Interface for cross-chain transaction
export interface CrossChainTransaction {
  id: string;
  sourceChainId: number;
  destinationChainId: number;
  sender: string;
  recipient: string;
  token: string;
  amount: string;
  bridgeProvider: BridgeProvider;
  status: 'pending' | 'bridging' | 'completed' | 'failed';
  sourceTxHash?: string;
  destinationTxHash?: string;
  fee?: string;
  estimatedTime?: number;
  timestamp: number;
  completedAt?: number;
  error?: string;
  tenantId?: string;
}

// Interface for bridge fee
export interface BridgeFee {
  amount: string;
  token: string;
  gasEstimate: string;
  estimatedTime: number;
}

// Network configuration
interface NetworkConfig {
  name: string;
  rpcUrl: string;
  chainId: number;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorerUrl: string;
}

// Supported networks
const NETWORK_CONFIG: Record<string, NetworkConfig> = {
  1: {
    name: 'Ethereum Mainnet',
    rpcUrl: process.env.ETH_MAINNET_RPC_URL || 'https://eth.llamarpc.com',
    chainId: 1,
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    blockExplorerUrl: 'https://etherscan.io',
  },
  137: {
    name: 'Polygon Mainnet',
    rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
    chainId: 137,
    nativeCurrency: {
      name: 'Polygon',
      symbol: 'MATIC',
      decimals: 18,
    },
    blockExplorerUrl: 'https://polygonscan.com',
  },
  56: {
    name: 'BNB Chain',
    rpcUrl: process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org',
    chainId: 56,
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18,
    },
    blockExplorerUrl: 'https://bscscan.com',
  },
  43114: {
    name: 'Avalanche C-Chain',
    rpcUrl: process.env.AVALANCHE_RPC_URL || 'https://api.avax.network/ext/bc/C/rpc',
    chainId: 43114,
    nativeCurrency: {
      name: 'Avalanche',
      symbol: 'AVAX',
      decimals: 18,
    },
    blockExplorerUrl: 'https://snowtrace.io',
  },
  42161: {
    name: 'Arbitrum One',
    rpcUrl: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
    chainId: 42161,
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    blockExplorerUrl: 'https://arbiscan.io',
  },
  10: {
    name: 'Optimism',
    rpcUrl: process.env.OPTIMISM_RPC_URL || 'https://mainnet.optimism.io',
    chainId: 10,
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    blockExplorerUrl: 'https://optimistic.etherscan.io',
  },
};

// Bridge configuration
interface BridgeConfig {
  provider: BridgeProvider;
  name: string;
  enabled: boolean;
  supportedChains: number[];
  supportedTokens: Record<number, string[]>;
  contractAddresses: Record<number, string>;
  apiUrl?: string;
  apiKey?: string;
}

// Bridge adapter interface
interface BridgeAdapter {
  getContractAddress(chainId: number): string;
  isRouteSupported(sourceChainId: number, destinationChainId: number): Promise<boolean>;
  buildTransaction(params: {
    sourceChainId: number;
    destinationChainId: number;
    sender: string;
    recipient: string;
    token: string;
    amount: string;
  }): Promise<{ data: string; value: string }>;
  getFee(sourceChainId: number, destinationChainId: number, token: string, amount: string): Promise<BridgeFee>;
  getTransactionStatus(txHash: string, sourceChainId: number, destinationChainId: number): Promise<string>;
}

// Token information
const tokenInfo: Record<number, Record<string, { address: string; decimals: number }>> = {
  1: {
    USDC: { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
    USDT: { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
    DAI: { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18 },
    WETH: { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18 },
    WBTC: { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8 },
  },
  137: {
    USDC: { address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', decimals: 6 },
    USDT: { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals: 6 },
    DAI: { address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', decimals: 18 },
    WMATIC: { address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', decimals: 18 },
    WETH: { address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', decimals: 18 },
  },
  56: {
    USDC: { address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', decimals: 18 },
    USDT: { address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18 },
    DAI: { address: '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3', decimals: 18 },
    WBNB: { address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', decimals: 18 },
    WETH: { address: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', decimals: 18 },
  },
  43114: {
    USDC: { address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', decimals: 6 },
    USDT: { address: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7', decimals: 6 },
    DAI: { address: '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70', decimals: 18 },
    WAVAX: { address: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', decimals: 18 },
    WETH: { address: '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB', decimals: 18 },
  },
  42161: {
    USDC: { address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', decimals: 6 },
    USDT: { address: '0xFd086bC7CD5Questions?C6a4523cb4128E7785C2ED91B', decimals: 6 },
    DAI: { address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', decimals: 18 },
    WETH: { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18 },
  },
  10: {
    USDC: { address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', decimals: 6 },
    USDT: { address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', decimals: 6 },
    DAI: { address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', decimals: 18 },
    WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
  },
};

// Bridge configurations
const bridgeConfigs: BridgeConfig[] = [
  {
    provider: BridgeProvider.AXELAR,
    name: 'Axelar Network',
    enabled: true,
    supportedChains: [1, 137, 56, 43114, 42161, 10],
    supportedTokens: {
      1: ['USDC', 'USDT', 'DAI', 'WETH', 'WBTC'],
      137: ['USDC', 'USDT', 'DAI', 'WMATIC', 'WETH'],
      56: ['USDC', 'USDT', 'DAI', 'WBNB', 'WETH'],
      43114: ['USDC', 'USDT', 'DAI', 'WAVAX', 'WETH'],
      42161: ['USDC', 'USDT', 'DAI', 'WETH'],
      10: ['USDC', 'USDT', 'DAI', 'WETH'],
    },
    contractAddresses: {
      1: '0x4F4495243837681061C4743b74B3eEdf548D56A5',
      137: '0x6f015F16De9fC8791b234eF68D486d2bF203FBA8',
      56: '0x304acf330bbE08d1e512eefaa92F6a57871fD895',
      43114: '0x5029C0EFf6C34351a0CEc334542cDb22c7928f78',
      42161: '0xE432150cce91c13a887f7D836923d5597adD8E31',
      10: '0x6A39909e805A3eaDd2b61fFf61147796ca6aBB47',
    },
    apiUrl: 'https://api.axelar.network',
    apiKey: process.env.AXELAR_API_KEY,
  },
  {
    provider: BridgeProvider.WORMHOLE,
    name: 'Wormhole',
    enabled: true,
    supportedChains: [1, 137, 56, 43114, 42161, 10],
    supportedTokens: {
      1: ['USDC', 'USDT', 'DAI', 'WETH', 'WBTC'],
      137: ['USDC', 'USDT', 'DAI', 'WMATIC', 'WETH'],
      56: ['USDC', 'USDT', 'DAI', 'WBNB', 'WETH'],
      43114: ['USDC', 'USDT', 'DAI', 'WAVAX', 'WETH'],
      42161: ['USDC', 'USDT', 'DAI', 'WETH'],
      10: ['USDC', 'USDT', 'DAI', 'WETH'],
    },
    contractAddresses: {
      1: '0x98f3c9e6E3fAce36bAAd05FE09d375Ef1464288B',
      137: '0x7A4B5a56256163F07b2C80A7cA55aBE66c4ec4d7',
      56: '0x98f3c9e6E3fAce36bAAd05FE09d375Ef1464288B',
      43114: '0x54a8e5f9c4CbA08F9943965859F6c34eAF03E26c',
      42161: '0xa5f208e072434bC67592E4C49C1B991BA79BCA46',
      10: '0xEe91C335eab126dF5fDB3797EA9d6aD93aeC9722',
    },
    apiUrl: 'https://api.wormhole.com',
    apiKey: process.env.WORMHOLE_API_KEY,
  },
];

// IndexedDB schema
interface CrossChainDB extends DBSchema {
  crossChainTransactions: {
    key: string;
    value: CrossChainTransaction;
    indexes: { 'by-sender': string; 'by-recipient': string; 'by-tenantId': string };
  };
}

/**
 * CrossChainService class to handle cross-chain transactions
 */
export class CrossChainService {
  private dbPromise: Promise<IDBPDatabase<CrossChainDB>>;
  private hsmProvider: HSMProvider;
  private retryUtility: RetryUtility;
  private operationId: string = uuidv4();
  private tenantId?: string;
  private providers: Record<number, providers.JsonRpcProvider> = {};

  constructor(config: {
    databaseName: string;
    hsmConfig: {
      provider: HSMProviderType;
      credentials: { pin: string; libraryPath: string; slotId?: number };
      options?: { fipsCompliance?: boolean; maxRetries?: number; timeoutMs?: number };
    };
    tenantId?: string;
  }) {
    this.dbPromise = openDB<CrossChainDB>(config.databaseName, 1, {
      upgrade(db) {
        const txStore = db.createObjectStore('crossChainTransactions', { keyPath: 'id' });
        txStore.createIndex('by-sender', 'sender');
        txStore.createIndex('by-recipient', 'recipient');
        txStore.createIndex('by-tenantId', 'tenantId');
      },
    });
    this.hsmProvider = createHSMProvider(config.hsmConfig);
    this.retryUtility = new RetryUtility({ maxRetries: 3, baseDelayMs: 100, maxDelayMs: 1000 });
    this.tenantId = config.tenantId;
    logger.debug('CrossChainService instantiated', { operationId: this.operationId, tenantId: this.tenantId });
  }

  /**
   * Initializes the cross-chain service
   */
  public async initialize(): Promise<void> {
    try {
      const db = await this.dbPromise;
      if (!db) {
        throw new Error('Failed to initialize database');
      }

      logger.info('Initializing cross-chain service', { operationId: this.operationId, tenantId: this.tenantId });

      // Validate HSM configuration
      await this.retryUtility.retry(() => this.hsmProvider.validateConfig());

      // Initialize providers
      for (const [chainIdStr, network] of Object.entries(NETWORK_CONFIG)) {
        const chainId = parseInt(chainIdStr);
        this.providers[chainId] = new providers.JsonRpcProvider(network.rpcUrl);
      }

      // Ensure IndexedDB is accessible and resume monitoring
      const pendingTxs = await db.getAll('crossChainTransactions');
      for (const tx of pendingTxs) {
        if (tx.status === 'pending' || tx.status === 'bridging') {
          this.monitorCrossChainTransaction(tx.id);
        }
      }

      await createAuditLog({
        action: 'cross_chain_service_initialized',
        performedBy: 'system',
        targetId: this.operationId,
        targetType: 'cross_chain_service',
        tenantId: this.tenantId,
      });

      logger.info('Cross-chain service initialized successfully', { operationId: this.operationId });
    } catch (error) {
      logger.error('Error initializing cross-chain service', { operationId: this.operationId, error });
      throw new Error(`Initialization failed: ${error.message}`);
    }
  }

  /**
   * Creates Axelar adapter
   */
  private createAxelarAdapter(config: BridgeConfig): BridgeAdapter {
    return {
      getContractAddress: (chainId: number) => config.contractAddresses[chainId] || '',
      isRouteSupported: async (sourceChainId: number, destinationChainId: number) =>
        config.supportedChains.includes(sourceChainId) && config.supportedChains.includes(destinationChainId),
      buildTransaction: async ({ sourceChainId, destinationChainId, sender, recipient, token, amount }) => {
        const tokenData = tokenInfo[sourceChainId]?.[token];
        if (!tokenData) throw new Error(`Token ${token} not supported on chain ${sourceChainId}`);
        // Placeholder: Implement Axelar-specific transaction encoding
        return { data: '0x', value: '0' };
      },
      getFee: async (sourceChainId, destinationChainId, token) => ({
        amount: ethers.utils.parseUnits('0.001', 18).toString(),
        token: 'AXELAR',
        gasEstimate: '500000',
        estimatedTime: 15 * 60,
      }),
      getTransactionStatus: async (txHash) => 'pending', // Placeholder
    };
  }

  /**
   * Creates Wormhole adapter
   */
  private createWormholeAdapter(config: BridgeConfig): BridgeAdapter {
    return {
      getContractAddress: (chainId: number) => config.contractAddresses[chainId] || '',
      isRouteSupported: async (sourceChainId: number, destinationChainId: number) =>
        config.supportedChains.includes(sourceChainId) && config.supportedChains.includes(destinationChainId),
      buildTransaction: async ({ sourceChainId, destinationChainId, sender, recipient, token, amount }) => {
        const tokenData = tokenInfo[sourceChainId]?.[token];
        if (!tokenData) throw new Error(`Token ${token} not supported on chain ${sourceChainId}`);
        // Placeholder: Implement Wormhole-specific transaction encoding
        return { data: '0x', value: '0' };
      },
      getFee: async (sourceChainId, destinationChainId, token) => ({
        amount: ethers.utils.parseUnits('0.002', 18).toString(),
        token: 'WORMHOLE',
        gasEstimate: '600000',
        estimatedTime: 20 * 60,
      }),
      getTransactionStatus: async (txHash) => 'pending', // Placeholder
    };
  }

  /**
   * Gets bridge adapter
   */
  private getBridgeAdapter(provider: BridgeProvider): BridgeAdapter | null {
    const config = bridgeConfigs.find((c) => c.provider === provider);
    if (!config || !config.enabled) return null;
    switch (provider) {
      case BridgeProvider.AXELAR:
        return this.createAxelarAdapter(config);
      case BridgeProvider.WORMHOLE:
        return this.createWormholeAdapter(config);
      default:
        return null;
    }
  }

  /**
   * Gets bridge fee
   */
  public async getBridgeFee(
    bridgeProvider: BridgeProvider,
    sourceChainId: number,
    destinationChainId: number,
    token: string,
    amount: string
  ): Promise<BridgeFee | null> {
    try {
      logger.debug('Getting bridge fee', {
        bridgeProvider,
        sourceChainId,
        destinationChainId,
        token,
        tenantId: this.tenantId,
      });

      const config = bridgeConfigs.find((c) => c.provider === bridgeProvider);
      if (!config || !config.enabled) throw new Error(`Bridge provider ${bridgeProvider} not found or disabled`);
      if (!config.supportedChains.includes(sourceChainId) || !config.supportedChains.includes(destinationChainId))
        throw new Error(`Bridge provider ${bridgeProvider} does not support chains ${sourceChainId} -> ${destinationChainId}`);
      if (!config.supportedTokens[sourceChainId]?.includes(token))
        throw new Error(`Token ${token} not supported on chain ${sourceChainId}`);
      if (!/^\d+$/.test(amount)) throw new Error('Invalid amount');

      const bridgeAdapter = this.getBridgeAdapter(bridgeProvider);
      if (!bridgeAdapter) throw new Error(`Bridge adapter for ${bridgeProvider} not found`);

      const fee = await this.retryUtility.retry(() =>
        bridgeAdapter.getFee(sourceChainId, destinationChainId, token, amount)
      );

      await createAuditLog({
        action: 'bridge_fee_queried',
        performedBy: 'system',
        targetId: `${bridgeProvider}-${sourceChainId}-${destinationChainId}`,
        targetType: 'bridge_fee',
        tenantId: this.tenantId,
        metadata: { token, amount, fee },
      });

      return fee;
    } catch (error: unknown) {
      logger.error('Error getting bridge fee', { bridgeProvider, sourceChainId, destinationChainId, error });
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Bridge fee query failed: ${errorMessage}`);
      return null;
    }
  }

  /**
   * Sends a transaction using HSM-backed wallet
   */
  private async sendTransaction(
    chainId: number,
    from: string,
    to: string,
    data: string,
    value: string = '0',
    hsmKeyId: string
  ): Promise<string> {
    try {
      const networkConfig = NETWORK_CONFIG[chainId.toString()];
      if (!networkConfig) throw new Error(`Network with chain ID ${chainId} is not supported`);
      if (!ethers.utils.isAddress(from) || !ethers.utils.isAddress(to))
        throw new Error('Invalid from or to address');
      if (!ethers.utils.isHexString(data)) throw new Error('Invalid transaction data');
      if (!/^\d+$/.test(value)) throw new Error('Invalid transaction value');

      const provider = this.providers[chainId];
      const nonce = await this.retryUtility.retry(() => provider.getTransactionCount(from, 'pending'));
      const gasPrice = await this.retryUtility.retry(() => provider.getGasPrice());
      const gasLimit = await this.retryUtility.retry(() =>
        provider.estimateGas({ from, to, data, value: ethers.utils.parseEther(value) })
      );

      const tx = {
        to,
        value: ethers.utils.parseEther(value),
        data,
        nonce,
        gasPrice,
        gasLimit,
        chainId,
      };

      // Simulate transaction with all required parameters
      const simulationResult = await simulateTransaction(
        chainId,
        tx,
        from,
        this.providers[chainId],
        { maxFeePerGas: gasPrice }
      );

      if (!simulationResult.success) {
        throw new Error(`Transaction simulation failed: ${simulationResult.error}`);
      }

      // Sign transaction with HSM
      const signature = await this.retryUtility.retry(() =>
        this.hsmProvider.sign(hsmKeyId, ethers.utils.serializeTransaction(tx), this.tenantId)
      );
      const signedTx = ethers.utils.serializeTransaction(tx, signature);

      // Send transaction
      const txResponse = await this.retryUtility.retry(() => provider.sendTransaction(signedTx));
      await txResponse.wait();

      await createAuditLog({
        action: 'transaction_sent',
        performedBy: from,
        targetId: txResponse.hash,
        targetType: 'transaction',
        tenantId: this.tenantId,
        metadata: { chainId, to, value, hsmKeyId },
      });

      return txResponse.hash;
    } catch (error: unknown) {
      logger.error('Error sending transaction', { chainId, from, to, error });
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Transaction failed: ${errorMessage}`);
    }
  }

  /**
   * Executes a cross-chain transaction
   */
  public async executeCrossChainTransaction(
    sourceChainId: number,
    destinationChainId: number,
    sender: string,
    recipient: string,
    token: string,
    amount: string,
    bridgeProvider: BridgeProvider,
    hsmKeyId: string
  ): Promise<string> {
    try {
      const db = await this.dbPromise;
      if (!db) {
        throw new Error('Database not initialized');
      }

      logger.info('Executing cross-chain transaction', {
        sourceChainId,
        destinationChainId,
        sender,
        recipient,
        token,
        bridgeProvider,
        tenantId: this.tenantId,
      });

      // Validate inputs
      if (!NETWORK_CONFIG[sourceChainId.toString()])
        throw new Error(`Source chain ${sourceChainId} not supported`);
      if (!NETWORK_CONFIG[destinationChainId.toString()])
        throw new Error(`Destination chain ${destinationChainId} not supported`);
      if (!ethers.utils.isAddress(sender) || !ethers.utils.isAddress(recipient))
        throw new Error('Invalid sender or recipient address');
      if (!tokenInfo[sourceChainId]?.[token]) throw new Error(`Token ${token} not supported on chain ${sourceChainId}`);
      if (!/^\d+$/.test(amount)) throw new Error('Invalid amount');

      const config = bridgeConfigs.find((c) => c.provider === bridgeProvider);
      if (!config || !config.enabled) throw new Error(`Bridge provider ${bridgeProvider} not found or disabled`);
      if (!config.supportedTokens[sourceChainId]?.includes(token))
        throw new Error(`Token ${token} not supported by ${bridgeProvider} on chain ${sourceChainId}`);

      const transactionId = `cc-${sourceChainId}-${destinationChainId}-${Date.now()}-${uuidv4().slice(0, 8)}`;
      const crossChainTx: CrossChainTransaction = {
        id: transactionId,
        sourceChainId,
        destinationChainId,
        sender,
        recipient,
        token,
        amount,
        bridgeProvider,
        status: 'pending',
        timestamp: Date.now(),
        tenantId: this.tenantId,
      };

      await db.put('crossChainTransactions', crossChainTx);

      try {
        const txHash = await this.retryUtility.retry(() =>
          sdkService.executeCrossChainTransfer(sourceChainId, destinationChainId, sender, token, amount, recipient)
        );

        await db.put('crossChainTransactions', { ...crossChainTx, sourceTxHash: txHash, status: 'bridging' });
        this.monitorCrossChainTransaction(transactionId);

        await createAuditLog({
          action: 'cross_chain_transaction_executed',
          performedBy: sender,
          targetId: transactionId,
          targetType: 'cross_chain_transaction',
          walletAddress: sender,
          tenantId: this.tenantId,
          metadata: { sourceChainId, destinationChainId, token, amount, txHash, bridgeProvider },
        });

        return txHash;
      } catch (sdkError) {
        logger.warn('SDK cross-chain transfer failed, falling back to legacy method', { error: sdkError });

        const bridgeAdapter = this.getBridgeAdapter(bridgeProvider);
        if (!bridgeAdapter) throw new Error(`Bridge provider ${bridgeProvider} not supported`);

        const isRouteSupported = await this.retryUtility.retry(() =>
          bridgeAdapter.isRouteSupported(sourceChainId, destinationChainId)
        );
        if (!isRouteSupported)
          throw new Error(`Route from chain ${sourceChainId} to chain ${destinationChainId} not supported by ${bridgeProvider}`);

        const { data, value } = await this.retryUtility.retry(() =>
          bridgeAdapter.buildTransaction({ sourceChainId, destinationChainId, sender, recipient, token, amount })
        );

        const txHash = await this.sendTransaction(
          sourceChainId,
          sender,
          bridgeAdapter.getContractAddress(sourceChainId),
          data,
          value,
          hsmKeyId
        );

        await db.put('crossChainTransactions', { ...crossChainTx, sourceTxHash: txHash, status: 'bridging' });
        this.monitorCrossChainTransaction(transactionId);

        await createAuditLog({
          action: 'cross_chain_transaction_executed',
          performedBy: sender,
          targetId: transactionId,
          targetType: 'cross_chain_transaction',
          walletAddress: sender,
          tenantId: this.tenantId,
          metadata: { sourceChainId, destinationChainId, token, amount, txHash, bridgeProvider },
        });

        return txHash;
      }
    } catch (error) {
      logger.error('Error executing cross-chain transaction', {
        sourceChainId,
        destinationChainId,
        sender,
        bridgeProvider,
        error,
      });
      throw new Error(`Cross-chain transaction failed: ${error.message}`);
    }
  }

  /**
   * Monitors a cross-chain transaction
   */
  private async monitorCrossChainTransaction(transactionId: string): Promise<void> {
    try {
      const db = await this.dbPromise;
      if (!db) {
        throw new Error('Database not initialized');
      }

      const transaction = await db.get('crossChainTransactions', transactionId);
      if (!transaction) {
        logger.error(`Transaction ${transactionId} not found`);
        return;
      }

      if (transaction.status === 'completed' || transaction.status === 'failed') return;

      const bridgeAdapter = this.getBridgeAdapter(transaction.bridgeProvider);
      if (!bridgeAdapter) {
        logger.error(`Bridge adapter for ${transaction.bridgeProvider} not found`);
        return;
      }

      if (transaction.sourceTxHash) {
        const status = await this.retryUtility.retry(() =>
          bridgeAdapter.getTransactionStatus(
            transaction.sourceTxHash!,  // Non-null assertion since we checked above
            transaction.sourceChainId,
            transaction.destinationChainId
          )
        );

        if (status === 'completed') {
          await db.put('crossChainTransactions', {
            ...transaction,
            status: 'completed',
            completedAt: Date.now(),
          });
          await createAuditLog({
            action: 'cross_chain_transaction_completed',
            performedBy: transaction.sender,
            targetId: transactionId,
            targetType: 'cross_chain_transaction',
            walletAddress: transaction.sender,
            tenantId: this.tenantId,
            metadata: { sourceTxHash: transaction.sourceTxHash },
          });
        } else if (status === 'failed') {
          await db.put('crossChainTransactions', {
            ...transaction,
            status: 'failed',
            error: 'Transaction failed on bridge',
          });
          await createAuditLog({
            action: 'cross_chain_transaction_failed',
            performedBy: transaction.sender,
            targetId: transactionId,
            targetType: 'cross_chain_transaction',
            walletAddress: transaction.sender,
            tenantId: this.tenantId,
            metadata: { sourceTxHash: transaction.sourceTxHash, error: 'Bridge failure' },
          });
        } else {
          setTimeout(() => this.monitorCrossChainTransaction(transactionId), 60 * 1000);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Error monitoring cross-chain transaction ${transactionId}`, { error: errorMessage });
      setTimeout(() => this.monitorCrossChainTransaction(transactionId), 60 * 1000);
    }
  }

  /**
   * Gets a cross-chain transaction
   */
  public async getCrossChainTransaction(transactionId: string): Promise<CrossChainTransaction | null> {
    try {
      logger.debug('Getting cross-chain transaction', { transactionId, tenantId: this.tenantId });

      const db = await this.dbPromise;
      if (!db) {
        throw new Error('Database not initialized');
      }

      const transaction = await db.get('crossChainTransactions', transactionId);
      if (transaction && (!this.tenantId || transaction.tenantId === this.tenantId)) {
        return transaction;
      }
      return null;
    } catch (error) {
      logger.error(`Error getting cross-chain transaction ${transactionId}`, { error });
      return null;
    }
  }

  /**
   * Gets cross-chain transactions for a user
   */
  public async getCrossChainTransactionsForUser(address: string): Promise<CrossChainTransaction[]> {
    try {
      logger.debug('Getting cross-chain transactions for user', { address, tenantId: this.tenantId });

      if (!ethers.utils.isAddress(address)) throw new Error('Invalid address');

      const db = await this.dbPromise;
      if (!db) {
        throw new Error('Database not initialized');
      }

      const [senderTxs, recipientTxs] = await Promise.all([
        db.getAllFromIndex('crossChainTransactions', 'by-sender', address),
        db.getAllFromIndex('crossChainTransactions', 'by-recipient', address),
      ]);

      const transactions = [...senderTxs, ...recipientTxs].filter(
        (tx, index, self) => self.findIndex((t) => t.id === tx.id) === index && (!this.tenantId || tx.tenantId === this.tenantId)
      );

      await createAuditLog({
        action: 'cross_chain_transactions_queried',
        performedBy: address,
        targetId: address,
        targetType: 'user',
        walletAddress: address,
        tenantId: this.tenantId,
        metadata: { transactionCount: transactions.length },
      });

      return transactions;
    } catch (error) {
      logger.error(`Error getting cross-chain transactions for user ${address}`, { error });
      return [];
    }
  }

  /**
   * Gets supported bridge providers
   */
  public getSupportedBridgeProviders(): { provider: BridgeProvider; name: string }[] {
    return bridgeConfigs
      .filter((config) => config.enabled)
      .map((config) => ({
        provider: config.provider,
        name: config.name,
      }));
  }

  /**
   * Gets supported chains for a bridge provider
   */
  public getSupportedChains(bridgeProvider: BridgeProvider): number[] {
    const config = bridgeConfigs.find((c) => c.provider === bridgeProvider);
    return config?.supportedChains || [];
  }

  /**
   * Gets supported tokens for a chain and bridge provider
   */
  public getSupportedTokens(bridgeProvider: BridgeProvider, chainId: number): string[] {
    const config = bridgeConfigs.find((c) => c.provider === bridgeProvider);
    return config?.supportedTokens[chainId] || [];
  }

  /**
   * Gets cross-chain service status
   */
  public async getCrossChainServiceStatus(): Promise<{ active: boolean; pendingTransactions: number }> {
    try {
      logger.debug('Getting cross-chain service status', { tenantId: this.tenantId });

      const db = await this.dbPromise;
      if (!db) {
        throw new Error('Database not initialized');
      }

      const transactions = await db.getAll('crossChainTransactions');
      const pendingTransactions = transactions.filter(
        (tx) => (tx.status === 'pending' || tx.status === 'bridging') && (!this.tenantId || tx.tenantId === this.tenantId)
      ).length;

      return { active: true, pendingTransactions };
    } catch (error) {
      logger.error('Error getting cross-chain service status', { error });
      return { active: false, pendingTransactions: 0 };
    }
  }

  /**
   * Gets supported bridge routes
   */
  public getSupportedBridgeRoutes(): { sourceChainId: number; destinationChainId: number; provider: BridgeProvider }[] {
    try {
      logger.debug('Getting supported bridge routes', { tenantId: this.tenantId });

      const routes: { sourceChainId: number; destinationChainId: number; provider: BridgeProvider }[] = [];
      for (const config of bridgeConfigs.filter((c) => c.enabled)) {
        for (const sourceChainId of config.supportedChains) {
          for (const destinationChainId of config.supportedChains) {
            if (sourceChainId !== destinationChainId) {
              routes.push({
                sourceChainId,
                destinationChainId,
                provider: config.provider,
              });
            }
          }
        }
      }
      return routes;
    } catch (error) {
      logger.error('Error getting supported bridge routes', { error });
      return [];
    }
  }

  /**
   * Gets cross-chain transaction status
   */
  public async getCrossChainTransactionStatus(
    txHash: string,
    sourceChainId: number,
    destinationChainId: number
  ): Promise<'pending' | 'bridging' | 'completed' | 'failed'> {
    try {
      logger.debug('Getting cross-chain transaction status', { txHash, sourceChainId, destinationChainId, tenantId: this.tenantId });

      if (!NETWORK_CONFIG[sourceChainId.toString()])
        throw new Error(`Source chain ${sourceChainId} not supported`);
      if (!ethers.utils.isHexString(txHash, 32)) throw new Error('Invalid transaction hash');

      const db = await this.dbPromise;
      if (!db) {
        throw new Error('Database not initialized');
      }

      const transactions = await db.getAll('crossChainTransactions');
      const transaction = transactions.find(
        (tx) => tx.sourceTxHash === txHash && (!this.tenantId || tx.tenantId === this.tenantId)
      );

      if (transaction) {
        return transaction.status as 'pending' | 'bridging' | 'completed' | 'failed';
      }

      const provider = this.providers[sourceChainId];
      const receipt = await this.retryUtility.retry(() => provider.getTransactionReceipt(txHash));

      if (!receipt) return 'pending';
      if (receipt.status === 0) return 'failed';
      return 'bridging';
    } catch (error) {
      logger.error(`Error getting cross-chain transaction status for ${txHash}`, { error });
      return 'pending';
    }
  }
}

// Export singleton instance
export default new CrossChainService({
  databaseName: process.env.DB_NAME || 'cross_chain_db',
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

const getProvider = (chainId: number): providers.JsonRpcProvider => {
  const network = NETWORK_CONFIG[chainId.toString()];
  if (!network) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }
  return new providers.JsonRpcProvider(network.rpcUrl);
};

const handleError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

const processCrosschainTransaction = async (
  sourceChainId: number,
  targetChainId: number,
  walletAddress: string,
  transaction: any // Replace with proper type
): Promise<void> => {
  try {
    // Implementation
  } catch (error) {
    logger.error('Error processing crosschain transaction:', handleError(error));
    throw error;
  }
};

const validateTransaction = async (
  sourceChainId: number,
  targetChainId: number,
  transaction: any,
  walletAddress: string
): Promise<boolean> => {
  try {
    // Add validation logic here
    return true;
  } catch (error) {
    logger.error('Transaction validation failed:', handleError(error));
    return false;
  }
};

// Fix error handling in tryExecuteCCTX
const tryExecuteCCTX = async (ccTxId: string): Promise<boolean> => {
  try {
    // ...existing code...
  } catch (error) {
    logger.error(`Error executing cross-chain transaction ${ccTxId}:`, error instanceof Error ? error.message : String(error));
    return false;
  }
};

// Fix error handling in tryAssembleTransaction
const tryAssembleTransaction = async (ccTxId: string): Promise<boolean> => {
  try {
    // ...existing code...
  } catch (error) {
    logger.error(`Error assembling transaction ${ccTxId}:`, error instanceof Error ? error.message : String(error));
    return false;
  }
};

// Fix transaction signing type error
export const signCrosschainTransaction = async (
  transaction: ethers.providers.TransactionRequest,
  chainId: number
): Promise<string> => {
  // Convert transaction to string using JSON.stringify
  const serializedTx = JSON.stringify(transaction);
  // Continue with signing process
  // ...existing code...
};