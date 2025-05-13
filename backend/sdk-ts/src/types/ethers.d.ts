declare module 'ethers' {
  export namespace ethers {
    export type BigNumberish = string | number | BigNumber;
    export type ContractTransaction = Promise<any>;
    
    export class Wallet {
      constructor(privateKey: string, provider?: providers.Provider);
      connect(provider: providers.Provider): Wallet;
      signMessage(message: Uint8Array | string): Promise<string>;
      address: string;
      provider?: providers.Provider;
    }

    export namespace providers {
      export type BlockTag = string | number;
      export class Provider {
        getBalance(addressOrName: string, blockTag?: BlockTag): Promise<BigNumber>;
      }
      export class JsonRpcProvider extends Provider {
        constructor(url?: string, network?: any);
      }
    }

    export class Contract {
      constructor(address: string, abi: any, providerOrSigner: providers.Provider | Wallet);
      connect(signerOrProvider: Wallet | providers.Provider): Contract;
      [key: string]: any; // Allow any method to be called on Contract
    }

    export class BigNumber {
      toNumber(): number;
      toString(): string;
      static from(value: any): BigNumber;
    }

    export namespace utils {
      export function arrayify(value: any): Uint8Array;
      export function keccak256(value: any): string;
      export function toUtf8Bytes(text: string): Uint8Array;
      export function solidityPack(types: string[], values: any[]): string;
      export const defaultAbiCoder: {
        encode(types: string[], values: any[]): string;
        decode(types: string[], data: string): any[];
      };
      export class Interface {
        constructor(fragments: string[]);
        encodeFunctionData(functionName: string, values: any[]): string;
        decodeFunctionData(functionName: string, data: string): any;
      }
    }

    export const constants: {
      HashZero: string;
    };
  }

  export default ethers;
}
