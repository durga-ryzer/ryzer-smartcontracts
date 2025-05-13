import { useState, useCallback } from 'react';
import { useWallet } from './useWallet';

export type Transaction = {
  id: string;
  type: 'send' | 'receive';
  amount: string;
  token: string;
  status: 'pending' | 'completed' | 'failed';
  timestamp: number;
  from: string;
  to: string;
  hash: string;
};

export type TransactionFilter = {
  type?: 'send' | 'receive' | 'all';
  status?: 'pending' | 'completed' | 'failed' | 'all';
  dateRange?: 'today' | 'week' | 'month' | 'all';
};

export function useTransactions() {
  const { address } = useWallet();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTransactions = useCallback(async (filter?: TransactionFilter) => {
    if (!address) return;
    
    setIsLoading(true);
    try {
      // TODO: Implement actual blockchain transaction fetching
      // This is a mock implementation
      const mockTransactions: Transaction[] = [
        {
          id: '1',
          type: 'send',
          amount: '0.1',
          token: 'ETH',
          status: 'completed',
          timestamp: Date.now(),
          from: address,
          to: '0x1234...5678',
          hash: '0xabcd...efgh'
        }
      ];
      
      setTransactions(mockTransactions);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  const sendTransaction = useCallback(async (to: string, amount: string, token: string) => {
    if (!address) return;
    
    try {
      // TODO: Implement actual transaction sending
      const mockTransaction: Transaction = {
        id: Date.now().toString(),
        type: 'send',
        amount,
        token,
        status: 'pending',
        timestamp: Date.now(),
        from: address,
        to,
        hash: '0x' + Math.random().toString(16).slice(2)
      };
      
      setTransactions(prev => [mockTransaction, ...prev]);
      return mockTransaction;
    } catch (error) {
      console.error('Failed to send transaction:', error);
      throw error;
    }
  }, [address]);

  return {
    transactions,
    isLoading,
    fetchTransactions,
    sendTransaction
  };
}