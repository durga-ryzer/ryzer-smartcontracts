/**
 * @title RyzerRecovery Module
 * @description TypeScript module for interacting with the RyzerWalletRecovery contract
 */

import { ethers } from 'ethers';
import { RyzerSDK } from '../index';
import { RecoveryRequest, RecoveryProof, GuardianInfo } from '../types';
import { ExtendedContract } from '../types/contract';

// Import ABI
import RyzerWalletRecoveryABI from '../abis/RyzerWalletRecovery.json';

export class RyzerRecovery {
  private readonly sdk: RyzerSDK;
  private readonly provider: ethers.providers.Provider;

  /**
   * Initialize the RyzerRecovery module
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
      RyzerWalletRecoveryABI,
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
   * Add a guardian to a wallet
   * @param {string} walletAddress - Address of the wallet
   * @param {string} guardianAddress - Address of the guardian
   * @param {number} weight - Guardian weight
   * @returns {Promise<ethers.ContractTransaction>} - Transaction response
   */
  public async addGuardian(
    walletAddress: string, 
    guardianAddress: string, 
    weight: number
  ): Promise<ethers.ContractTransaction> {
    const contract = this.getContract(walletAddress).connect(this.getSigner()) as ExtendedContract;
    return contract.addGuardian(guardianAddress, weight);
  }

  /**
   * Remove a guardian from a wallet
   * @param {string} walletAddress - Address of the wallet
   * @param {string} guardianAddress - Address of the guardian
   * @returns {Promise<ethers.ContractTransaction>} - Transaction response
   */
  public async removeGuardian(
    walletAddress: string, 
    guardianAddress: string
  ): Promise<ethers.ContractTransaction> {
    const contract = this.getContract(walletAddress).connect(this.getSigner()) as ExtendedContract;
    return contract.removeGuardian(guardianAddress);
  }

  /**
   * Update a guardian's weight
   * @param {string} walletAddress - Address of the wallet
   * @param {string} guardianAddress - Address of the guardian
   * @param {number} weight - New guardian weight
   * @returns {Promise<ethers.ContractTransaction>} - Transaction response
   */
  public async updateGuardianWeight(
    walletAddress: string, 
    guardianAddress: string, 
    weight: number
  ): Promise<ethers.ContractTransaction> {
    const contract = this.getContract(walletAddress).connect(this.getSigner()) as ExtendedContract;
    return contract.updateGuardianWeight(guardianAddress, weight);
  }

  /**
   * Set the recovery threshold
   * @param {string} walletAddress - Address of the wallet
   * @param {number} threshold - Recovery threshold
   * @returns {Promise<ethers.ContractTransaction>} - Transaction response
   */
  public async setRecoveryThreshold(
    walletAddress: string, 
    threshold: number
  ): Promise<ethers.ContractTransaction> {
    const contract = this.getContract(walletAddress).connect(this.getSigner()) as ExtendedContract;
    return contract.setRecoveryThreshold(threshold);
  }

  /**
   * Set the recovery delay
   * @param {string} walletAddress - Address of the wallet
   * @param {number} delay - Recovery delay in seconds
   * @returns {Promise<ethers.ContractTransaction>} - Transaction response
   */
  public async setRecoveryDelay(
    walletAddress: string, 
    delay: number
  ): Promise<ethers.ContractTransaction> {
    const contract = this.getContract(walletAddress).connect(this.getSigner()) as ExtendedContract;
    return contract.setRecoveryDelay(delay);
  }

  /**
   * Set the recovery expiry
   * @param {string} walletAddress - Address of the wallet
   * @param {number} expiry - Recovery expiry in seconds
   * @returns {Promise<ethers.ContractTransaction>} - Transaction response
   */
  public async setRecoveryExpiry(
    walletAddress: string, 
    expiry: number
  ): Promise<ethers.ContractTransaction> {
    const contract = this.getContract(walletAddress).connect(this.getSigner()) as ExtendedContract;
    return contract.setRecoveryExpiry(expiry);
  }

  /**
   * Initiate a recovery request
   * @param {string} walletAddress - Address of the wallet
   * @param {string} newOwner - Address of the new owner
   * @returns {Promise<ethers.ContractTransaction>} - Transaction response
   */
  public async initiateRecovery(
    walletAddress: string, 
    newOwner: string
  ): Promise<ethers.ContractTransaction> {
    const contract = this.getContract(walletAddress).connect(this.getSigner()) as ExtendedContract;
    return contract.initiateRecovery(newOwner);
  }

  /**
   * Support a recovery request
   * @param {string} walletAddress - Address of the wallet
   * @param {number} requestId - ID of the recovery request
   * @returns {Promise<ethers.ContractTransaction>} - Transaction response
   */
  public async supportRecovery(
    walletAddress: string, 
    requestId: number
  ): Promise<ethers.ContractTransaction> {
    const contract = this.getContract(walletAddress).connect(this.getSigner()) as ExtendedContract;
    return contract.supportRecovery(requestId);
  }

  /**
   * Cancel a recovery request
   * @param {string} walletAddress - Address of the wallet
   * @param {number} requestId - ID of the recovery request
   * @returns {Promise<ethers.ContractTransaction>} - Transaction response
   */
  public async cancelRecovery(
    walletAddress: string, 
    requestId: number
  ): Promise<ethers.ContractTransaction> {
    const contract = this.getContract(walletAddress).connect(this.getSigner()) as ExtendedContract;
    return contract.cancelRecovery(requestId);
  }

