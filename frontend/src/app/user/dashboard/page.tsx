'use client';

import { useState } from 'react';
import { WalletCard } from '@/components/wallet/WalletCard';
import { TransactionList } from '@/components/wallet/TransactionList';
import { SendTransactionModal } from '@/components/wallet/SendTransactionModal';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/hooks/useWallet';

export default function DashboardPage() {
  const { isConnected } = useWallet();
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col items-center space-y-6">
          <WalletCard />
          
          {isConnected && (
            <>
              <Button
                className="w-[380px]"
                onClick={() => setIsSendModalOpen(true)}
              >
                Send Transaction
              </Button>
              <TransactionList />
            </>
          )}

          <SendTransactionModal
            isOpen={isSendModalOpen}
            onClose={() => setIsSendModalOpen(false)}
          />
        </div>
      </div>
    </div>
  );
}