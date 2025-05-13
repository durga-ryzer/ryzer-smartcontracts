/**
 * @title RyzerTokenManagement Module
 * @description TypeScript module for interacting with the RyzerTokenManagement contract
 */

import { ethers } from 'ethers';
import { RyzerSDK } from '../index';
import { TokenApproval, TokenAllowance, TokenBalance } from '../types';
import { ExtendedContract } from '../types/contract';

// Import ABI
import RyzerTokenManagementABI from '../abis/RyzerTokenManagement.json';

export class RyzerTokenManagement {
  private readonly sdk: RyzerSDK;
  private readonly provider: ethers.providers.Provider;

  /**
   * Initialize the RyzerTokenManagement module
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
      RyzerTokenManagementABI,
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
   * Deposit ETH to a wallet
   * @param {string} walletAddress - Address of the wallet
   * @param {ethers.BigNumberish} amount - Amount of ETH to deposit (in wei)
   * @returns {Promise<ethers.ContractTransaction>} - Transaction response
   */
  public async depositEth(
    walletAddress: string, 
    amount: ethers.BigNumberish
  ): Promise<ethers.ContractTransaction> {
    const contract = this.getContract(walletAddress).connect(this.getSigner()) as ExtendedContract;
    // Use the overrides object directly as the first parameter
    return contract.depositEth({ value: amount });
  }

  /**
   * Deposit ERC20 tokens to a wallet
   * @param {string} walletAddress - Address of the wallet
   * @param {string} tokenAddress - Address of the token
   * @param {ethers.BigNumberish} amount - Amount of tokens to deposit
   * @returns {Promise<ethers.ContractTransaction>} - Transaction response
   */
  public async depositERC20(
    walletAddress: string, 
    tokenAddress: string, 
    amount: ethers.BigNumberish
  ): Promise<ethers.ContractTransaction> {
    const contract = this.getContract(walletAddress).connect(this.getSigner()) as ExtendedContract;
    return contract.depositERC20(tokenAddress, amount);
  }

  /**
   * Deposit ERC721 tokens to a wallet
   * @param {string} walletAddress - Address of the wallet
   * @param {string} tokenAddress - Address of the token
   * @param {ethers.BigNumberish} tokenId - Token ID
   * @returns {Promise<ethers.ContractTransaction>} - Transaction response
   */
  public async depositERC721(
    walletAddress: string, 
    tokenAddress: string, 
    tokenId: ethers.BigNumberish
  ): Promise<ethers.ContractTransaction> {
    const contract = this.getContract(walletAddress).connect(this.getSigner()) as ExtendedContract;
    return contract.depositERC721(tokenAddress, tokenId);
  }

  /**
   * Deposit ERC1155 tokens to a wallet
   * @param {string} walletAddress - Address of the wallet
   * @param {string} tokenAddress - Address of the token
   * @param {ethers.BigNumberish} tokenId - Token ID
   * @param {ethers.BigNumberish} amount - Amount of tokens to deposit
   * @param {string} data - Additional data
   * @returns {Promise<ethers.ContractTransaction>} - Transaction response
   */
  public async depositERC1155(
    walletAddress: string, 
    tokenAddress: string, 
    tokenId: ethers.BigNumberish, 
    amount: ethers.BigNumberish, 
    data: string = '0x'
  ): Promise<ethers.ContractTransaction> {
    const contract = this.getContract(walletAddress).connect(this.getSigner()) as ExtendedContract;
    return contract.depositERC1155(tokenAddress, tokenId, amount, data);
  }

  /**
   * Withdraw ETH from a wallet
   * @param {string} walletAddress - Address of the wallet
   * @param {string} recipient - Recipient address
   * @param {ethers.BigNumberish} amount - Amount of ETH to withdraw (in wei)
   * @returns {Promise<ethers.ContractTransaction>} - Transaction response
   */
  public async withdrawEth(
    walletAddress: string, 
    recipient: string, 
    amount: ethers.BigNumberish
  ): Promise<ethers.ContractTransaction> {
    const contract = this.getContract(walletAddress).connect(this.getSigner()) as ExtendedContract;
    return contract.withdrawEth(recipient, amount);
  }

