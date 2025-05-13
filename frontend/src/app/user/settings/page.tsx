'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/hooks/useWallet';
import { NetworkSelector } from '@/components/wallet/NetworkSelector';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function SettingsPage() {
  const { isConnected } = useWallet();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Network Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <NetworkSelector />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span>Theme</span>
                <ThemeToggle />
              </div>
            </CardContent>
          </Card>

          {isConnected && (
            <Card>
              <CardHeader>
                <CardTitle>Security</CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="destructive" className="w-full">
                  Clear Wallet Data
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}