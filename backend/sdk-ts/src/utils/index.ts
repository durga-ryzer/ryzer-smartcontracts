/**
 * @title RyzerUtils
 * @description Utility functions for the Ryzer SDK
 */

import { ethers } from 'ethers';
import { UserOperation, CreateUserOpParams, RyzerConstants } from '../types';

// Import merkle tree functions
import { createMerkleRoot as merkleCreateRoot, generateProof as merkleGenerateProof, verifyProof as merkleVerifyProof, updateMerkleRoot as merkleUpdateRoot } from './merkleTree';

// Re-export merkle tree functions
export * from './merkleTree';

/**
 * Create a user operation object
 * @param {CreateUserOpParams} params - User operation parameters
 * @returns {UserOperation} - User operation object
 */
export function createUserOp(params: CreateUserOpParams): UserOperation {
  return {
    sender: params.sender,
    nonce: params.nonce || 0,
    initCode: params.initCode || '0x',
    callData: params.callData || '0x',
    callGasLimit: params.callGasLimit || 200000,
    verificationGasLimit: params.verificationGasLimit || 150000,
    preVerificationGas: params.preVerificationGas || 21000,
    maxFeePerGas: params.maxFeePerGas || 1000000000,
    maxPriorityFeePerGas: params.maxPriorityFeePerGas || 1000000000,
    paymasterAndData: params.paymasterAndData || '0x',
    signature: '0x'
  };
}

/**
 * Sign a user operation
 * @param {UserOperation} userOp - User operation object
 * @param {string} privateKey - Private key for signing
 * @returns {string} - Signature
 */
export async function signUserOp(userOp: UserOperation, privateKey: string): Promise<string> {
  const wallet = new ethers.Wallet(privateKey);
  const userOpHash = getUserOpHash(userOp);
  const signature = await wallet.signMessage(ethers.utils.arrayify(userOpHash));
  return signature;
}

/**
 * Get the hash of a user operation
 * @param {UserOperation} userOp - User operation object
 * @returns {string} - User operation hash
 */
export function getUserOpHash(userOp: UserOperation): string {
  const packedUserOp = ethers.utils.defaultAbiCoder.encode(
    [
      'address', // sender
      'uint256', // nonce
      'bytes32', // initCode hash
      'bytes32', // callData hash
      'uint256', // callGasLimit
      'uint256', // verificationGasLimit
      'uint256', // preVerificationGas
      'uint256', // maxFeePerGas
      'uint256', // maxPriorityFeePerGas
      'bytes32'  // paymasterAndData hash
    ],
    [
      userOp.sender,
      userOp.nonce,
      ethers.utils.keccak256(userOp.initCode),
      ethers.utils.keccak256(userOp.callData),
      userOp.callGasLimit,
      userOp.verificationGasLimit,
      userOp.preVerificationGas,
      userOp.maxFeePerGas,
      userOp.maxPriorityFeePerGas,
      ethers.utils.keccak256(userOp.paymasterAndData)
    ]
  );
  return ethers.utils.keccak256(packedUserOp);
}

/**
 * Create a Merkle root from a list of addresses
 * @param {string[]} addresses - List of addresses
 * @returns {string} - Merkle root
 */
export function createMerkleRoot(addresses: string[]): string {
  return merkleCreateRoot(addresses);
}

/**
 * Generate a Merkle proof for an address
 * @param {string[]} addresses - List of addresses
 * @param {number} index - Index of the address
 * @returns {string[]} - Merkle proof
 */
export function generateMerkleProof(addresses: string[], index: number): string[] {
  return merkleGenerateProof(addresses, index);
}

/**
 * Verify a Merkle proof
 * @param {string} root - Merkle root
 * @param {string} leaf - Leaf node
 * @param {string[]} proof - Merkle proof
 * @returns {boolean} - Whether the proof is valid
 */
export function verifyMerkleProof(root: string, leaf: string, proof: string[]): boolean {
  return merkleVerifyProof(root, leaf, proof);
}

