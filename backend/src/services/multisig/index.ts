import { ethers } from 'ethers';
import { logger } from '../../utils/logger';
import { getDatabase } from '../../config/database';
// Remove assertStoreExists import
import { WalletInfo } from '../../types';
import { createAuditLog } from '../../audit';

// Multi-signature wallet configuration
export interface MultisigConfig {
  owners: string[];
  threshold: number;
  name?: string;
  description?: string;
  chainId: number;
}

// Multi-signature wallet information
export interface MultisigWalletInfo {
  address: string;
  chainId: number;
  owners: string[];
  threshold: number;
  createdAt: number;
  createdBy: string;
  name?: string;
  description?: string;
  status: 'active' | 'inactive';
}

// Multi-signature transaction status
export enum MultisigTxStatus {
  PENDING = 'proposed', // Changed from 'pending' to 'proposed' to match the database schema
  EXECUTED = 'executed',
  REJECTED = 'rejected',
  FAILED = 'failed',    // Changed from 'expired' to 'failed' to match the database schema
  APPROVED = 'approved' // Added to match the database schema
}

// Multi-signature transaction
export interface MultisigTransaction {
  id: string;
  walletAddress: string;
  to: string;
  value: string;
  data?: string;
  nonce: number;
  chainId: number;
  status: MultisigTxStatus | string; // Allow string to match database schema
  createdAt: number;
  expiresAt?: number;
  executedAt?: number;
  rejectedAt?: number;
  createdBy: string;
  executedBy?: string;
  rejectedBy?: string;
  approvals: string[];
  rejections: string[];
  description?: string;
  metadata?: Record<string, any>;
  txHash?: string;
}

// Update WalletInfo interface to include all required properties
interface WalletInfo {
  address: string;
  type: 'eoa' | 'smart';
  chainId: number;
  owner: string;
  custodians?: string[];
  threshold?: number;
  deployedAt: number;
  lastActivity?: number;
  name?: string;
  description?: string;
  metadata?: Record<string, any>;
  status: 'active' | 'inactive' | 'locked';
}

/**
 * Create a multi-signature wallet
 * @param config Multi-signature wallet configuration
 * @returns Wallet information
 */
export const createMultisigWallet = async (params: {
  address: string;
  chainId: number;
  owner: string;
  custodians: string[];
  threshold: number;
  description?: string;
}): Promise<WalletInfo> => {
  try {
    const db = await getDatabase();
    if (!db) {
      throw new Error('Database not initialized');
    }

    const walletInfo: WalletInfo = {
      address: params.address,
      type: 'smart',
      chainId: params.chainId,
      owner: params.owner,
      custodians: params.custodians,
      threshold: params.threshold,
      deployedAt: Date.now(),
      lastActivity: Date.now(),
      status: 'active'
    };

    const tx = db.transaction('wallets', 'readwrite');
    const store = tx.objectStore('wallets');
    await store.add(walletInfo);
    await tx.done;

    logger.info(`Created multisig wallet ${params.address}`);
    return walletInfo;
  } catch (error) {
    logger.error('Error creating multisig wallet:', error);
    throw error;
  }
};

/**
 * Propose a transaction for multi-signature approval
 * @param walletAddress Multi-signature wallet address
 * @param to Target address
 * @param value Transaction value in wei
 * @param data Transaction data
 * @param description Transaction description
 * @param proposerAddress Address of the proposer
 * @param metadata Additional metadata
 * @returns Transaction information
 */
