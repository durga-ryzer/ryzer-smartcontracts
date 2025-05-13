// Type declarations for Ryzer SDK modules

// Define interfaces for each module without using relative imports
export interface RyzerCore {
  batchTransactions(walletAddress: string, transactions: any[]): Promise<any>;
  simulateTransaction(from: string, to: string, data: string, value: string): Promise<any>;
  // Add other methods as needed
}

export interface RyzerFactory {
  createWallet(params: any): Promise<string>;
  // Add other methods as needed
}

export interface RyzerCrosschain {
  transferERC20(walletAddress: string, params: any): Promise<any>;
  estimateFee(token: string, amount: any, targetChainId: number): Promise<string>;
  // Add other methods as needed
}

export interface RyzerPaymaster {
  sponsorUserOperation(userOp: any): Promise<any>;
  // Add other methods as needed
}

export interface RyzerRecovery {
  addGuardian(walletAddress: string, guardianAddress: string, weight: number): Promise<any>;
  initiateRecovery(walletAddress: string, newOwner: string): Promise<any>;
  // Add other methods as needed
}

export interface RyzerTokenManagement {
  getTokenBalance(walletAddress: string, tokenAddress: string): Promise<string>;
  // Add other methods as needed
}
