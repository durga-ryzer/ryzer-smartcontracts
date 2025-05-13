import { ethers } from 'ethers';
import { logger } from '../utils/logger';
import { createAuditLog } from '../audit';
import { RetryUtility } from '../utils/retry';
import { HSMProvider, HSMProviderType, HSMKeyType } from './hsmService';

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

// Export shared instances for other modules to use
export const providers: Record<number, ethers.providers.JsonRpcProvider> = {};
export const pimlicoClients: Record<number, any> = {};
export const smartAccountClients: Record<string, any> = {};

// Export constants for use in other modules
export const ENTRYPOINT_ADDRESS_V07 = '0x0000000071727De22E5E9d8BAf0edAc6f37da032';

/**
 * Mock implementation of relayer service for type compatibility
 */
class RelayerServiceMock {
  async createWallet(ownerAddress: string, chainId: number): Promise<WalletInfo> {
    logger.debug('Mock createWallet called', { ownerAddress, chainId });
    return {
      address: ethers.Wallet.createRandom().address,
      type: 'smart',
      chainId,
      owner: ownerAddress,
      deployedAt: Date.now(),
    };
  }

  async getWalletInfo(walletAddress: string): Promise<WalletInfo | null> {
    logger.debug('Mock getWalletInfo called', { walletAddress });
    return null;
  }

  async getTokenBalances(walletAddress: string, chainId: number): Promise<TokenBalance[]> {
    logger.debug('Mock getTokenBalances called', { walletAddress, chainId });
    return [];
  }

  async sendGaslessTransaction(
    chainId: number,
    walletAddress: string,
    to: string,
    data: string,
    value: string = '0'
  ): Promise<string> {
    logger.debug('Mock sendGaslessTransaction called', { chainId, walletAddress, to });
    return `0x${Buffer.from(Math.random().toString()).toString('hex').slice(0, 64)}`;
  }
}

// Export default instance for singleton usage
export default new RelayerServiceMock();
