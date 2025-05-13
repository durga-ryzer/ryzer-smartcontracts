// Comprehensive TypeScript fixes for all remaining errors

// Fix for req.user possibly being undefined in Express Request
import { Request } from 'express';
import { ethers } from 'ethers';

declare global {
  namespace Express {
    // Make user required in Request
    interface Request {
      user: {
        walletAddress: string;
        id?: string;
        role?: string;
      };
    }
  }
}

// Fix for collections in relayer service
declare global {
  // Define global collections
  var smartAccountClients: Record<string, any>;
  var pimlicoClients: Record<number, any>;
  var providers: Record<number, any>;
}

// SDK related type declarations
declare module 'ryzer-sdk' {
  export class RyzerSDK {
    provider: ethers.providers.Provider;
    privateKey?: string;
    connect(privateKey: string): RyzerSDK;
    createWallet(params: any): Promise<string>;
    
    // Modules
    crosschain: {
      transferERC20(walletAddress: string, params: TransferERC20Params): Promise<ethers.ContractTransaction>;
      estimateFee(token: string, amount: ethers.BigNumberish, targetChainId: number): Promise<string>;
    };
    recovery: {
      addGuardian(walletAddress: string, guardianAddress: string, weight: number): Promise<ethers.ContractTransaction>;
      initiateRecovery(walletAddress: string, newOwner: string): Promise<ethers.ContractTransaction>;
    };
    core: {
      batchTransactions(walletAddress: string, transactions: any[]): Promise<ethers.ContractTransaction>;
      simulateTransaction(from: string, to: string, data: string, value: string): Promise<any>;
    };
  }
  
  export interface TransferERC20Params {
    token: string;
    amount: ethers.BigNumberish;
    recipient: string;
    targetChainId: number;
    adapterParams?: string;
  }
}

// Fix for Transaction interface to include tokenId
declare module './index' {
  export interface Transaction {
    tokenId?: string;
  }
}

// Also define it globally to ensure it's recognized everywhere
declare global {
  interface Transaction {
    hash: string;
    from: string;
    to: string;
    value: string;
    data?: string;
    timestamp: number;
    status: 'pending' | 'confirmed' | 'failed';
    chainId: number;
    blockNumber?: number;
    gasUsed?: string;
    gasPrice?: string;
    category?: string;
    asset?: string;
    tokenId?: string;
  }
}

// Fix for error handling
declare global {
  interface Error {
    status?: number;
    code?: string;
  }
}

export {};
