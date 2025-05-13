'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TransactionList } from '@/components/wallet/TransactionList';
import { TransactionFilter } from '@/components/wallet/TransactionFilter';
import { useWallet } from '@/hooks/useWallet';

export default function TransactionsPage() {
  const { isConnected } = useWallet();
  const [filterType, setFilterType] = useState('all');

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Connect Your Wallet</h1>
          <p className="text-muted-foreground">Please connect your wallet to view transactions.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Transaction History</h1>
          <TransactionFilter
            currentFilter={filterType}
            onFilterChange={setFilterType}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <TransactionList filter={filterType} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}