/**
 * Update a Merkle root
 * @param {string[]} currentLeaves - Current leaves
 * @param {string} newLeaf - New leaf
 * @param {boolean} add - Whether to add or remove
 * @param {number} index - Index for removal
 * @returns {string} - Updated Merkle root
 */
export function updateMerkleRoot(currentLeaves: string[], newLeaf: string, add: boolean, index: number): string {
  return merkleUpdateRoot(currentLeaves, newLeaf, add, index);
}

/**
 * Create a delegation signature
 * @param {string} operation - Operation name
 * @param {string} delegator - Delegator address
 * @param {string} privateKey - Private key for signing
 * @returns {string} - Delegation data
 */
export function createDelegationSignature(operation: string, delegator: string, privateKey: string): string {
  const wallet = new ethers.Wallet(privateKey);
  const messageHash = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ['string', 'address'],
      [operation, delegator]
    )
  );
  
  const signature = wallet.signMessage(ethers.utils.arrayify(messageHash));
  return ethers.utils.defaultAbiCoder.encode(
    ['bytes32', 'bytes'],
    [messageHash, signature]
  );
}

/**
 * Convert a hash to an Ethereum signed message hash
 * @param {string} hash - Hash to convert
 * @returns {string} - Ethereum signed message hash
 */
export function toEthSignedMessageHash(hash: string): string {
  return ethers.utils.keccak256(
    ethers.utils.solidityPack(
      ['string', 'bytes32'],
      ['\x19Ethereum Signed Message:\n32', hash]
    )
  );
}

/**
 * Encode function data
 * @param {string} functionSignature - Function signature
 * @param {any[]} params - Function parameters
 * @returns {string} - Encoded function data
 */
export function encodeFunctionData(functionSignature: string, params: any[]): string {
  const iface = new ethers.utils.Interface([`function ${functionSignature}`]);
  const functionName = functionSignature.split('(')[0].trim();
  return iface.encodeFunctionData(functionName, params);
}

/**
 * Decode function data
 * @param {string} functionSignature - Function signature
 * @param {string} data - Encoded function data
 * @returns {any} - Decoded function parameters
 */
export function decodeFunctionData(functionSignature: string, data: string): any {
  const iface = new ethers.utils.Interface([`function ${functionSignature}`]);
  const functionName = functionSignature.split('(')[0].trim();
  const result = iface.decodeFunctionData(functionName, data);
  return Array.from(result);
}

/**
 * Get the role hash
 * @param {string} role - Role name
 * @returns {string} - Role hash
 */
export function getRoleHash(role: string): string {
  return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(role));
}

/**
 * Constants
 */
export const constants: RyzerConstants = {
  CUSTODIAN_ROLE: ethers.utils.keccak256(ethers.utils.toUtf8Bytes('CUSTODIAN_ROLE')),
  BROKER_ROLE: ethers.utils.keccak256(ethers.utils.toUtf8Bytes('BROKER_ROLE')),
  ADMIN_ROLE: ethers.utils.keccak256(ethers.utils.toUtf8Bytes('ADMIN_ROLE')),
  RECOVERY_ROLE: ethers.utils.keccak256(ethers.utils.toUtf8Bytes('RECOVERY_ROLE')),
  DEFAULT_ADMIN_ROLE: '0x0000000000000000000000000000000000000000000000000000000000000000',
  DEFAULT_ROLE_DURATION: 365 * 24 * 60 * 60, // 365 days in seconds
  MAX_GAS_PER_OP: 1000000,
  RATE_LIMIT_BLOCKS: 10,
  FEE_DENOMINATOR: 10000,
  MAX_FEE_BASIS_POINTS: 1000,
  MAX_ADAPTERS: 10,
  FEE_CACHE_DURATION: 60 * 60, // 1 hour in seconds
  ORACLE_STALENESS_THRESHOLD: 30 * 60, // 30 minutes in seconds
  MIN_ADAPTER_SUCCESS_RATE: 80
};
