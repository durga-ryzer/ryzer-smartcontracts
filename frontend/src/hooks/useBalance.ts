'use client';

import { useState, useCallback, useEffect } from 'react';
import { useWalletStore } from '@/store/useWalletStore';
import { useWalletNetwork } from './useWalletNetwork';

export function useBalance() {
  const { address, setBalance } = useWalletStore();
  const { selectedNetwork } = useWalletNetwork();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!address || !window.ethereum) return;

    setIsLoading(true);
    setError(null);

    try {
      const balance = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest'],
      });

      const balanceInEth = (parseInt(balance, 16) / 1e18).toFixed(4);
      setBalance(balanceInEth);
      return balanceInEth;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch balance';
      setError(errorMessage);
      console.error('Error fetching balance:', err);
    } finally {
      setIsLoading(false);
    }
  }, [address, setBalance]);

  // Automatically fetch balance when address or network changes
  useEffect(() => {
    if (address && selectedNetwork) {
      fetchBalance();
    }
  }, [address, selectedNetwork, fetchBalance]);

  return {
    fetchBalance,
    isLoading,
    error,
  };
}