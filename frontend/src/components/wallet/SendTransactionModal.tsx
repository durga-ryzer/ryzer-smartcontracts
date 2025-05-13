'use client';

import { useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';

interface SendTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SendTransactionModal({ isOpen, onClose }: SendTransactionModalProps) {
  const { sendTransaction } = useWallet();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const txId = await sendTransaction(recipient, amount);
      if (txId) {
        onClose();
        setRecipient('');
        setAmount('');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <Card className="w-[400px]">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Send Transaction</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Recipient Address</label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="w-full p-2 border rounded-md"
                placeholder="0x..."
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount (ETH)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full p-2 border rounded-md"
                placeholder="0.0"
                step="0.000000000000000001"
                min="0"
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Send'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}