  /**
   * Withdraw ERC20 tokens from a wallet
   * @param {string} walletAddress - Address of the wallet
   * @param {string} tokenAddress - Address of the token
   * @param {string} recipient - Recipient address
   * @param {ethers.BigNumberish} amount - Amount of tokens to withdraw
   * @returns {Promise<ethers.ContractTransaction>} - Transaction response
   */
  public async withdrawERC20(
    walletAddress: string, 
    tokenAddress: string, 
    recipient: string, 
    amount: ethers.BigNumberish
  ): Promise<ethers.ContractTransaction> {
    const contract = this.getContract(walletAddress).connect(this.getSigner()) as ExtendedContract;
    return contract.withdrawERC20(tokenAddress, recipient, amount);
  }

  /**
   * Withdraw ERC721 tokens from a wallet
   * @param {string} walletAddress - Address of the wallet
   * @param {string} tokenAddress - Address of the token
   * @param {string} recipient - Recipient address
   * @param {ethers.BigNumberish} tokenId - Token ID
   * @returns {Promise<ethers.ContractTransaction>} - Transaction response
   */
  public async withdrawERC721(
    walletAddress: string, 
    tokenAddress: string, 
    recipient: string, 
    tokenId: ethers.BigNumberish
  ): Promise<ethers.ContractTransaction> {
    const contract = this.getContract(walletAddress).connect(this.getSigner()) as ExtendedContract;
    return contract.withdrawERC721(tokenAddress, recipient, tokenId);
  }

  /**
   * Withdraw ERC1155 tokens from a wallet
   * @param {string} walletAddress - Address of the wallet
   * @param {string} tokenAddress - Address of the token
   * @param {string} recipient - Recipient address
   * @param {ethers.BigNumberish} tokenId - Token ID
   * @param {ethers.BigNumberish} amount - Amount of tokens to withdraw
   * @param {string} data - Additional data
   * @returns {Promise<ethers.ContractTransaction>} - Transaction response
   */
  public async withdrawERC1155(
    walletAddress: string, 
    tokenAddress: string, 
    recipient: string, 
    tokenId: ethers.BigNumberish, 
    amount: ethers.BigNumberish, 
    data: string = '0x'
  ): Promise<ethers.ContractTransaction> {
    const contract = this.getContract(walletAddress).connect(this.getSigner()) as ExtendedContract;
    return contract.withdrawERC1155(tokenAddress, recipient, tokenId, amount, data);
  }

  /**
   * Approve ERC20 tokens for spending
   * @param {string} walletAddress - Address of the wallet
   * @param {string} tokenAddress - Address of the token
   * @param {string} spender - Spender address
   * @param {ethers.BigNumberish} amount - Amount of tokens to approve
   * @returns {Promise<ethers.ContractTransaction>} - Transaction response
   */
  public async approveERC20(
    walletAddress: string, 
    tokenAddress: string, 
    spender: string, 
    amount: ethers.BigNumberish
  ): Promise<ethers.ContractTransaction> {
    const contract = this.getContract(walletAddress).connect(this.getSigner()) as ExtendedContract;
    return contract.approveERC20(tokenAddress, spender, amount);
  }

  /**
   * Approve ERC721 tokens for spending
   * @param {string} walletAddress - Address of the wallet
   * @param {string} tokenAddress - Address of the token
   * @param {string} operator - Operator address
   * @param {boolean} approved - Approval status
   * @returns {Promise<ethers.ContractTransaction>} - Transaction response
   */
  public async approveERC721(
    walletAddress: string, 
    tokenAddress: string, 
    operator: string, 
    approved: boolean
  ): Promise<ethers.ContractTransaction> {
    const contract = this.getContract(walletAddress).connect(this.getSigner()) as ExtendedContract;
    return contract.approveERC721(tokenAddress, operator, approved);
  }

