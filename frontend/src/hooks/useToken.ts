'use client';

import { useState, useCallback, useEffect } from 'react';
import { useWalletStore } from '@/store/useWalletStore';
import { useWalletNetwork } from './useWalletNetwork';

export interface Token {
  address: string;
  symbol: string;
  decimals: number;
  balance: string;
  name: string;
}

interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
}

const STORAGE_KEY = 'ryzer_wallet_tokens';

export function useToken() {
  const { address } = useWalletStore();
  const { selectedNetwork } = useWalletNetwork();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load tokens from local storage on init
  useEffect(() => {
    const savedTokens = localStorage.getItem(`${STORAGE_KEY}_${selectedNetwork?.id}`);
    if (savedTokens) {
      try {
        setTokens(JSON.parse(savedTokens));
      } catch (err) {
        console.error('Failed to parse saved tokens:', err);
      }
    }
  }, [selectedNetwork?.id]);

  // Save tokens to local storage when updated
  useEffect(() => {
    if (selectedNetwork?.id && tokens.length > 0) {
      localStorage.setItem(`${STORAGE_KEY}_${selectedNetwork.id}`, JSON.stringify(tokens));
    }
  }, [tokens, selectedNetwork?.id]);

  const getTokenMetadata = useCallback(async (tokenAddress: string): Promise<TokenMetadata> => {
    if (!window.ethereum) throw new Error('Ethereum provider not found');

    try {
      // Function signatures
      const nameData = '0x06fdde03'; // name()
      const symbolData = '0x95d89b41'; // symbol()
      const decimalsData = '0x313ce567'; // decimals()

      const [nameHex, symbolHex, decimalsHex] = await Promise.all([
        window.ethereum.request({
          method: 'eth_call',
          params: [{ to: tokenAddress, data: nameData }, 'latest'],
        }),
        window.ethereum.request({
          method: 'eth_call',
          params: [{ to: tokenAddress, data: symbolData }, 'latest'],
        }),
        window.ethereum.request({
          method: 'eth_call',
          params: [{ to: tokenAddress, data: decimalsData }, 'latest'],
        }),
      ]);

      // Decode the results
      const decoder = new TextDecoder();
      const name = decoder.decode(new Uint8Array(Buffer.from(nameHex.slice(130).replace(/00/g, ''), 'hex')));
      const symbol = decoder.decode(new Uint8Array(Buffer.from(symbolHex.slice(130).replace(/00/g, ''), 'hex')));
      const decimals = parseInt(decimalsHex, 16);

      return { name, symbol, decimals };
    } catch (error) {
      console.error('Failed to fetch token metadata:', error);
      throw new Error('Failed to fetch token metadata');
    }
  }, []);

  const getTokenBalance = useCallback(async (tokenAddress: string): Promise<string> => {
    if (!address || !window.ethereum) throw new Error('Wallet not connected');

    try {
      // ERC20 balanceOf function signature
      const data = `0x70a08231000000000000000000000000${address.slice(2)}`;

      const balanceHex = await window.ethereum.request({
        method: 'eth_call',
        params: [{
          to: tokenAddress,
          data,
        }, 'latest'],
      });

      const balance = BigInt(balanceHex).toString();
      return balance;
    } catch (error) {
      console.error('Failed to fetch token balance:', error);
      throw new Error('Failed to fetch token balance');
    }
  }, [address]);

  const addToken = useCallback(async (tokenAddress: string) => {
    if (!window.ethereum) throw new Error('Ethereum provider not found');
    setError(null);

    try {
      const metadata = await getTokenMetadata(tokenAddress);
      const balance = await getTokenBalance(tokenAddress);

      // Add to MetaMask
      await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: tokenAddress,
            symbol: metadata.symbol,
            decimals: metadata.decimals,
            image: '',
          },
        },
      });

      // Add to local state
      const newToken: Token = {
        address: tokenAddress,
        name: metadata.name,
        symbol: metadata.symbol,
        decimals: metadata.decimals,
        balance,
      };

      setTokens(prev => [...prev, newToken]);
      return newToken;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add token';
      setError(errorMessage);
      throw error;
    }
  }, [getTokenMetadata, getTokenBalance]);

  const fetchTokens = useCallback(async () => {
    if (!address || !selectedNetwork) return;
    setError(null);
    setIsLoading(true);

    try {
      // Update balances for existing tokens
      const updatedTokens = await Promise.all(
        tokens.map(async (token) => ({
          ...token,
          balance: await getTokenBalance(token.address),
        }))
      );

      setTokens(updatedTokens);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch tokens';
      setError(errorMessage);
      console.error('Failed to fetch tokens:', error);
    } finally {
      setIsLoading(false);
    }
  }, [address, selectedNetwork, tokens, getTokenBalance]);

  // Auto-refresh token balances when address or network changes
  useEffect(() => {
    if (address && selectedNetwork) {
      fetchTokens();
    }
  }, [address, selectedNetwork, fetchTokens]);

  return {
    tokens,
    isLoading,
    error,
    addToken,
    getTokenBalance,
    fetchTokens,
  };
}