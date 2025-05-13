import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { createAuditLog } from '../audit';
import { RetryUtility } from '../utils/retry';
import { Server, Socket } from 'socket.io';
import { ethers } from 'ethers';
import { Pool, PoolClient } from 'pg'; // PostgreSQL client for indexer and analytics
import { Web3Provider } from '@ethersproject/providers';

// Enum for service names
export enum ServiceName {
  RELAYER = 'relayer',
  INDEXER = 'indexer',
  NOTIFICATION = 'notification',
  ANALYTICS = 'analytics',
}

// Interface for service status
export interface ServiceStatus {
  name: ServiceName;
  initialized: boolean;
  healthy: boolean;
  lastChecked: number;
  error?: string;
  metadata?: Record<string, any>;
}

// Interface for service manager configuration
export interface ServiceManagerConfig {
  tenantId?: string;
  retryConfig?: {
    maxRetries: number;
    baseDelayMs: number;
    maxDelayMs: number;
  };
  socketServer?: Server;
  blockchainProviderUrl: string; // e.g., Infura/Alchemy URL
  databaseConfig: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  };
  relayerPrivateKey: string; // Securely managed private key for relayer
}

// Interface for transaction data
export interface TransactionData {
  id: string;
  walletAddress: string;
  to: string;
  value: string;
  data: string;
  gasLimit: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
  tenantId?: string;
}

// Interface for analytics report
export interface AnalyticsReport {
  tenantId?: string;
  timestamp: number;
  transactionCount: number;
  gasUsed: string;
  activeWallets: number;
}

/**
 * ServiceManager class to manage backend services with business logic
 */
export class ServiceManager {
  private servicesInitialized: boolean = false;
  private serviceStatuses: Record<ServiceName, ServiceStatus> = {
    [ServiceName.RELAYER]: { name: ServiceName.RELAYER, initialized: false, healthy: false, lastChecked: 0 },
    [ServiceName.INDEXER]: { name: ServiceName.INDEXER, initialized: false, healthy: false, lastChecked: 0 },
    [ServiceName.NOTIFICATION]: { name: ServiceName.NOTIFICATION, initialized: false, healthy: false, lastChecked: 0 },
    [ServiceName.ANALYTICS]: { name: ServiceName.ANALYTICS, initialized: false, healthy: false, lastChecked: 0 },
  };
  private config: ServiceManagerConfig;
  private retryUtility: RetryUtility;
  private operationId: string = uuidv4();
  private blockchainProvider: Web3Provider | null = null;
  private dbPool: Pool | null = null;
  private relayerWallet: ethers.Wallet | null = null;
  private socketServer: Server | null = null;

  constructor(config: ServiceManagerConfig) {
    this.validateConfig(config);
    this.config = {
      tenantId: config.tenantId,
      retryConfig: config.retryConfig ?? { maxRetries: 3, baseDelayMs: 100, maxDelayMs: 1000 },
      socketServer: config.socketServer,
      blockchainProviderUrl: config.blockchainProviderUrl,
      databaseConfig: config.databaseConfig,
      relayerPrivateKey: config.relayerPrivateKey,
    };
    this.retryUtility = new RetryUtility(this.config.retryConfig);
    this.socketServer = config.socketServer || null;
    logger.debug('ServiceManager instantiated', { operationId: this.operationId, tenantId: config.tenantId });
  }

  /**
   * Validates configuration
   * @param config Service manager configuration
   * @throws Error if configuration is invalid
   */
  private validateConfig(config: ServiceManagerConfig): void {
    if (!config.blockchainProviderUrl) {
      throw new Error('Blockchain provider URL is required');
    }
    if (!config.databaseConfig || !Object.values(config.databaseConfig).every(val => val)) {
      throw new Error('Complete database configuration is required');
    }
    if (!config.relayerPrivateKey || !ethers.utils.isHexString(config.relayerPrivateKey, 32)) {
      throw new Error('Valid relayer private key is required');
    }
  }