  /**
   * Execute a recovery request
   * @param {string} walletAddress - Address of the wallet
   * @param {number} requestId - ID of the recovery request
   * @returns {Promise<ethers.ContractTransaction>} - Transaction response
   */
  public async executeRecovery(
    walletAddress: string, 
    requestId: number
  ): Promise<ethers.ContractTransaction> {
    const contract = this.getContract(walletAddress).connect(this.getSigner()) as ExtendedContract;
    return contract.executeRecovery(requestId);
  }

  /**
   * Submit a recovery proof
   * @param {string} walletAddress - Address of the wallet
   * @param {RecoveryProof} proof - Recovery proof object
   * @returns {Promise<ethers.ContractTransaction>} - Transaction response
   */
  public async submitRecoveryProof(
    walletAddress: string, 
    proof: RecoveryProof
  ): Promise<ethers.ContractTransaction> {
    const contract = this.getContract(walletAddress).connect(this.getSigner()) as ExtendedContract;
    return contract.submitRecoveryProof(
      proof.requestId,
      proof.guardian,
      proof.signature,
      proof.merkleProof ? JSON.stringify(proof.merkleProof) : '0x' // Convert merkleProof to string data
    );
  }

  /**
   * Get a recovery request
   * @param {string} walletAddress - Address of the wallet
   * @param {number} requestId - ID of the recovery request
   * @returns {Promise<RecoveryRequest>} - Recovery request object
   */
  public async getRecoveryRequest(
    walletAddress: string, 
    requestId: number
  ): Promise<RecoveryRequest> {
    const contract = this.getContract(walletAddress);
    const request = await contract.recoveryRequests(requestId);
    return {
      initiator: request.initiator,
      newOwner: request.newOwner,
      supportWeight: request.supportWeight.toNumber(),
      initiatedAt: request.initiatedAt.toNumber(),
      expiresAt: request.expiresAt.toNumber(),
      executed: request.executed,
      canceled: request.canceled
    };
  }

  /**
   * Get a guardian's information
   * @param {string} walletAddress - Address of the wallet
   * @param {string} guardianAddress - Address of the guardian
   * @returns {Promise<GuardianInfo>} - Guardian information
   */
  public async getGuardian(
    walletAddress: string, 
    guardianAddress: string
  ): Promise<GuardianInfo> {
    const contract = this.getContract(walletAddress);
    const guardian = await contract.guardians(guardianAddress);
    return {
      weight: guardian.weight.toNumber(),
      active: guardian.active
    };
  }

  /**
   * Get all active guardians
   * @param {string} walletAddress - Address of the wallet
   * @returns {Promise<string[]>} - Array of guardian addresses
   */
  public async getActiveGuardians(walletAddress: string): Promise<string[]> {
    const contract = this.getContract(walletAddress);
    return contract.getActiveGuardians();
  }

  /**
   * Get the recovery threshold
   * @param {string} walletAddress - Address of the wallet
   * @returns {Promise<number>} - Recovery threshold
   */
  public async getRecoveryThreshold(walletAddress: string): Promise<number> {
    const contract = this.getContract(walletAddress);
    return (await contract.recoveryThreshold()).toNumber();
  }

  /**
   * Get the recovery delay
   * @param {string} walletAddress - Address of the wallet
   * @returns {Promise<number>} - Recovery delay in seconds
   */
  public async getRecoveryDelay(walletAddress: string): Promise<number> {
    const contract = this.getContract(walletAddress);
    return (await contract.recoveryDelay()).toNumber();
  }

  /**
   * Get the recovery expiry
   * @param {string} walletAddress - Address of the wallet
   * @returns {Promise<number>} - Recovery expiry in seconds
   */
  public async getRecoveryExpiry(walletAddress: string): Promise<number> {
    const contract = this.getContract(walletAddress);
    return (await contract.recoveryExpiry()).toNumber();
  }

  /**
   * Get the next recovery request ID
   * @param {string} walletAddress - Address of the wallet
   * @returns {Promise<number>} - Next recovery request ID
   */
  public async getNextRecoveryRequestId(walletAddress: string): Promise<number> {
    const contract = this.getContract(walletAddress);
    return (await contract.nextRecoveryRequestId()).toNumber();
  }

  /**
   * Check if a recovery request is valid
   * @param {string} walletAddress - Address of the wallet
   * @param {number} requestId - ID of the recovery request
   * @returns {Promise<boolean>} - Whether the recovery request is valid
   */
  public async isRecoveryRequestValid(
    walletAddress: string, 
    requestId: number
  ): Promise<boolean> {
    const contract = this.getContract(walletAddress);
    return contract.isRecoveryRequestValid(requestId);
  }

  /**
   * Check if a recovery request is ready to execute
   * @param {string} walletAddress - Address of the wallet
   * @param {number} requestId - ID of the recovery request
   * @returns {Promise<boolean>} - Whether the recovery request is ready to execute
   */
  public async isRecoveryRequestReady(
    walletAddress: string, 
    requestId: number
  ): Promise<boolean> {
    const contract = this.getContract(walletAddress);
    return contract.isRecoveryRequestReady(requestId);
  }

  /**
   * Check if a guardian has supported a recovery request
   * @param {string} walletAddress - Address of the wallet
   * @param {number} requestId - ID of the recovery request
   * @param {string} guardianAddress - Address of the guardian
   * @returns {Promise<boolean>} - Whether the guardian has supported the recovery request
   */
  public async hasGuardianSupportedRecovery(
    walletAddress: string, 
    requestId: number, 
    guardianAddress: string
  ): Promise<boolean> {
    const contract = this.getContract(walletAddress);
    return contract.recoverySupport(requestId, guardianAddress);
  }
}