  /**
   * Approve ERC1155 tokens for spending
   * @param {string} walletAddress - Address of the wallet
   * @param {string} tokenAddress - Address of the token
   * @param {string} operator - Operator address
   * @param {boolean} approved - Approval status
   * @returns {Promise<ethers.ContractTransaction>} - Transaction response
   */
  public async approveERC1155(
    walletAddress: string, 
    tokenAddress: string, 
    operator: string, 
    approved: boolean
  ): Promise<ethers.ContractTransaction> {
    const contract = this.getContract(walletAddress).connect(this.getSigner()) as ExtendedContract;
    return contract.approveERC1155(tokenAddress, operator, approved);
  }

  /**
   * Execute a token transfer
   * @param {string} walletAddress - Address of the wallet
   * @param {string} tokenAddress - Address of the token
   * @param {string} to - Recipient address
   * @param {ethers.BigNumberish} value - Amount of tokens to transfer
   * @param {string} data - Additional data
   * @returns {Promise<ethers.ContractTransaction>} - Transaction response
   */
  public async executeTokenTransfer(
    walletAddress: string, 
    tokenAddress: string, 
    to: string, 
    value: ethers.BigNumberish, 
    data: string = '0x'
  ): Promise<ethers.ContractTransaction> {
    const contract = this.getContract(walletAddress).connect(this.getSigner()) as ExtendedContract;
    return contract.executeTokenTransfer(tokenAddress, to, value, data);
  }

  /**
   * Get a token approval
   * @param {string} walletAddress - Address of the wallet
   * @param {string} tokenAddress - Address of the token
   * @param {string} spender - Spender address
   * @returns {Promise<TokenApproval>} - Token approval
   */
  public async getTokenApproval(
    walletAddress: string, 
    tokenAddress: string, 
    spender: string
  ): Promise<TokenApproval> {
    const contract = this.getContract(walletAddress);
    const approval = await contract.tokenApprovals(tokenAddress, spender);
    return {
      amount: approval.allowance,
      expiry: approval.isApprovedForAll ? Number.MAX_SAFE_INTEGER : 0
    };
  }

  /**
   * Get a token allowance
   * @param {string} walletAddress - Address of the wallet
   * @param {string} tokenAddress - Address of the token
   * @param {string} spender - Spender address
   * @returns {Promise<TokenAllowance>} - Token allowance
   */
  public async getTokenAllowance(
    walletAddress: string, 
    tokenAddress: string, 
    spender: string
  ): Promise<TokenAllowance> {
    const contract = this.getContract(walletAddress);
    const allowance = await contract.getTokenAllowance(tokenAddress, spender);
    return {
      allowance: allowance.allowance,
      isApprovedForAll: allowance.isApprovedForAll
    };
  }

  /**
   * Get a token balance
   * @param {string} walletAddress - Address of the wallet
   * @param {string} tokenAddress - Address of the token
   * @param {ethers.BigNumberish} tokenId - Token ID (for ERC721 and ERC1155)
   * @returns {Promise<TokenBalance>} - Token balance
   */
  public async getTokenBalance(
    walletAddress: string, 
    tokenAddress: string, 
    tokenId?: ethers.BigNumberish
  ): Promise<TokenBalance> {
    const contract = this.getContract(walletAddress);
    const balance = await contract.getTokenBalance(tokenAddress, tokenId);
    return {
      balance: balance.balance,
      tokenType: balance.tokenType
    };
  }

  /**
   * Get the ETH balance of a wallet
   * @param {string} walletAddress - Address of the wallet
   * @returns {Promise<ethers.BigNumber>} - ETH balance
   */
  public async getEthBalance(walletAddress: string): Promise<ethers.BigNumber> {
    return this.provider.getBalance(walletAddress);
  }

