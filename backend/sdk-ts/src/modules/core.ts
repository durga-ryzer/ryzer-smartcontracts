/**
 * @title RyzerCore Module
 * @description TypeScript module for interacting with the RyzerWalletCore contract
 */

import { ethers } from 'ethers';
import { RyzerSDK } from '../index';
import { UserOperation, MultiSignerConfig } from '../types';
import { ExtendedContract } from '../types/contract';

// Import ABI
import RyzerWalletCoreABI from '../abis/RyzerWalletCore.json';

export class RyzerCore {
  private readonly sdk: RyzerSDK;
  private readonly provider: ethers.providers.Provider;
  private contract: ExtendedContract | null = null;

  /**
   * Initialize the RyzerCore module
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
    // Create a new contract instance for the specific wallet address
    return new ethers.Contract(
      walletAddress,
      RyzerWalletCoreABI,
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
   * Set a delegated signer for a wallet
   * @param {string} walletAddress - Address of the wallet
   * @param {string} signerAddress - Address of the delegated signer
   * @returns {Promise<ethers.ContractTransaction>} - Transaction response
   */
  public async setDelegatedSigner(
    walletAddress: string, 
    signerAddress: string
  ): Promise<ethers.ContractTransaction> {
    const contract = this.getContract(walletAddress).connect(this.getSigner()) as ExtendedContract;
    return contract.setDelegatedSigner(signerAddress);
  }

  /**
   * Set multiple signers for a wallet with a Merkle root
   * @param {string} walletAddress - Address of the wallet
   * @param {string[]} signers - Array of signer addresses
   * @param {number} threshold - Signature threshold
   * @param {string} merkleRoot - Merkle root of signers
   * @returns {Promise<ethers.ContractTransaction>} - Transaction response
   */
  public async setMultiSigners(
    walletAddress: string, 
    signers: string[], 
    threshold: number, 
    merkleRoot: string
  ): Promise<ethers.ContractTransaction> {
    const contract = this.getContract(walletAddress).connect(this.getSigner()) as ExtendedContract;
    return contract.setMultiSigners(signers, threshold, merkleRoot);
  }

  /**
   * Set emergency stop status
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
   * Revoke a role from an account
   * @param {string} walletAddress - Address of the wallet
   * @param {string} role - Role identifier (bytes32)
   * @param {string} account - Account address
   * @returns {Promise<ethers.ContractTransaction>} - Transaction response
   */
  public async revokeRole(
    walletAddress: string, 
    role: string, 
    account: string
  ): Promise<ethers.ContractTransaction> {
    const contract = this.getContract(walletAddress).connect(this.getSigner()) as ExtendedContract;
    return contract.revokeRole(role, account);
  }

  /**
   * Check if an account has a specific role
   * @param {string} walletAddress - Address of the wallet
   * @param {string} role - Role identifier (bytes32)
   * @param {string} account - Account address
   * @returns {Promise<boolean>} - Whether the account has the role
   */
  public async hasRole(
    walletAddress: string, 
    role: string, 
    account: string
  ): Promise<boolean> {
    const contract = this.getContract(walletAddress);
    return contract.hasRole(role, account);
  }

  /**
   * Get the delegated signer for a user
   * @param {string} walletAddress - Address of the wallet
   * @param {string} userAddress - User address
   * @returns {Promise<string>} - Delegated signer address
   */
  public async getDelegatedSigner(
    walletAddress: string, 
    userAddress: string
  ): Promise<string> {
    const contract = this.getContract(walletAddress);
    return contract.delegatedSigners(userAddress);
  }