export const proposeTransaction = async (
  walletAddress: string,
  to: string,
  value: string,
  data: string,
  description: string,
  proposerAddress: string,
  metadata?: Record<string, any>
): Promise<MultisigTransaction> => {
  try {
    // Get wallet from database
    const db = await getDatabase();
    if (!db) {
      throw new Error('Database not initialized');
    }
    const wallet = await db.get('wallets', walletAddress.toLowerCase());
    
    if (!wallet) {
      throw new Error(`Wallet not found: ${walletAddress}`);
    }
    
    if (wallet.type !== 'smart') { // Changed from 'multisig' to 'smart' to match the WalletInfo type
      throw new Error(`Wallet is not a multi-signature wallet: ${walletAddress}`);
    }
    
    // Verify that proposer is an owner
    if (!wallet.custodians?.includes(proposerAddress.toLowerCase())) {
      throw new Error(`Proposer is not an owner of the wallet: ${proposerAddress}`);
    }
    
    // Get current nonce
    const transactions = await db.getAllFromIndex('multisig_transactions', 'by-wallet', walletAddress.toLowerCase());
    const nonce = transactions.length;
    
    // Create transaction
    const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const transaction: MultisigTransaction = {
      id: txId,
      walletAddress: walletAddress.toLowerCase(),
      to,
      value,
      data,
      nonce,
      chainId: wallet.chainId,
      status: MultisigTxStatus.PENDING, // This will be converted to string when stored
      createdAt: Date.now(),
      expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days expiration
      createdBy: proposerAddress.toLowerCase(),
      approvals: [proposerAddress.toLowerCase()], // Auto-approve by proposer
      rejections: [],
      description,
      metadata: metadata || {}
    };
    
    // Store transaction in database
    await db.add('multisig_transactions', transaction);
    
    // Create audit log
    await createAuditLog({
      action: 'transaction_proposed',
      performedBy: proposerAddress.toLowerCase(),
      targetId: txId,
      targetType: 'multisig_transaction',
      walletAddress: walletAddress.toLowerCase(),
      metadata: {
        txId,
        to,
        value,
        description
      }
    });
    
    logger.info(`Multi-signature transaction proposed: ${txId}`);
    return transaction;
  } catch (error) {
    logger.error('Error proposing multi-signature transaction:', error);
    throw error;
  }
};

/**
 * Approve a multi-signature transaction
 * @param txId Transaction ID
 * @param approverAddress Address of the approver
 * @returns Updated transaction
 */
export const approveTransaction = async (
  txId: string,
  approverAddress: string
): Promise<MultisigTransaction> => {
  try {
    // Get transaction from database
    const db = await getDatabase();
    if (!db) {
      throw new Error('Database not initialized');
    }
    const transaction = await db.get('multisig_transactions', txId);
    
    if (!transaction) {
      throw new Error(`Transaction not found: ${txId}`);
    }
    
    if (transaction.status !== MultisigTxStatus.PENDING) {
      throw new Error(`Transaction is not pending: ${txId}`);
    }
    
    // Get wallet
    const wallet = await db.get('wallets', transaction.walletAddress);
    
    if (!wallet) {
      throw new Error(`Wallet not found: ${transaction.walletAddress}`);
    }
    
    // Verify that approver is an owner
    if (!wallet.custodians?.includes(approverAddress.toLowerCase())) {
      throw new Error(`Approver is not an owner of the wallet: ${approverAddress}`);
    }
    
    // Check if already approved
    if (transaction.approvals.includes(approverAddress.toLowerCase())) {
      throw new Error(`Transaction already approved by: ${approverAddress}`);
    }
    
    // Remove from rejections if previously rejected
    const rejectionIndex = transaction.rejections.indexOf(approverAddress.toLowerCase());
    if (rejectionIndex !== -1) {
      transaction.rejections.splice(rejectionIndex, 1);
    }
    
    // Add approval
    transaction.approvals.push(approverAddress.toLowerCase());
    
    // Update transaction status if threshold is reached
    const updatedTx = { ...transaction };
    if (updatedTx.approvals.length >= wallet.threshold) {
      updatedTx.status = MultisigTxStatus.EXECUTED;
      updatedTx.executedAt = Date.now();
      updatedTx.executedBy = approverAddress.toLowerCase();
      
      // Execute transaction on-chain (this would be implemented based on your blockchain integration)
      // For now, we just update the status
      
      // Create audit log for execution
      await createAuditLog({
        action: 'transaction_executed',
        performedBy: approverAddress.toLowerCase(),
        targetId: txId,
        targetType: 'multisig_transaction',
        walletAddress: wallet.address,
        metadata: {
          txId,
          approvals: updatedTx.approvals,
          threshold: wallet.threshold
        }
      });
    } else {
      // If not executed but approved, update status to approved
      updatedTx.status = MultisigTxStatus.APPROVED;
    }
    
    // Update transaction in database
    await db.put('multisig_transactions', updatedTx);
    
    // Create audit log
    await createAuditLog({
      action: 'transaction_approved',
      performedBy: approverAddress.toLowerCase(),
      targetId: txId,
      targetType: 'multisig_transaction',
      walletAddress: wallet.address,
      metadata: {
        txId,
        approvals: updatedTx.approvals.length,
        threshold: wallet.threshold
      }
    });
    
    return updatedTx;
  } catch (error) {
    logger.error('Error approving multi-signature transaction:', error);
    throw error;
  }
};

