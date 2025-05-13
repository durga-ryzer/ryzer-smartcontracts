/**
 * @title RyzerCrosschain Module
 * @description TypeScript module for interacting with the RyzerCrosschain contract
 */

import { ethers } from 'ethers';
import { RyzerSDK } from '../index';
import { 
  TransferERC20Params, 
  TransferERC721Params, 
  TransferERC1155Params, 
  EstimateCrossChainFeeParams,
  TokenMetadata,
  AdapterPerformance
} from '../types';
import { ExtendedContract } from '../types/contract';

// Import ABI
import RyzerCrosschainABI from '../abis/RyzerCrosschain.json';

export class RyzerCrosschain {
  private readonly sdk: RyzerSDK;
  private readonly provider: ethers.providers.Provider;

  /**
   * Initialize the RyzerCrosschain module
   * @param {RyzerSDK} sdk - The main RyzerSDK instance
   */
  constructor(sdk: RyzerSDK) {
    this.sdk = sdk;
    this.provider = sdk.provider;
  }

  /**
   * Get contract instance for a specific wallet address
   * @param {string} walletAddress - Address of the wallet
   * @returns {ExtendedContract} - Contract instance
   */
  public getContract(walletAddress: string): ExtendedContract {
    return new ethers.Contract(
      walletAddress,
      RyzerCrosschainABI,
      this.provider
    ) as ExtendedContract;
  }

  /**
   * Get a signer for transactions
   * @returns {ethers.Wallet} - Wallet instance with signer
   */
  public getSigner(): ethers.Wallet {
    return new ethers.Wallet(this.sdk.privateKey, this.provider);
  }

  /**
   * Transfer ERC20 tokens across chains
   * @param {string} walletAddress - Address of the wallet
   * @param {TransferERC20Params} params - Transfer parameters
   * @returns {Promise<ethers.ContractTransaction>} - Transaction response
   */
  public async transferERC20(
    walletAddress: string, 
    params: TransferERC20Params
  ): Promise<ethers.ContractTransaction> {
    const contract = this.getContract(walletAddress).connect(this.getSigner()) as ExtendedContract;
    return contract.transferERC20(
      params.token,
      params.amount,
      params.recipient,
      params.targetChainId,
      params.adapterParams || '0x'
    );
  }

  /**
   * Transfer ERC721 tokens across chains
   * @param {string} walletAddress - Address of the wallet
   * @param {TransferERC721Params} params - Transfer parameters
   * @returns {Promise<ethers.ContractTransaction>} - Transaction response
   */
  public async transferERC721(
    walletAddress: string, 
    params: TransferERC721Params
  ): Promise<ethers.ContractTransaction> {
    const contract = this.getContract(walletAddress).connect(this.getSigner()) as ExtendedContract;
    return contract.transferERC721(
      params.token,
      params.tokenId,
      params.recipient,
      params.targetChainId,
      params.adapterParams || '0x'
    );
  }

  /**
   * Transfer ERC1155 tokens across chains
   * @param {string} walletAddress - Address of the wallet
   * @param {TransferERC1155Params} params - Transfer parameters
   * @returns {Promise<ethers.ContractTransaction>} - Transaction response
   */
  public async transferERC1155(
    walletAddress: string, 
    params: TransferERC1155Params
  ): Promise<ethers.ContractTransaction> {
    const contract = this.getContract(walletAddress).connect(this.getSigner()) as ExtendedContract;
    return contract.transferERC1155(
      params.token,
      params.tokenIds,
      params.amounts,
      params.recipient,
      params.targetChainId,
      params.adapterParams || '0x'
    );
  }

  /**
   * Estimate cross-chain transfer fee
   * @param {string} walletAddress - Address of the wallet
   * @param {EstimateCrossChainFeeParams} params - Fee estimation parameters
   * @returns {Promise<ethers.BigNumber>} - Fee estimation
   */
  public async estimateCrossChainFee(
    walletAddress: string, 
    params: EstimateCrossChainFeeParams
  ): Promise<ethers.BigNumber> {
    const contract = this.getContract(walletAddress);
    return contract.estimateCrossChainFee(
      params.token,
      params.amount,
      params.targetChainId,
      params.adapterParams || '0x',
      params.tokenIds || [],
      params.amounts || []
    );
  }