  /**
   * Get the multi-signer configuration for a user
   * @param {string} walletAddress - Address of the wallet
   * @param {string} userAddress - User address
   * @returns {Promise<MultiSignerConfig>} - Multi-signer configuration
   */
  public async getMultiSigners(
    walletAddress: string, 
    userAddress: string
  ): Promise<MultiSignerConfig> {
    const contract = this.getContract(walletAddress);
    const [merkleRoot, threshold] = await contract.multiSigners(userAddress);
    return { merkleRoot, threshold };
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

  /**
   * Get the entry point address
   * @param {string} walletAddress - Address of the wallet
   * @returns {Promise<string>} - Entry point address
   */
  public async getEntryPoint(walletAddress: string): Promise<string> {
    const contract = this.getContract(walletAddress);
    return contract.entryPoint();
  }

  /**
   * Get the paymaster address
   * @param {string} walletAddress - Address of the wallet
   * @returns {Promise<string>} - Paymaster address
   */
  public async getPaymaster(walletAddress: string): Promise<string> {
    const contract = this.getContract(walletAddress);
    return contract.paymaster();
  }

  /**
   * Get the timelock address
   * @param {string} walletAddress - Address of the wallet
   * @returns {Promise<string>} - Timelock address
   */
  public async getTimelock(walletAddress: string): Promise<string> {
    const contract = this.getContract(walletAddress);
    return contract.timelock();
  }

  /**
   * Get the threshold value
   * @param {string} walletAddress - Address of the wallet
   * @returns {Promise<number>} - Threshold value
   */
  public async getThreshold(walletAddress: string): Promise<number> {
    const contract = this.getContract(walletAddress);
    return (await contract.threshold()).toNumber();
  }

  /**
   * Get the user ID for a user address
   * @param {string} walletAddress - Address of the wallet
   * @param {string} userAddress - User address
   * @returns {Promise<number>} - User ID
   */
  public async getUserId(
    walletAddress: string, 
    userAddress: string
  ): Promise<number> {
    const contract = this.getContract(walletAddress);
    return (await contract.userAddressToId(userAddress)).toNumber();
  }

  /**
   * Get the last operation block for a user
   * @param {string} walletAddress - Address of the wallet
   * @param {string} userAddress - User address
   * @returns {Promise<number>} - Last operation block
   */
  public async getLastOperationBlock(
    walletAddress: string, 
    userAddress: string
  ): Promise<number> {
    const contract = this.getContract(walletAddress);
    return (await contract.lastOperationBlock(userAddress)).toNumber();
  }

  /**
   * Get the nonce for a user
   * @param {string} walletAddress - Address of the wallet
   * @param {string} userAddress - User address
   * @returns {Promise<number>} - Nonce value
   */
  public async getNonce(
    walletAddress: string, 
    userAddress: string
  ): Promise<number> {
    const contract = this.getContract(walletAddress);
    return (await contract.nonces(userAddress)).toNumber();
  }

  /**
   * Validate a user operation
   * @param {string} walletAddress - Address of the wallet
   * @param {UserOperation} userOp - User operation object
   * @param {string} userOpHash - Hash of the user operation
   * @param {ethers.BigNumberish} missingAccountFunds - Missing account funds
   * @returns {Promise<ethers.BigNumber>} - Validation result
   */
  public async validateUserOp(
    walletAddress: string, 
    userOp: UserOperation, 
    userOpHash: string, 
    missingAccountFunds: ethers.BigNumberish
  ): Promise<ethers.BigNumber> {
    const contract = this.getContract(walletAddress);
    return contract.validateUserOp(userOp, userOpHash, missingAccountFunds);
  }

  /**
   * Send a user operation through the entry point
   * @param {UserOperation} userOp - User operation object
   * @returns {Promise<string>} - Transaction hash
   */
  public async sendUserOperation(userOp: UserOperation): Promise<string> {
    const entryPointContract = new ethers.Contract(
      this.sdk.entryPointAddress,
      ['function handleOps(tuple(address sender, uint256 nonce, bytes initCode, bytes callData, uint256 callGasLimit, uint256 verificationGasLimit, uint256 preVerificationGas, uint256 maxFeePerGas, uint256 maxPriorityFeePerGas, bytes paymasterAndData, bytes signature)[] ops, address payable beneficiary)'],
      this.getSigner()
    );
    
    const tx = await (entryPointContract as ExtendedContract).handleOps([userOp], this.getSigner().address);
    return tx.hash;
  }

  /**
   * Convert a hash to an Ethereum signed message hash
   * @param {string} walletAddress - Address of the wallet
   * @param {string} hash - Hash to convert
   * @returns {Promise<string>} - Ethereum signed message hash
   */
  public async toEthSignedMessageHash(
    walletAddress: string, 
    hash: string
  ): Promise<string> {
    const contract = this.getContract(walletAddress);
    return contract.toEthSignedMessageHash(hash);
  }
}
