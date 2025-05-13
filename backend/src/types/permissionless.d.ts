declare module 'permissionless' {
  import { Chain, Client, Transport } from 'viem';
  
  export const createSmartAccountClient: (config: {
    account: any;
    chain: Chain;
    bundlerTransport: Transport;
    paymaster?: any;
    userOperation?: any;
  }) => {
    sendTransaction: (params: { to: string; value: bigint; data: string }) => Promise<string>;
  };
  
  export const createPimlicoClient: (config: {
    transport: Transport;
    entryPoint: string | {
      address: string;
      version: string;
    };
  }) => {
    sendUserOperation: (params: any) => Promise<{ hash: string }>;
    waitForUserOperationReceipt: (hash: string) => Promise<any>;
    getUserOperationGasPrice: () => Promise<{ fast: any }>;
  };
}

declare module 'permissionless/accounts' {
  export const toSafeSmartAccount: (config: {
    address?: string;
    client?: any;
    owners?: any[];
    owner?: any;
    entryPoint: string;
    chain?: any;
    bundlerTransport?: any;
    version?: string;
  }) => Promise<any>;
}