  /**
   * Initializes all backend services
   * @throws Error if initialization fails
   */
  public async initializeServices(): Promise<void> {
    try {
      if (this.servicesInitialized) {
        logger.warn('Services already initialized', { operationId: this.operationId });
        return;
      }

      logger.info('Initializing all services', { operationId: this.operationId, tenantId: this.config.tenantId });

      // Initialize blockchain provider
      this.blockchainProvider = new Web3Provider(
        new ethers.providers.JsonRpcProvider(this.config.blockchainProviderUrl)
      );
      this.relayerWallet = new ethers.Wallet(this.config.relayerPrivateKey, this.blockchainProvider);

      // Initialize database pool
      this.dbPool = new Pool(this.config.databaseConfig);
      await this.retryUtility.retry(async () => {
        const client = await this.dbPool!.connect();
        client.release();
      });

      // Initialize services concurrently
      await Promise.all([
        this.initializeRelayerService(),
        this.initializeIndexerService(),
        this.initializeNotificationService(),
        this.initializeAnalyticsService(),
      ]);

      this.servicesInitialized = true;
      await createAuditLog({
        action: 'services_initialized',
        performedBy: 'system',
        targetId: this.operationId,
        targetType: 'service_manager',
        tenantId: this.config.tenantId,
        metadata: {
          services: Object.keys(this.serviceStatuses),
          tenantId: this.config.tenantId,
          blockchainNetwork: this.config.blockchainProviderUrl,
        },
      });

      logger.info('All services initialized successfully', { operationId: this.operationId });
    } catch (error) {
      logger.error('Failed to initialize services', { operationId: this.operationId, error });
      await this.updateServiceStatusOnError(error);
      throw new Error(`Service initialization failed: ${error.message}`);
    }
  }

  /**
   * Shuts down all services gracefully
   * @throws Error if shutdown fails
   */
  public async shutdownServices(): Promise<void> {
    try {
      if (!this.servicesInitialized) {
        logger.warn('Services not initialized, skipping shutdown', { operationId: this.operationId });
        return;
      }

      logger.info('Shutting down services', { operationId: this.operationId, tenantId: this.config.tenantId });

      // Shutdown services concurrently
      await Promise.all([
        this.shutdownService(ServiceName.RELAYER, async () => {
          this.relayerWallet = null;
          this.serviceStatuses[ServiceName.RELAYER] = {
            ...this.serviceStatuses[ServiceName.RELAYER],
            initialized: false,
            healthy: false,
            lastChecked: Date.now(),
          };
          logger.info('Relayer service shut down', { operationId: this.operationId });
        }),
        this.shutdownService(ServiceName.INDEXER, async () => {
          if (this.blockchainProvider) {
            this.blockchainProvider.removeAllListeners();
          }
          this.serviceStatuses[ServiceName.INDEXER] = {
            ...this.serviceStatuses[ServiceName.INDEXER],
            initialized: false,
            healthy: false,
            lastChecked: Date.now(),
          };
          logger.info('Indexer service shut down', { operationId: this.operationId });
        }),
        this.shutdownService(ServiceName.NOTIFICATION, async () => {
          if (this.socketServer) {
            this.socketServer.removeAllListeners();
            this.socketServer.close();
          }
          this.serviceStatuses[ServiceName.NOTIFICATION] = {
            ...this.serviceStatuses[ServiceName.NOTIFICATION],
            initialized: false,
            healthy: false,
            lastChecked: Date.now(),
          };
          logger.info('Notification service shut down', { operationId: this.operationId });
        }),
        this.shutdownService(ServiceName.ANALYTICS, async () => {
          if (this.dbPool) {
            await this.dbPool.end();
          }
          this.serviceStatuses[ServiceName.ANALYTICS] = {
            ...this.serviceStatuses[ServiceName.ANALYTICS],
            initialized: false,
            healthy: false,
            lastChecked: Date.now(),
          };
          logger.info('Analytics service shut down', { operationId: this.operationId });
        }),
      ]);

      this.servicesInitialized = false;
      this.blockchainProvider = null;
      this.dbPool = null;
      this.socketServer = null;

      await createAuditLog({
        action: 'services_shutdown',
        performedBy: 'system',
        targetId: this.operationId,
        targetType: 'service_manager',
        tenantId: this.config.tenantId,
        metadata: {
          services: Object.keys(this.serviceStatuses),
          tenantId: this.config.tenantId,
        },
      });

      logger.info('All services shut down successfully', { operationId: this.operationId });
    } catch (error) {
      logger.error('Error shutting down services', { operationId: this.operationId, error });
      await this.updateServiceStatusOnError(error);
      throw new Error(`Service shutdown failed: ${error.message}`);
    }
  }