  /**
   * Check if a chain is supported
   * @param {string} walletAddress - Address of the wallet
   * @param {number} chainId - Chain ID to check
   * @returns {Promise<boolean>} - Whether the chain is supported
   */
  public async isChainSupported(
    walletAddress: string, 
    chainId: number
  ): Promise<boolean> {
    const contract = this.getContract(walletAddress);
    return contract.isChainSupported(chainId);
  }

  /**
   * Add a token to supported tokens
   * @param {string} walletAddress - Address of the wallet
   * @param {string} token - Token address
   * @param {TokenMetadata} metadata - Token metadata
   * @returns {Promise<ethers.ContractTransaction>} - Transaction response
   */
  public async addSupportedToken(
    walletAddress: string, 
    token: string, 
    metadata: TokenMetadata
  ): Promise<ethers.ContractTransaction> {
    const contract = this.getContract(walletAddress).connect(this.getSigner()) as ExtendedContract;
    return contract.addSupportedToken(token, metadata);
  }

  /**
   * Remove a token from supported tokens
   * @param {string} walletAddress - Address of the wallet
   * @param {string} token - Token address
   * @returns {Promise<ethers.ContractTransaction>} - Transaction response
   */
  public async removeSupportedToken(
    walletAddress: string, 
    token: string
  ): Promise<ethers.ContractTransaction> {
    const contract = this.getContract(walletAddress).connect(this.getSigner()) as ExtendedContract;
    return contract.removeSupportedToken(token);
  }

  /**
   * Add a cross-chain adapter
   * @param {string} walletAddress - Address of the wallet
   * @param {string} adapter - Adapter address
   * @param {number} priority - Adapter priority
   * @returns {Promise<ethers.ContractTransaction>} - Transaction response
   */
  public async addCrossChainAdapter(
    walletAddress: string, 
    adapter: string, 
    priority: number
  ): Promise<ethers.ContractTransaction> {
    const contract = this.getContract(walletAddress).connect(this.getSigner()) as ExtendedContract;
    return contract.addCrossChainAdapter(adapter, priority);
  }

  /**
   * Remove a cross-chain adapter
   * @param {string} walletAddress - Address of the wallet
   * @param {string} adapter - Adapter address
   * @returns {Promise<ethers.ContractTransaction>} - Transaction response
   */
  public async removeCrossChainAdapter(
    walletAddress: string, 
    adapter: string
  ): Promise<ethers.ContractTransaction> {
    const contract = this.getContract(walletAddress).connect(this.getSigner()) as ExtendedContract;
    return contract.removeCrossChainAdapter(adapter);
  }

  /**
   * Update a cross-chain adapter's priority
   * @param {string} walletAddress - Address of the wallet
   * @param {string} adapter - Adapter address
   * @param {number} priority - New priority
   * @returns {Promise<ethers.ContractTransaction>} - Transaction response
   */
  public async updateAdapterPriority(
    walletAddress: string, 
    adapter: string, 
    priority: number
  ): Promise<ethers.ContractTransaction> {
    const contract = this.getContract(walletAddress).connect(this.getSigner()) as ExtendedContract;
    return contract.updateAdapterPriority(adapter, priority);
  }

  /**
   * Update adapter performance metrics
   * @param {string} walletAddress - Address of the wallet
   * @param {string} adapter - Adapter address
   * @param {boolean} success - Whether the transfer succeeded
   * @param {number} latency - Transfer latency in seconds
   * @returns {Promise<ethers.ContractTransaction>} - Transaction response
   */
  public async updateAdapterPerformance(
    walletAddress: string, 
    adapter: string, 
    success: boolean, 
    latency: number
  ): Promise<ethers.ContractTransaction> {
    const contract = this.getContract(walletAddress).connect(this.getSigner()) as ExtendedContract;
    return contract.updateAdapterPerformance(adapter, success, latency);
  }

  /**
   * Set the fee recipient
   * @param {string} walletAddress - Address of the wallet
   * @param {string} feeRecipient - Fee recipient address
   * @returns {Promise<ethers.ContractTransaction>} - Transaction response
   */
  public async setFeeRecipient(
    walletAddress: string, 
    feeRecipient: string
  ): Promise<ethers.ContractTransaction> {
    const contract = this.getContract(walletAddress).connect(this.getSigner()) as ExtendedContract;
    return contract.setFeeRecipient(feeRecipient);
  }

