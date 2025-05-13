"use strict";
/**
 * @title RyzerUtils
 * @description Utility functions for the Ryzer SDK
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.constants = void 0;
exports.createUserOp = createUserOp;
exports.signUserOp = signUserOp;
exports.getUserOpHash = getUserOpHash;
exports.createMerkleRoot = createMerkleRoot;
exports.generateMerkleProof = generateMerkleProof;
exports.verifyMerkleProof = verifyMerkleProof;
exports.updateMerkleRoot = updateMerkleRoot;
exports.createDelegationSignature = createDelegationSignature;
exports.toEthSignedMessageHash = toEthSignedMessageHash;
exports.encodeFunctionData = encodeFunctionData;
exports.decodeFunctionData = decodeFunctionData;
exports.getRoleHash = getRoleHash;
const ethers_1 = require("ethers");
// Import merkle tree functions
const merkleTree_1 = require("./merkleTree");
// Re-export merkle tree functions
__exportStar(require("./merkleTree"), exports);
/**
 * Create a user operation object
 * @param {CreateUserOpParams} params - User operation parameters
 * @returns {UserOperation} - User operation object
 */
function createUserOp(params) {
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
async function signUserOp(userOp, privateKey) {
    const wallet = new ethers_1.ethers.Wallet(privateKey);
    const userOpHash = getUserOpHash(userOp);
    const signature = await wallet.signMessage(ethers_1.ethers.utils.arrayify(userOpHash));
    return signature;
}
/**
 * Get the hash of a user operation
 * @param {UserOperation} userOp - User operation object
 * @returns {string} - User operation hash
 */
function getUserOpHash(userOp) {
    const packedUserOp = ethers_1.ethers.utils.defaultAbiCoder.encode([
        'address', // sender
        'uint256', // nonce
        'bytes32', // initCode hash
        'bytes32', // callData hash
        'uint256', // callGasLimit
        'uint256', // verificationGasLimit
        'uint256', // preVerificationGas
        'uint256', // maxFeePerGas
        'uint256', // maxPriorityFeePerGas
        'bytes32' // paymasterAndData hash
    ], [
        userOp.sender,
        userOp.nonce,
        ethers_1.ethers.utils.keccak256(userOp.initCode),
        ethers_1.ethers.utils.keccak256(userOp.callData),
        userOp.callGasLimit,
        userOp.verificationGasLimit,
        userOp.preVerificationGas,
        userOp.maxFeePerGas,
        userOp.maxPriorityFeePerGas,
        ethers_1.ethers.utils.keccak256(userOp.paymasterAndData)
    ]);
    return ethers_1.ethers.utils.keccak256(packedUserOp);
}
/**
 * Create a Merkle root from a list of addresses
 * @param {string[]} addresses - List of addresses
 * @returns {string} - Merkle root
 */
function createMerkleRoot(addresses) {
    return (0, merkleTree_1.createMerkleRoot)(addresses);
}
/**
 * Generate a Merkle proof for an address
 * @param {string[]} addresses - List of addresses
 * @param {number} index - Index of the address
 * @returns {string[]} - Merkle proof
 */
function generateMerkleProof(addresses, index) {
    return (0, merkleTree_1.generateProof)(addresses, index);
}
/**
 * Verify a Merkle proof
 * @param {string} root - Merkle root
 * @param {string} leaf - Leaf node
 * @param {string[]} proof - Merkle proof
 * @returns {boolean} - Whether the proof is valid
 */
function verifyMerkleProof(root, leaf, proof) {
    return (0, merkleTree_1.verifyProof)(root, leaf, proof);
}
/**
 * Update a Merkle root
 * @param {string[]} currentLeaves - Current leaves
 * @param {string} newLeaf - New leaf
 * @param {boolean} add - Whether to add or remove
 * @param {number} index - Index for removal
 * @returns {string} - Updated Merkle root
 */
function updateMerkleRoot(currentLeaves, newLeaf, add, index) {
    return (0, merkleTree_1.updateMerkleRoot)(currentLeaves, newLeaf, add, index);
}
/**
 * Create a delegation signature
 * @param {string} operation - Operation name
 * @param {string} delegator - Delegator address
 * @param {string} privateKey - Private key for signing
 * @returns {string} - Delegation data
 */
function createDelegationSignature(operation, delegator, privateKey) {
    const wallet = new ethers_1.ethers.Wallet(privateKey);
    const messageHash = ethers_1.ethers.utils.keccak256(ethers_1.ethers.utils.defaultAbiCoder.encode(['string', 'address'], [operation, delegator]));
    const signature = wallet.signMessage(ethers_1.ethers.utils.arrayify(messageHash));
    return ethers_1.ethers.utils.defaultAbiCoder.encode(['bytes32', 'bytes'], [messageHash, signature]);
}
/**
 * Convert a hash to an Ethereum signed message hash
 * @param {string} hash - Hash to convert
 * @returns {string} - Ethereum signed message hash
 */
function toEthSignedMessageHash(hash) {
    return ethers_1.ethers.utils.keccak256(ethers_1.ethers.utils.solidityPack(['string', 'bytes32'], ['\x19Ethereum Signed Message:\n32', hash]));
}
/**
 * Encode function data
 * @param {string} functionSignature - Function signature
 * @param {any[]} params - Function parameters
 * @returns {string} - Encoded function data
 */
function encodeFunctionData(functionSignature, params) {
    const iface = new ethers_1.ethers.utils.Interface([`function ${functionSignature}`]);
    const functionName = functionSignature.split('(')[0].trim();
    return iface.encodeFunctionData(functionName, params);
}
/**
 * Decode function data
 * @param {string} functionSignature - Function signature
 * @param {string} data - Encoded function data
 * @returns {any} - Decoded function parameters
 */
function decodeFunctionData(functionSignature, data) {
    const iface = new ethers_1.ethers.utils.Interface([`function ${functionSignature}`]);
    const functionName = functionSignature.split('(')[0].trim();
    const result = iface.decodeFunctionData(functionName, data);
    return Array.from(result);
}
/**
 * Get the role hash
 * @param {string} role - Role name
 * @returns {string} - Role hash
 */
function getRoleHash(role) {
    return ethers_1.ethers.utils.keccak256(ethers_1.ethers.utils.toUtf8Bytes(role));
}
/**
 * Constants
 */
exports.constants = {
    CUSTODIAN_ROLE: ethers_1.ethers.utils.keccak256(ethers_1.ethers.utils.toUtf8Bytes('CUSTODIAN_ROLE')),
    BROKER_ROLE: ethers_1.ethers.utils.keccak256(ethers_1.ethers.utils.toUtf8Bytes('BROKER_ROLE')),
    ADMIN_ROLE: ethers_1.ethers.utils.keccak256(ethers_1.ethers.utils.toUtf8Bytes('ADMIN_ROLE')),
    RECOVERY_ROLE: ethers_1.ethers.utils.keccak256(ethers_1.ethers.utils.toUtf8Bytes('RECOVERY_ROLE')),
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
