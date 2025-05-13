declare module 'alchemy-sdk' {
  export enum Network {
    ETH_MAINNET = 'eth-mainnet',
    ETH_GOERLI = 'eth-goerli',
    ETH_SEPOLIA = 'eth-sepolia',
    MATIC_MAINNET = 'polygon-mainnet',
    MATIC_MUMBAI = 'polygon-mumbai',
    ARB_MAINNET = 'arb-mainnet',
    ARB_GOERLI = 'arb-goerli',
    OPT_MAINNET = 'opt-mainnet',
    OPT_GOERLI = 'opt-goerli',
    BASE_MAINNET = 'base-mainnet',
    BASE_GOERLI = 'base-goerli'
  }

  export interface AlchemySettings {
    apiKey: string;
    network?: Network;
    maxRetries?: number;
    batchRequests?: boolean;
    url?: string;
  }

  export class Alchemy {
    constructor(settings: AlchemySettings);
    core: AlchemyCore;
    nft: NftNamespace;
    ws: WebSocketNamespace;
  }

  export interface AlchemyCore {
    getBlockNumber(): Promise<number>;
    getBlock(blockHashOrBlockTag: string | number): Promise<any>;
    getAssetTransfers(options: any): Promise<any>;
  }

  export interface NftNamespace {
    getNftsForOwner(owner: string): Promise<any>;
    getNftMetadata(contractAddress: string, tokenId: string): Promise<any>;
  }

  export interface WebSocketNamespace {
    on(event: string, listener: (...args: any[]) => void): void;
    removeAllListeners(event?: string): void;
  }
}