  /**
   * Set the fee percentage
   * @param {string} walletAddress - Address of the wallet
   * @param {number} feePercentage - Fee percentage (in basis points)
   * @returns {Promise<ethers.ContractTransaction>} - Transaction response
   */
  public async setFeePercentage(
    walletAddress: string, 
    feePercentage: number
  ): Promise<ethers.ContractTransaction> {
    const contract = this.getContract(walletAddress).connect(this.getSigner()) as ExtendedContract;
    return contract.setFeePercentage(feePercentage);
  }

  /**
   * Get transaction history
   * @param {string} walletAddress - Address of the wallet
   * @param {number} start - Start index
   * @param {number} limit - Number of transactions to retrieve
   * @returns {Promise<Array<any>>} - Transaction history
   */
  public async getTransactionHistory(
    walletAddress: string, 
    start: number, 
    limit: number
  ): Promise<Array<any>> {
    const contract = this.getContract(walletAddress);
    return contract.getTransactionHistory(start, limit);
  }

  /**
   * Get adapter performance metrics
   * @param {string} walletAddress - Address of the wallet
   * @param {string} adapter - Adapter address
   * @returns {Promise<AdapterPerformance>} - Adapter performance metrics
   */
  public async getAdapterPerformance(
    walletAddress: string, 
    adapter: string
  ): Promise<AdapterPerformance> {
    const contract = this.getContract(walletAddress);
    const performance = await contract.adapterPerformance(adapter);
    return {
      successCount: performance.successCount.toNumber(),
      failureCount: performance.failureCount.toNumber(),
      totalLatency: performance.totalLatency.toNumber(),
      transferCount: performance.transferCount.toNumber()
    };
  }

  /**
   * Get the CCIP router address
   * @param {string} walletAddress - Address of the wallet
   * @returns {Promise<string>} - CCIP router address
   */
  public async getCcipRouter(walletAddress: string): Promise<string> {
    const contract = this.getContract(walletAddress);
    return contract.ccipRouter();
  }

  /**
   * Get the fee recipient address
   * @param {string} walletAddress - Address of the wallet
   * @returns {Promise<string>} - Fee recipient address
   */
  public async getFeeRecipient(walletAddress: string): Promise<string> {
    const contract = this.getContract(walletAddress);
    return contract.feeRecipient();
  }

  /**
   * Get the fee percentage
   * @param {string} walletAddress - Address of the wallet
   * @returns {Promise<number>} - Fee percentage (in basis points)
   */
  public async getFeePercentage(walletAddress: string): Promise<number> {
    const contract = this.getContract(walletAddress);
    return (await contract.feePercentage()).toNumber();
  }

  /**
   * Check if a token is supported
   * @param {string} walletAddress - Address of the wallet
   * @param {string} token - Token address
   * @returns {Promise<boolean>} - Whether the token is supported
   */
  public async isTokenSupported(
    walletAddress: string, 
    token: string
  ): Promise<boolean> {
    const contract = this.getContract(walletAddress);
    return contract.isTokenSupported(token);
  }

  /**
   * Check if a token is blacklisted
   * @param {string} walletAddress - Address of the wallet
   * @param {string} token - Token address
   * @returns {Promise<boolean>} - Whether the token is blacklisted
   */
  public async isTokenBlacklisted(
    walletAddress: string, 
    token: string
  ): Promise<boolean> {
    const contract = this.getContract(walletAddress);
    return contract.blacklistedTokens(token);
  }

  /**
   * Get token metadata
   * @param {string} walletAddress - Address of the wallet
   * @param {string} token - Token address
   * @returns {Promise<TokenMetadata>} - Token metadata
   */
  public async getTokenMetadata(
    walletAddress: string, 
    token: string
  ): Promise<TokenMetadata> {
    const contract = this.getContract(walletAddress);
    const metadata = await contract.tokenMetadata(token);
    return {
      complianceLevel: metadata.complianceLevel.toNumber(),
      tokenStandard: metadata.tokenStandard,
      isLocked: metadata.isLocked,
      isEmergencyStopped: metadata.isEmergencyStopped,
      approvalExpiry: metadata.approvalExpiry
    };
  }
}
