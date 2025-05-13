// Module declarations for all our internal modules
declare module './modules/core' {
  import { RyzerCore } from './modules/core';
  export { RyzerCore };
}

declare module './modules/factory' {
  import { RyzerFactory } from './modules/factory';
  export { RyzerFactory };
}

declare module './modules/crosschain' {
  import { RyzerCrosschain } from './modules/crosschain';
  export { RyzerCrosschain };
}

declare module './modules/paymaster' {
  import { RyzerPaymaster } from './modules/paymaster';
  export { RyzerPaymaster };
}

declare module './modules/recovery' {
  import { RyzerRecovery } from './modules/recovery';
  export { RyzerRecovery };
}

declare module './modules/tokenManagement' {
  import { RyzerTokenManagement } from './modules/tokenManagement';
  export { RyzerTokenManagement };
}

declare module './utils' {
  import * as utils from './utils/index';
  export = utils;
}

declare module './utils/merkleTree' {
  export function createMerkleRoot(leaves: string[]): string;
  export function generateProof(leaves: string[], index: number): string[];
  export function verifyProof(root: string, leaf: string, proof: string[]): boolean;
  export function updateMerkleRoot(currentLeaves: string[], newLeaf: string, add: boolean, index: number): string;
}
