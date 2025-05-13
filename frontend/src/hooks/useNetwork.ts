'use client';

import { useCallback } from 'react';
import { useWalletStore } from '@/store/useWalletStore';

export function useNetwork() {
  const { currentNetwork, setCurrentNetwork } = useWalletStore();

  const switchNetwork = useCallback(async (chainId: string) => {
    try {
      // Request network switch from the provider
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId }],
      });

      setCurrentNetwork(chainId);
      return true;
    } catch (error: any) {
      if (error.code === 4902) {
        // Network not added to MetaMask
        throw new Error('Please add this network to your wallet first');
      }
      throw error;
    }
  }, [setCurrentNetwork]);

  return {
    currentNetwork,
    switchNetwork,
  };
}