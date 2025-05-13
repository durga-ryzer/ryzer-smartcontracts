/**
 * Extended Transaction interface to include NFT and cross-chain properties
 */
import { Transaction } from './index';

// Extend the Transaction interface to include additional NFT and cross-chain properties
declare module './index' {
  export interface Transaction {
    // NFT-specific properties
    nftMetadata?: {
      name?: string;
      description?: string;
      image?: string;
      attributes?: Array<{ trait_type: string; value: string }>;
    };
    
    // Cross-chain specific properties
    crossChainId?: string;
    sourceChainId?: number;
    destinationChainId?: number;
    bridgeProvider?: string;
    bridgeTxHash?: string;
    bridgeStatus?: 'pending' | 'bridging' | 'completed' | 'failed';
  }
}

export {};