  /**
   * Get all tokens owned by a wallet
   * @param {string} walletAddress - Address of the wallet
   * @returns {Promise<string[]>} - Array of token addresses
   */
  public async getOwnedTokens(walletAddress: string): Promise<string[]> {
    const contract = this.getContract(walletAddress);
    return contract.getOwnedTokens();
  }

  /**
   * Get all ERC721 tokens owned by a wallet
   * @param {string} walletAddress - Address of the wallet
   * @param {string} tokenAddress - Address of the token
   * @returns {Promise<ethers.BigNumber[]>} - Array of token IDs
   */
  public async getOwnedERC721Tokens(
    walletAddress: string, 
    tokenAddress: string
  ): Promise<ethers.BigNumber[]> {
    const contract = this.getContract(walletAddress);
    return contract.getOwnedERC721Tokens(tokenAddress);
  }

  /**
   * Get all ERC1155 tokens owned by a wallet
   * @param {string} walletAddress - Address of the wallet
   * @param {string} tokenAddress - Address of the token
   * @returns {Promise<{id: ethers.BigNumber, balance: ethers.BigNumber}[]>} - Array of token IDs and balances
   */
  public async getOwnedERC1155Tokens(
    walletAddress: string, 
    tokenAddress: string
  ): Promise<{id: ethers.BigNumber, balance: ethers.BigNumber}[]> {
    const contract = this.getContract(walletAddress);
    const tokens = await contract.getOwnedERC1155Tokens(tokenAddress);
    return tokens.map((token: any) => ({
      id: token.id,
      balance: token.balance
    }));
  }

  /**
   * Check if a token is blacklisted
   * @param {string} walletAddress - Address of the wallet
   * @param {string} tokenAddress - Address of the token
   * @returns {Promise<boolean>} - Whether the token is blacklisted
   */
  public async isTokenBlacklisted(
    walletAddress: string, 
    tokenAddress: string
  ): Promise<boolean> {
    const contract = this.getContract(walletAddress);
    return contract.blacklistedTokens(tokenAddress);
  }

  /**
   * Add a token to the blacklist
   * @param {string} walletAddress - Address of the wallet
   * @param {string} tokenAddress - Address of the token
   * @returns {Promise<ethers.ContractTransaction>} - Transaction response
   */
  public async blacklistToken(
    walletAddress: string, 
    tokenAddress: string
  ): Promise<ethers.ContractTransaction> {
    const contract = this.getContract(walletAddress).connect(this.getSigner()) as ExtendedContract;
    return contract.blacklistToken(tokenAddress);
  }

  /**
   * Remove a token from the blacklist
   * @param {string} walletAddress - Address of the wallet
   * @param {string} tokenAddress - Address of the token
   * @returns {Promise<ethers.ContractTransaction>} - Transaction response
   */
  public async unblacklistToken(
    walletAddress: string, 
    tokenAddress: string
  ): Promise<ethers.ContractTransaction> {
    const contract = this.getContract(walletAddress).connect(this.getSigner()) as ExtendedContract;
    return contract.unblacklistToken(tokenAddress);
  }

  /**
   * Set the emergency stop status
   * @param {string} walletAddress - Address of the wallet
   * @param {boolean} stopped - Emergency stop status
   * @returns {Promise<ethers.ContractTransaction>} - Transaction response
   */
  public async setEmergencyStop(
    walletAddress: string, 
    stopped: boolean
  ): Promise<ethers.ContractTransaction> {
    const contract = this.getContract(walletAddress).connect(this.getSigner()) as ExtendedContract;
    return contract.setEmergencyStop(stopped);
  }

  /**
   * Get the emergency stopped status
   * @param {string} walletAddress - Address of the wallet
   * @returns {Promise<boolean>} - Emergency stopped status
   */
  public async getEmergencyStopped(walletAddress: string): Promise<boolean> {
    const contract = this.getContract(walletAddress);
    return contract.emergencyStopped();
  }
}