/**
 * Reject a multi-signature transaction
 * @param txId Transaction ID
 * @param rejectorAddress Address of the rejector
 * @param reason Reason for rejection
 * @returns Updated transaction
 */
export const rejectTransaction = async (
  txId: string,
  rejectorAddress: string,
  reason?: string
): Promise<MultisigTransaction> => {
  try {
    // Get transaction from database
    const db = await getDatabase();
    const transaction = await db.get('multisig_transactions', txId);
    
    if (!transaction) {
      throw new Error(`Transaction not found: ${txId}`);
    }
    
    if (transaction.status !== MultisigTxStatus.PENDING) {
      throw new Error(`Transaction is not pending: ${txId}`);
    }
    
    // Get wallet
    const wallet = await db.get('wallets', transaction.walletAddress);
    
    if (!wallet) {
      throw new Error(`Wallet not found: ${transaction.walletAddress}`);
    }
    
    // Verify that rejector is an owner
    if (!wallet.custodians?.includes(rejectorAddress.toLowerCase())) {
      throw new Error(`Rejector is not an owner of the wallet: ${rejectorAddress}`);
    }
    
    // Check if already rejected
    if (transaction.rejections.includes(rejectorAddress.toLowerCase())) {
      throw new Error(`Transaction already rejected by: ${rejectorAddress}`);
    }
    
    // Remove from approvals if previously approved
    const approvalIndex = transaction.approvals.indexOf(rejectorAddress.toLowerCase());
    if (approvalIndex !== -1) {
      transaction.approvals.splice(approvalIndex, 1);
    }
    
    // Add rejection
    transaction.rejections.push(rejectorAddress.toLowerCase());
    
    // Check if rejection threshold reached (more than N-threshold+1 rejections)
    // Use a default threshold of 1 if not specified
    const threshold = wallet.threshold || 1;
    const rejectionThreshold = wallet.custodians!.length - threshold + 1;
    
    // Create updated transaction object
    let updatedTx = { ...transaction };
    
    // Add rejector to rejections list if not already there
    if (!updatedTx.rejections.includes(rejectorAddress.toLowerCase())) {
      updatedTx.rejections.push(rejectorAddress.toLowerCase());
    }
    
    // Check if rejection threshold reached
    if (updatedTx.rejections.length >= rejectionThreshold) {
      // Update transaction status
      updatedTx.status = MultisigTxStatus.REJECTED;
      updatedTx.rejectedAt = Date.now();
      updatedTx.rejectedBy = rejectorAddress.toLowerCase();
    }
    
    // Add rejection reason to metadata if provided
    if (reason) {
      // Ensure metadata exists
      updatedTx.metadata = updatedTx.metadata || {};
      updatedTx.metadata.rejectionReason = reason;
    }
    
    // Update transaction in database
    await db.put('multisig_transactions', updatedTx);
    
    // Create audit log
    await createAuditLog({
      action: 'transaction_rejected',
      performedBy: rejectorAddress.toLowerCase(),
      targetId: txId,
      targetType: 'multisig_transaction',
      walletAddress: transaction.walletAddress,
      metadata: {
        txId,
        rejections: transaction.rejections.length,
        reason
      }
    });
    
    return transaction;
  } catch (error) {
    logger.error('Error rejecting multi-signature transaction:', error);
    throw error;
  }
};

/**
 * Execute a multi-signature transaction
 * @param txId Transaction ID
 * @param executorAddress Address of the executor
 * @returns Executed transaction with transaction hash
 */
