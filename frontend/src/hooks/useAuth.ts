'use client';

import { useCallback } from 'react';
import { useWalletStore } from '@/store/useWalletStore';

export function useAuth() {
  const { setAddress, setConnected, disconnect } = useWalletStore();

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      throw new Error('MetaMask is not installed');
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts[0]) {
        setAddress(accounts[0]);
        setConnected(true);
        return accounts[0];
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  }, [setAddress, setConnected]);

  const disconnectWallet = useCallback(() => {
    disconnect();
  }, [disconnect]);

  return {
    connectWallet,
    disconnectWallet,
  };
}