  /**
   * Gets the status of all services
   * @returns Detailed status of all services
   */
  public getServicesStatus(): Record<string, any> {
    return {
      initialized: this.servicesInitialized,
      tenantId: this.config.tenantId,
      timestamp: Date.now(),
      operationId: this.operationId,
      services: this.serviceStatuses,
    };
  }

  /**
   * Checks the health of all services
   * @returns Health status of all services
   */
  public async checkServicesHealth(): Promise<Record<ServiceName, ServiceStatus>> {
    try {
      logger.debug('Checking services health', { operationId: this.operationId });

      const healthChecks = await Promise.all([
        this.checkServiceHealth(ServiceName.RELAYER, async () => {
          if (!this.relayerWallet) return false;
          const balance = await this.blockchainProvider!.getBalance(this.relayerWallet.address);
          return balance.gt(0); // Ensure relayer has funds
        }),
        this.checkServiceHealth(ServiceName.INDEXER, async () => {
          if (!this.dbPool) return false;
          const client = await this.dbPool.connect();
          try {
            await client.query('SELECT 1');
            return true;
          } finally {
            client.release();
          }
        }),
        this.checkServiceHealth(ServiceName.NOTIFICATION, async () => {
          if (!this.socketServer) return false;
          return this.socketServer.engine.clientsCount > 0; // Check active connections
        }),
        this.checkServiceHealth(ServiceName.ANALYTICS, async () => {
          if (!this.dbPool) return false;
          const client = await this.dbPool.connect();
          try {
            await client.query('SELECT 1');
            return true;
          } finally {
            client.release();
          }
        }),
      ]);

      const updatedStatuses = healthChecks.reduce((acc, { service, healthy, error }) => {
        acc[service] = {
          ...this.serviceStatuses[service],
          healthy,
          lastChecked: Date.now(),
          error: error || undefined,
        };
        return acc;
      }, {} as Record<ServiceName, ServiceStatus>);

      this.serviceStatuses = updatedStatuses;
      logger.debug('Services health check completed', { operationId: this.operationId, statuses: updatedStatuses });

      return updatedStatuses;
    } catch (error) {
      logger.error('Error checking services health', { operationId: this.operationId, error });
      throw new Error(`Health check failed: ${error.message}`);
    }
  }

  /**
   * Initializes the relayer service for gasless transactions
   */
  private async initializeRelayerService(): Promise<void> {
    await this.initializeService(ServiceName.RELAYER, async () => {
      if (!this.blockchainProvider || !this.relayerWallet) {
        throw new Error('Blockchain provider or relayer wallet not initialized');
      }

      // Business logic: Relay a gasless transaction
      const relayTransaction = async (txData: TransactionData): Promise<string> => {
        try {
          if (!ethers.utils.isAddress(txData.to) || !ethers.utils.isHexString(txData.data)) {
            throw new Error('Invalid transaction data');
          }

          const tx = {
            to: txData.to,
            value: ethers.utils.parseEther(txData.value || '0'),
            data: txData.data,
            gasLimit: ethers.BigNumber.from(txData.gasLimit || '100000'),
          };

          const signedTx = await this.relayerWallet!.signTransaction(tx);
          const txResponse = await this.blockchainProvider!.sendTransaction(signedTx);

          await createAuditLog({
            action: 'transaction_relayed',
            performedBy: 'relayer',
            targetId: txData.id,
            targetType: 'transaction',
            walletAddress: txData.walletAddress,
            tenantId: txData.tenantId,
            metadata: {
              txHash: txResponse.hash,
              relayerAddress: this.relayerWallet!.address,
            },
          });

          logger.info('Transaction relayed', { txId: txData.id, txHash: txResponse.hash });
          return txResponse.hash;
        } catch (error) {
          logger.error('Error relaying transaction', { txId: txData.id, error });
          throw error;
        }
      };

      this.serviceStatuses[ServiceName.RELAYER] = {
        ...this.serviceStatuses[ServiceName.RELAYER],
        initialized: true,
        healthy: true,
        lastChecked: Date.now(),
        metadata: { relayerAddress: this.relayerWallet.address },
      };

      // Expose relayTransaction for external use (e.g., API endpoints)
      (this as any).relayTransaction = relayTransaction;
      logger.info('Relayer service initialized', { operationId: this.operationId });
    });
  }

