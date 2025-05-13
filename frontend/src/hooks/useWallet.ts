import { useCallback, useEffect, useState } from 'react';
import { useWalletStore } from '@/store/useWalletStore';
import { walletAPI, transactionAPI } from '@/services/api';
import { ethers } from 'ethers';

export function useWallet() {
  const { 
    address,
    balance,
    transactions,
    isConnected,
    setAddress,
    setBalance,
    setTransactions,
    setConnected,
    disconnect
  } = useWalletStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch wallet balances when address changes
  useEffect(() => {
    if (address && isConnected) {
      fetchBalances();
      fetchTransactions();
    }
  }, [address, isConnected]);

  const fetchBalances = async () => {
    if (!address) return;
    
    try {
      const balanceData = await walletAPI.getBalances(address);
      if (balanceData && balanceData.balances) {
        // Assuming the first balance is ETH
        const ethBalance = balanceData.balances.find(
          (b: any) => b.symbol === 'ETH'
        ) || { balance: '0' };
        
        // Convert from wei to ETH
        const formattedBalance = ethers.formatEther(ethBalance.balance || '0');
        setBalance(formattedBalance);
      }
    } catch (err) {
      console.error('Failed to fetch balances:', err);
    }
  };

  const fetchTransactions = async () => {
    if (!address) return;
    
    try {
      const txData = await transactionAPI.getTransactions(address);
      if (txData && txData.transactions) {
        const formattedTxs = txData.transactions.map((tx: any) => ({
          id: tx.hash || tx.id,
          from: tx.from,
          to: tx.to,
          amount: ethers.formatEther(tx.value || '0'),
          timestamp: tx.timestamp || Date.now(),
          status: tx.status || 'completed'
        }));
        
        setTransactions(formattedTxs);
      }
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    }
  };

  const connectWallet = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // For now, we'll use browser wallet (MetaMask, etc.)
      if (!window.ethereum) {
        throw new Error('No Ethereum wallet found. Please install MetaMask.');
      }
      
      // Request account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }
      
      const connectedAddress = accounts[0];
      
      // Get ETH balance
      const provider = new ethers.BrowserProvider(window.ethereum);
      const balanceWei = await provider.getBalance(connectedAddress);
      const balanceEth = ethers.formatEther(balanceWei);
      
      setAddress(connectedAddress);
      setBalance(balanceEth);
      setConnected(true);
      
      // Fetch transactions
      fetchTransactions();
      
      return true;
    } catch (err: any) {
      console.error('Failed to connect wallet:', err);
      setError(err.message || 'Failed to connect wallet');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [setAddress, setBalance, setConnected]);

  const disconnectWallet = useCallback(() => {
    try {
      disconnect();
      return true;
    } catch (err) {
      console.error('Failed to disconnect wallet:', err);
      return false;
    }
  }, [disconnect]);

  const sendTransaction = useCallback(async (
    to: string,
    amount: string,
    data?: string
  ) => {
    if (!address || !isConnected) {
      throw new Error('Wallet not connected');
    }
    
    try {
      // Create a pending transaction in the UI
      const pendingTx = {
        id: Date.now().toString(),
        from: address,
        to,
        amount,
        timestamp: Date.now(),
        status: 'pending' as const
      };
      
      setTransactions([pendingTx, ...transactions]);
      
      // Convert ETH to wei
      const valueWei = ethers.parseEther(amount).toString();
      
      // Send transaction through the API
      const response = await transactionAPI.sendTransaction(address, {
        to,
        value: valueWei,
        data
      });
      
      // Update the transaction with the real tx hash
      if (response && response.txHash) {
        const updatedTxs = transactions.map(tx => 
          tx.id === pendingTx.id 
            ? { ...tx, id: response.txHash, status: 'completed' as const } 
            : tx
        );
        setTransactions(updatedTxs);
        
        return response.txHash;
      }
      
      return pendingTx.id;
    } catch (err: any) {
      console.error('Failed to send transaction:', err);
      
      // Update the transaction status to failed
      const updatedTxs = transactions.map(tx => 
        tx.id === Date.now().toString() 
          ? { ...tx, status: 'failed' as const } 
          : tx
      );
      setTransactions(updatedTxs);
      
      throw new Error(err.message || 'Failed to send transaction');
    }
  }, [address, isConnected, transactions, setTransactions]);

  return {
    address,
    balance,
    transactions,
    isConnected,
    isLoading,
    error,
    connectWallet,
    disconnectWallet,
    sendTransaction,
    fetchBalances,
    fetchTransactions
  };
}