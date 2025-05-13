// Type fixes for TypeScript errors

// Fix for req.user possibly being undefined
import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user: {
        walletAddress: string;
        id?: string;
        role?: string;
      };
    }
  }
}

// Fix for indexing errors in relayer service
declare global {
  interface Window {
    smartAccountClients: Record<string, any>;
    pimlicoClients: Record<number, any>;
    providers: Record<number, any>;
  }

  var smartAccountClients: Record<string, any>;
  var pimlicoClients: Record<number, any>;
  var providers: Record<number, any>;
}

// Fix for Transaction interface
declare module './index' {
  interface Transaction {
    tokenId?: string;
  }
}

export {};
