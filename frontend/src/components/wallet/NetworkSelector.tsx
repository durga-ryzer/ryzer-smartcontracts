'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useWalletNetwork } from '@/hooks/useWalletNetwork';

export function NetworkSelector() {
  const { networks, selectedNetwork, switchNetwork } = useWalletNetwork();
  const [isLoading, setIsLoading] = useState(false);

  const handleNetworkSwitch = async (networkId: string) => {
    setIsLoading(true);
    try {
      await switchNetwork(networkId);
    } catch (error) {
      console.error('Failed to switch network:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {networks.map((network) => (
          <Button
            key={network.id}
            variant={selectedNetwork?.id === network.id ? 'default' : 'outline'}
            onClick={() => handleNetworkSwitch(network.id)}
            disabled={isLoading || selectedNetwork?.id === network.id}
            className="w-full"
          >
            {network.name}
            {network.isTestnet && (
              <span className="ml-2 text-xs bg-yellow-200 text-yellow-800 px-1 rounded">
                Test
              </span>
            )}
          </Button>
        ))}
      </div>
    </div>
  );
}