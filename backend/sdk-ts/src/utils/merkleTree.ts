/**
 * @title MerkleTreeLib
 * @description TypeScript implementation of the MerkleTreeLib Solidity contract
 */

import { ethers } from 'ethers';

/**
 * Create a Merkle root from a list of addresses
 * @param {string[]} leaves - List of addresses
 * @returns {string} - Merkle root
 */
export function createMerkleRoot(leaves: string[]): string {
  if (!leaves || leaves.length === 0) {
    throw new Error('No leaves provided');
  }

  // Convert addresses to leaf nodes
  let nodes = leaves.map(leaf => 
    ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['address'], [leaf]))
  );

  // Build the Merkle tree
  while (nodes.length > 1) {
    const nextLevel: string[] = [];
    for (let i = 0; i < nodes.length; i += 2) {
      if (i + 1 < nodes.length) {
        // Sort the pair of nodes to ensure consistent ordering
        const [first, second] = nodes[i] < nodes[i + 1] 
          ? [nodes[i], nodes[i + 1]] 
          : [nodes[i + 1], nodes[i]];
        
        // Hash the pair of nodes
        nextLevel.push(
          ethers.utils.keccak256(
            ethers.utils.solidityPack(['bytes32', 'bytes32'], [first, second])
          )
        );
      } else {
        // If there's an odd number of nodes, promote the last node
        nextLevel.push(nodes[i]);
      }
    }
    nodes = nextLevel;
  }

  return nodes[0];
}

/**
 * Generate a Merkle proof for an address
 * @param {string[]} leaves - List of addresses
 * @param {number} index - Index of the address
 * @returns {string[]} - Merkle proof
 */
export function generateProof(leaves: string[], index: number): string[] {
  if (!leaves || leaves.length === 0) {
    throw new Error('No leaves provided');
  }
  if (index >= leaves.length) {
    throw new Error('Invalid index');
  }

  // Convert addresses to leaf nodes
  let nodes = leaves.map(leaf => 
    ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['address'], [leaf]))
  );

  // Calculate the depth of the tree
  let depth = 0;
  let levelLength = leaves.length;
  while ((levelLength + (1 << depth) - 1) / (1 << depth) > 1) {
    depth++;
  }

  // Generate the proof
  const proof: string[] = [];
  let currentIndex = index;

  for (let i = 0; i < depth; i++) {
    if (currentIndex % 2 === 0 && currentIndex + 1 < levelLength) {
      // If current index is even and has a sibling, add the sibling to the proof
      proof.push(nodes[currentIndex + 1]);
    } else if (currentIndex % 2 === 1) {
      // If current index is odd, add its sibling to the proof
      proof.push(nodes[currentIndex - 1]);
    } else {
      // If there's no sibling, add a zero hash
      proof.push(ethers.constants.HashZero);
    }

    // Move to the next level
    const nextLevel: string[] = [];
    for (let j = 0; j < levelLength; j += 2) {
      if (j + 1 < levelLength) {
        // Sort the pair of nodes to ensure consistent ordering
        const [first, second] = nodes[j] < nodes[j + 1] 
          ? [nodes[j], nodes[j + 1]] 
          : [nodes[j + 1], nodes[j]];
        
        // Hash the pair of nodes
        nextLevel.push(
          ethers.utils.keccak256(
            ethers.utils.solidityPack(['bytes32', 'bytes32'], [first, second])
          )
        );
      } else {
        // If there's an odd number of nodes, promote the last node
        nextLevel.push(nodes[j]);
      }
    }

    nodes = nextLevel;
    levelLength = Math.floor((levelLength + 1) / 2);
    currentIndex = Math.floor(currentIndex / 2);
  }

  return proof;
}

/**
 * Verify a Merkle proof
 * @param {string} root - Merkle root
 * @param {string} leaf - Leaf node (address)
 * @param {string[]} proof - Merkle proof
 * @returns {boolean} - Whether the proof is valid
 */
export function verifyProof(root: string, leaf: string, proof: string[]): boolean {
  // Convert address to leaf node
  let computedHash = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(['address'], [leaf])
  );

  // Verify the proof
  for (const proofElement of proof) {
    if (proofElement === ethers.constants.HashZero) {
      continue;
    }

    // Sort the pair of hashes to ensure consistent ordering
    const [first, second] = computedHash < proofElement 
      ? [computedHash, proofElement] 
      : [proofElement, computedHash];
    
    // Hash the pair of hashes
    computedHash = ethers.utils.keccak256(
      ethers.utils.solidityPack(['bytes32', 'bytes32'], [first, second])
    );
  }

  return computedHash === root;
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
  if (!currentLeaves || currentLeaves.length === 0) {
    throw new Error('No leaves provided');
  }

  let updatedLeaves: string[];
  if (add) {
    // Add the new leaf
    updatedLeaves = [...currentLeaves, newLeaf];
  } else {
    // Remove the leaf at the specified index
    if (index >= currentLeaves.length) {
      throw new Error('Invalid index');
    }
    updatedLeaves = currentLeaves.filter((_, i) => i !== index);
  }

  // Create a new Merkle root
  return createMerkleRoot(updatedLeaves);
}
