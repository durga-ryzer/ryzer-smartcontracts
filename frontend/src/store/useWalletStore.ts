import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WalletState {
  address: string | null;
  balance: string;
  transactions: Transaction[];
  isConnected: boolean;
  setAddress: (address: string | null) => void;
  setBalance: (balance: string) => void;
  setTransactions: (transactions: Transaction[]) => void;
  setConnected: (isConnected: boolean) => void;
  disconnect: () => void;
}

interface Transaction {
  id: string;
  from: string;
  to: string;
  amount: string;
  timestamp: number;
  status: 'pending' | 'completed' | 'failed';
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      address: null,
      balance: '0',
      transactions: [],
      isConnected: false,
      setAddress: (address) => set({ address }),
      setBalance: (balance) => set({ balance }),
      setTransactions: (transactions) => set({ transactions }),
      setConnected: (isConnected) => set({ isConnected }),
      disconnect: () => set({
        address: null,
        balance: '0',
        transactions: [],
        isConnected: false,
      }),
    }),
    {
      name: 'wallet-storage',
    }
  )
);