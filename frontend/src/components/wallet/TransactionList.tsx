'use client';

import { useWallet } from '@/hooks/useWallet';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export function TransactionList() {
  const { transactions } = useWallet();

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <Card className="w-full mt-6">
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">
            No transactions yet
          </p>
        ) : (
          <div className="space-y-4">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    To: {formatAddress(tx.to)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(tx.timestamp)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{tx.amount} ETH</p>
                  <p
                    className={`text-xs ${tx.status === 'completed' ? 'text-green-500' : tx.status === 'failed' ? 'text-red-500' : 'text-yellow-500'}`}
                  >
                    {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}