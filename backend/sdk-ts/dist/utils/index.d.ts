/**
 * @title RyzerUtils
 * @description Utility functions for the Ryzer SDK
 */
import { UserOperation, CreateUserOpParams, RyzerConstants } from '../types';
export * from './merkleTree';
/**
 * Create a user operation object
 * @param {CreateUserOpParams} params - User operation parameters
 * @returns {UserOperation} - User operation object
 */
export declare function createUserOp(params: CreateUserOpParams): UserOperation;
/**
 * Sign a user operation
 * @param {UserOperation} userOp - User operation object
 * @param {string} privateKey - Private key for signing
 * @returns {string} - Signature
 */
export declare function signUserOp(userOp: UserOperation, privateKey: string): Promise<string>;
/**
 * Get the hash of a user operation
 * @param {UserOperation} userOp - User operation object
 * @returns {string} - User operation hash
 */
export declare function getUserOpHash(userOp: UserOperation): string;
/**
 * Create a Merkle root from a list of addresses
 * @param {string[]} addresses - List of addresses
 * @returns {string} - Merkle root
 */
export declare function createMerkleRoot(addresses: string[]): string;
/**
 * Generate a Merkle proof for an address
 * @param {string[]} addresses - List of addresses
 * @param {number} index - Index of the address
 * @returns {string[]} - Merkle proof
 */
export declare function generateMerkleProof(addresses: string[], index: number): string[];
/**
 * Verify a Merkle proof
 * @param {string} root - Merkle root
 * @param {string} leaf - Leaf node
 * @param {string[]} proof - Merkle proof
 * @returns {boolean} - Whether the proof is valid
 */
export declare function verifyMerkleProof(root: string, leaf: string, proof: string[]): boolean;
/**
 * Update a Merkle root
 * @param {string[]} currentLeaves - Current leaves
 * @param {string} newLeaf - New leaf
 * @param {boolean} add - Whether to add or remove
 * @param {number} index - Index for removal
 * @returns {string} - Updated Merkle root
 */
export declare function updateMerkleRoot(currentLeaves: string[], newLeaf: string, add: boolean, index: number): string;
/**
 * Create a delegation signature
 * @param {string} operation - Operation name
 * @param {string} delegator - Delegator address
 * @param {string} privateKey - Private key for signing
 * @returns {string} - Delegation data
 */
export declare function createDelegationSignature(operation: string, delegator: string, privateKey: string): string;
/**
 * Convert a hash to an Ethereum signed message hash
 * @param {string} hash - Hash to convert
 * @returns {string} - Ethereum signed message hash
 */
export declare function toEthSignedMessageHash(hash: string): string;
/**
 * Encode function data
 * @param {string} functionSignature - Function signature
 * @param {any[]} params - Function parameters
 * @returns {string} - Encoded function data
 */
export declare function encodeFunctionData(functionSignature: string, params: any[]): string;
/**
 * Decode function data
 * @param {string} functionSignature - Function signature
 * @param {string} data - Encoded function data
 * @returns {any} - Decoded function parameters
 */
export declare function decodeFunctionData(functionSignature: string, data: string): any;
/**
 * Get the role hash
 * @param {string} role - Role name
 * @returns {string} - Role hash
 */
export declare function getRoleHash(role: string): string;
/**
 * Constants
 */
export declare const constants: RyzerConstants;
