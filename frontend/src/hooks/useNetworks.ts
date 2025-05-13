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
  }
];

export function useNetworks() {
  const [networks] = useState<Network[]>(DEFAULT_NETWORKS);
  const { selectedNetwork, setSelectedNetwork } = useWalletStore();

  const switchNetwork = useCallback(async (networkId: string) => {
    const network = networks.find(n => n.id === networkId);
    if (!network) throw new Error('Network not found');

    try {
      // TODO: Implement actual network switching logic
      // This would typically involve requesting the wallet to switch chains
      setSelectedNetwork(network);
      return network;
    } catch (error) {
      console.error('Failed to switch network:', error);
      throw error;
    }
  }, [networks, setSelectedNetwork]);

  const addCustomNetwork = useCallback(async (network: Network) => {
    // TODO: Implement custom network addition logic
    console.log('Adding custom network:', network);
  }, []);

  return {
    networks,
    selectedNetwork,
    switchNetwork,
    addCustomNetwork
  };
}