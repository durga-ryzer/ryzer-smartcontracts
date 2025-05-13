// Type declarations for utility functions

// Export utility functions directly
export function formatAddress(address: string): string;
export function validateAddress(address: string): boolean;
export function convertToWei(amount: string, decimals?: number): string;
export function convertFromWei(amount: string, decimals?: number): string;

// Merkle tree utilities
export function createMerkleRoot(leaves: string[]): string;
export function generateProof(leaves: string[], index: number): string[];
export function verifyProof(root: string, leaf: string, proof: string[]): boolean;
export function updateMerkleRoot(currentLeaves: string[], newLeaf: string, add: boolean, index: number): string;
