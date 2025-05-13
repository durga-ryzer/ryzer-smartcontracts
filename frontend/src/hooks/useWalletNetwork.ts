'use client';

import { useState, useCallback } from 'react';
import { useWalletStore } from '@/store/useWalletStore';

export type Network = {
  id: string;
  name: string;
  rpcUrl: string;
  chainId: number;
  symbol: string;
  blockExplorer: string;
  isTestnet: boolean;
};

const DEFAULT_NETWORKS: Network[] = [
  {
    id: 'ethereum-mainnet',
    name: 'Ethereum Mainnet',
    rpcUrl: 'https://mainnet.infura.io/v3/',
    chainId: 1,
    symbol: 'ETH',
    blockExplorer: 'https://etherscan.io',
    isTestnet: false
  },
  {
    id: 'goerli',
    name: 'Goerli Testnet',
    rpcUrl: 'https://goerli.infura.io/v3/',
    chainId: 5,
    symbol: 'ETH',
    blockExplorer: 'https://goerli.etherscan.io',
    isTestnet: true
  },
  {
    id: 'sepolia',
    name: 'Sepolia Testnet',
    rpcUrl: 'https://sepolia.infura.io/v3/',
    chainId: 11155111,
    symbol: 'ETH',
    blockExplorer: 'https://sepolia.etherscan.io',
    isTestnet: true
  }
];

export function useWalletNetwork() {
  const [networks] = useState<Network[]>(DEFAULT_NETWORKS);
  const { selectedNetwork, setSelectedNetwork } = useWalletStore();

  const switchNetwork = useCallback(async (networkId: string) => {
    const network = networks.find(n => n.id === networkId);
    if (!network) throw new Error('Network not found');

    try {
      const chainIdHex = `0x${network.chainId.toString(16)}`;
      
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }],
      });

      setSelectedNetwork(network);
      return network;
    } catch (error: any) {
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${network.chainId.toString(16)}`,
              chainName: network.name,
              nativeCurrency: {
                name: network.symbol,
                symbol: network.symbol,
                decimals: 18
              },
              rpcUrls: [network.rpcUrl],
              blockExplorerUrls: [network.blockExplorer]
            }]
          });
          setSelectedNetwork(network);
          return network;
        } catch (addError) {
          console.error('Failed to add network:', addError);
          throw addError;
        }
      }
      console.error('Failed to switch network:', error);
      throw error;
    }
  }, [networks, setSelectedNetwork]);

  const addCustomNetwork = useCallback(async (network: Network) => {
    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: `0x${network.chainId.toString(16)}`,
          chainName: network.name,
          nativeCurrency: {
            name: network.symbol,
            symbol: network.symbol,
            decimals: 18
          },
          rpcUrls: [network.rpcUrl],
          blockExplorerUrls: [network.blockExplorer]
        }]
      });
      setSelectedNetwork(network);
      return network;
    } catch (error) {
      console.error('Failed to add custom network:', error);
      throw error;
    }
  }, [setSelectedNetwork]);

  return {
    networks,
    selectedNetwork,
    switchNetwork,
    addCustomNetwork
  };
}