  /**
   * Initializes the indexer service for transaction history
   */
  private async initializeIndexerService(): Promise<void> {
    await this.initializeService(ServiceName.INDEXER, async () => {
      if (!this.blockchainProvider || !this.dbPool) {
        throw new Error('Blockchain provider or database pool not initialized');
      }

      // Business logic: Index transaction events
      const indexTransactions = async () => {
        this.blockchainProvider!.on('block', async (blockNumber: number) => {
          try {
            const block = await this.blockchainProvider!.getBlockWithTransactions(blockNumber);
            const client = await this.dbPool!.connect();

            try {
              for (const tx of block.transactions) {
                if (tx.to && tx.from) {
                  const txData: TransactionData = {
                    id: tx.hash,
                    walletAddress: tx.from,
                    to: tx.to,
                    value: ethers.utils.formatEther(tx.value),
                    data: tx.data,
                    gasLimit: tx.gasLimit.toString(),
                    timestamp: block.timestamp * 1000,
                    status: 'confirmed',
                    tenantId: this.config.tenantId,
                  };

                  await client.query(
                    `INSERT INTO transactions (id, wallet_address, to_address, value, data, gas_limit, timestamp, status, tenant_id)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                    [
                      txData.id,
                      txData.walletAddress,
                      txData.to,
                      txData.value,
                      txData.data,
                      txData.gasLimit,
                      new Date(txData.timestamp),
                      txData.status,
                      txData.tenantId,
                    ]
                  );

                  await createAuditLog({
                    action: 'transaction_indexed',
                    performedBy: 'indexer',
                    targetId: txData.id,
                    targetType: 'transaction',
                    walletAddress: txData.walletAddress,
                    tenantId: txData.tenantId,
                    metadata: { blockNumber, txHash: tx.hash },
                  });
                }
              }
            } finally {
              client.release();
            }
          } catch (error) {
            logger.error('Error indexing block', { blockNumber, error });
          }
        });
      };

      await indexTransactions();
      this.serviceStatuses[ServiceName.INDEXER] = {
        ...this.serviceStatuses[ServiceName.INDEXER],
        initialized: true,
        healthy: true,
        lastChecked: Date.now(),
      };
      logger.info('Indexer service initialized', { operationId: this.operationId });
    });
  }

  /**
   * Initializes the notification service for transaction alerts
   */
  private async initializeNotificationService(): Promise<void> {
    await this.initializeService(ServiceName.NOTIFICATION, async () => {
      if (!this.socketServer) {
        logger.warn('Notification service not initialized: Socket.io server not provided', { operationId: this.operationId });
        return;
      }

      // Business logic: Send real-time transaction alerts
      this.socketServer.on('connection', (socket: Socket) => {
        logger.debug('Client connected to notification service', { socketId: socket.id });

        socket.on('subscribe_transactions', (walletAddress: string) => {
          if (!ethers.utils.isAddress(walletAddress)) {
            socket.emit('error', { message: 'Invalid wallet address' });
            return;
          }

          socket.join(walletAddress);
          logger.debug('Client subscribed to transaction alerts', { walletAddress, socketId: socket.id });
        });

        socket.on('disconnect', () => {
          logger.debug('Client disconnected from notification service', { socketId: socket.id });
        });
      });

      const notifyTransaction = async (txData: TransactionData) => {
        this.socketServer!.to(txData.walletAddress).emit('transaction_update', {
          id: txData.id,
          status: txData.status,
          timestamp: txData.timestamp,
          to: txData.to,
          value: txData.value,
        });

        await createAuditLog({
          action: 'notification_sent',
          performedBy: 'notification_service',
          targetId: txData.id,
          targetType: 'transaction',
          walletAddress: txData.walletAddress,
          tenantId: txData.tenantId,
          metadata: { status: txData.status },
        });

        logger.debug('Transaction notification sent', { txId: txData.id, walletAddress: txData.walletAddress });
      };

      this.serviceStatuses[ServiceName.NOTIFICATION] = {
        ...this.serviceStatuses[ServiceName.NOTIFICATION],
        initialized: true,
        healthy: true,
        lastChecked: Date.now(),
      };

      // Expose notifyTransaction for external use
      (this as any).notifyTransaction = notifyTransaction;
      logger.info('Notification service initialized', { operationId: this.operationId });
    });
  }

  /**
   * Initializes the analytics service for usage statistics
   */
  private async initializeAnalyticsService(): Promise<void> {
    await this.initializeService(ServiceName.ANALYTICS, async () => {
      if (!this.dbPool) {
        throw new Error('Database pool not initialized');
      }

      // Business logic: Generate analytics report
      const generateReport = async (startTime: number, endTime: number): Promise<AnalyticsReport> => {
        const client = await this.dbPool!.connect();
        try {
          const result = await client.query(
            `SELECT
               COUNT(*) as transaction_count,
               SUM(CAST(gas_limit AS BIGINT)) as gas_used,
               COUNT(DISTINCT wallet_address) as active_wallets
             FROM transactions
             WHERE timestamp >= $1 AND timestamp <= $2 AND ($3::text IS NULL OR tenant_id = $3)`,
            [new Date(startTime), new Date(endTime), this.config.tenantId]
          );

          const report: AnalyticsReport = {
            tenantId: this.config.tenantId,
            timestamp: Date.now(),
            transactionCount: parseInt(result.rows[0].transaction_count, 10),
            gasUsed: result.rows[0].gas_used || '0',
            activeWallets: parseInt(result.rows[0].active_wallets, 10),
          };

          await createAuditLog({
            action: 'analytics_report_generated',
            performedBy: 'analytics_service',
            targetId: uuidv4(),
            targetType: 'analytics_report',
            tenantId: this.config.tenantId,
            metadata: {
              startTime,
              endTime,
              transactionCount: report.transactionCount,
              activeWallets: report.activeWallets,
            },
          });

          logger.debug('Analytics report generated', { tenantId: this.config.tenantId, report });
          return report;
        } finally {
          client.release();
        }
      };

      this.serviceStatuses[ServiceName.ANALYTICS] = {
        ...this.serviceStatuses[ServiceName.ANALYTICS],
        initialized: true,
        healthy: true,
        lastChecked: Date.now(),
      };

      // Expose generateReport for external use
      (this as any).generateReport = generateReport;
      logger.info('Analytics service initialized', { operationId: this.operationId });
    });
  }

  /**
   * Initializes a single service with error handling
   * @param service Service name
   * @param initFn Initialization function
   */
  private async initializeService(service: ServiceName, initFn: () => Promise<void>): Promise<void> {
    try {
      await initFn();
    } catch (error) {
      logger.error(`Failed to initialize ${service} service`, { operationId: this.operationId, error });
      this.serviceStatuses[service] = {
        ...this.serviceStatuses[service],
        initialized: false,
        healthy: false,
        lastChecked: Date.now(),
        error: error.message,
      };
      throw error;
    }
  }

  /**
   * Shuts down a single service with error handling
   * @param service Service name
   * @param shutdownFn Shutdown function
   */
  private async shutdownService(service: ServiceName, shutdownFn: () => Promise<void>): Promise<void> {
    try {
      await shutdownFn();
    } catch (error) {
      logger.error(`Failed to shut down ${service} service`, { operationId: this.operationId, error });
      this.serviceStatuses[service] = {
        ...this.serviceStatuses[service],
        initialized: false,
        healthy: false,
        lastChecked: Date.now(),
        error: error.message,
      };
      throw error;
    }
  }

  /**
   * Checks the health of a single service
   * @param service Service name
   * @param healthCheckFn Health check function
   * @returns Service health status
   */
  private async checkServiceHealth(
    service: ServiceName,
    healthCheckFn: () => Promise<boolean>
  ): Promise<{ service: ServiceName; healthy: boolean; error?: string }> {
    try {
      const healthy = await healthCheckFn();
      return { service, healthy };
    } catch (error) {
      logger.error(`Health check failed for ${service} service`, { operationId: this.operationId, error });
      return { service, healthy: false, error: error.message };
    }
  }

  /**
   * Updates service statuses on error
   * @param error Error encountered
   */
  private async updateServiceStatusOnError(error: any): Promise<void> {
    for (const service of Object.values(ServiceName)) {
      if (this.serviceStatuses[service].initialized) {
        this.serviceStatuses[service] = {
          ...this.serviceStatuses[service],
          healthy: false,
          lastChecked: Date.now(),
          error: error.message,
        };
      }
    }
  }
}

// Export default instance for singleton usage
export default new ServiceManager({
  blockchainProviderUrl: process.env.BLOCKCHAIN_PROVIDER_URL || 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID',
  databaseConfig: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'wallet_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
  },
  relayerPrivateKey: process.env.RELAYER_PRIVATE_KEY || '0xYOUR_PRIVATE_KEY',
});