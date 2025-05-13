/**
 * @title MerkleTreeLib
 * @description TypeScript implementation of the MerkleTreeLib Solidity contract
 */
/**
 * Create a Merkle root from a list of addresses
 * @param {string[]} leaves - List of addresses
 * @returns {string} - Merkle root
 */
export declare function createMerkleRoot(leaves: string[]): string;
/**
 * Generate a Merkle proof for an address
 * @param {string[]} leaves - List of addresses
 * @param {number} index - Index of the address
 * @returns {string[]} - Merkle proof
 */
export declare function generateProof(leaves: string[], index: number): string[];
/**
 * Verify a Merkle proof
 * @param {string} root - Merkle root
 * @param {string} leaf - Leaf node (address)
 * @param {string[]} proof - Merkle proof
 * @returns {boolean} - Whether the proof is valid
 */
export declare function verifyProof(root: string, leaf: string, proof: string[]): boolean;
/**
 * Update a Merkle root
 * @param {string[]} currentLeaves - Current leaves
 * @param {string} newLeaf - New leaf
 * @param {boolean} add - Whether to add or remove
 * @param {number} index - Index for removal
 * @returns {string} - Updated Merkle root
 */
export declare function updateMerkleRoot(currentLeaves: string[], newLeaf: string, add: boolean, index: number): string;