export const executeTransaction = async (
  txId: string,
  executorAddress: string
): Promise<MultisigTransaction> => {
  try {
    // Get transaction from database
    const db = await getDatabase();
    const transaction = await db.get('multisig_transactions', txId);
    
    if (!transaction) {
      throw new Error(`Transaction not found: ${txId}`);
    }
    
    if (transaction.status !== MultisigTxStatus.APPROVED) {
      throw new Error(`Transaction is not approved: ${txId}`);
    }
    
    // Get wallet
    const wallet = await db.get('wallets', transaction.walletAddress);
    
    if (!wallet) {
      throw new Error(`Wallet not found: ${transaction.walletAddress}`);
    }
    
    // Verify that executor is an owner
    if (!wallet.custodians?.includes(executorAddress.toLowerCase())) {
      throw new Error(`Executor is not an owner of the wallet: ${executorAddress}`);
    }
    
    // Execute transaction on-chain (this would be implemented based on your blockchain integration)
    // For now, we just simulate a transaction hash
    const txHash = `0x${Date.now().toString(16)}${Math.random().toString(16).substring(2)}`;
    
    // Update transaction
    const updatedTx: MultisigTransaction = {
      ...transaction,
      status: MultisigTxStatus.EXECUTED,
      executedAt: Date.now(),
      executedBy: executorAddress.toLowerCase(),
      txHash,
      metadata: transaction.metadata || {}
    };
    
    // Update transaction in database
    await db.put('multisig_transactions', updatedTx);
    
    // Create audit log
    await createAuditLog({
      action: 'transaction_executed',
      performedBy: executorAddress.toLowerCase(),
      targetId: txId,
      targetType: 'multisig_transaction',
      walletAddress: transaction.walletAddress,
      metadata: {
        txId,
        txHash,
        executedAt: updatedTx.executedAt
      }
    });
    
    return updatedTx;
  } catch (error) {
    logger.error('Error executing multi-signature transaction:', error);
    throw error;
  }
};

export const getMultisigWallet = async (address: string): Promise<WalletInfo | null> => {
  try {
    const db = await getDatabase();
    if (!db) {
      throw new Error('Database not initialized');
    }

    const tx = db.transaction('wallets', 'readonly');
    const store = tx.objectStore('wallets');
    const wallet = await store.get(address.toLowerCase());
    
    return wallet || null;
  } catch (error) {
    logger.error(`Error getting multisig wallet ${address}:`, error);
    throw error;
  }
};

export const updateWalletLastActivity = async (address: string): Promise<void> => {
  try {
    const db = await getDatabase();
    if (!db) {
      throw new Error('Database not initialized');
    }

    const tx = db.transaction('wallets', 'readwrite');
    const store = tx.objectStore('wallets');
    const wallet = await store.get(address.toLowerCase());

    if (wallet) {
      wallet.lastActivity = Date.now();
      await store.put(wallet);
      await tx.done;
    }
  } catch (error) {
    logger.error(`Error updating wallet activity ${address}:`, error);
    throw error;
  }
};

// Update getWalletInfo function with proper types
export const getWalletInfo = async (address: string): Promise<WalletInfo | null> => {
  try {
    const db = await getDatabase();
    if (!db) {
      throw new Error('Database not initialized');
    }

    const tx = db.transaction('wallets', 'readonly');
    const store = tx.objectStore('wallets');
    const wallet = await store.get(address.toLowerCase());

    if (!wallet) {
      return null;
    }

    return {
      ...wallet,
      status: wallet.status || 'active', // Ensure status is set
      type: wallet.type || 'smart',  // Default to smart wallet type
      deployedAt: wallet.deployedAt || Date.now(), // Ensure deployedAt is set
    };
  } catch (error) {
    logger.error(`Error getting wallet info for ${address}:`, error);
    throw error;
  }
};

// Update addWallet function to include all required properties
export const addWallet = async (wallet: Omit<WalletInfo, 'status' | 'deployedAt'>): Promise<void> => {
  try {
    const db = await getDatabase();
    if (!db) {
      throw new Error('Database not initialized');
    }

    const walletInfo: WalletInfo = {
      ...wallet,
      status: 'active',
      deployedAt: Date.now(),
      lastActivity: Date.now()
    };

    const tx = db.transaction('wallets', 'readwrite');
    const store = tx.objectStore('wallets');
    await store.put(walletInfo);
    await tx.done;

    logger.debug(`Wallet ${wallet.address} added to database`);
  } catch (error) {
    logger.error(`Error adding wallet ${wallet.address}:`, error);
    throw error;
  }
};

// Update the operation validation function with proper type checking
const validateMultisigOperation = async (wallet: WalletInfo, requiredSigners: number): Promise<boolean> => {
  if (typeof wallet.threshold !== 'number') {
    throw new Error('Wallet threshold not configured');
  }
  return requiredSigners >= wallet.threshold;
};

export default {
  createMultisigWallet,
  proposeTransaction,
  approveTransaction,
  rejectTransaction,
  executeTransaction,
  getMultisigWallet,
  updateWalletLastActivity,
  getWalletInfo,
  addWallet
};
