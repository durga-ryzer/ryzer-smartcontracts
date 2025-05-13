'use client';

import { useWallet } from '@/hooks/useWallet';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { useState } from 'react';

export function WalletCard() {
  const { address, balance, isConnected, connectWallet, disconnectWallet } = useWallet();
  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      await connectWallet();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-[380px]">
      <CardHeader>
        <CardTitle>Ryzer Wallet</CardTitle>
        <CardDescription>
          {isConnected ? 'Your wallet is connected' : 'Connect your wallet to get started'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isConnected ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Address</p>
              <p className="text-xs text-muted-foreground break-all">{address}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Balance</p>
              <p className="text-2xl font-bold">{balance} ETH</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-muted-foreground">No wallet connected</p>
          </div>
        )}
      </CardContent>
      <CardFooter>
        {isConnected ? (
          <Button
            variant="destructive"
            className="w-full"
            onClick={disconnectWallet}
          >
            Disconnect
          </Button>
        ) : (
          <Button
            className="w-full"
            onClick={handleConnect}
            disabled={isLoading}
          >
            {isLoading ? 'Connecting...' : 'Connect Wallet'}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}