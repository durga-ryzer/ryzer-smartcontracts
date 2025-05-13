'use client';

import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Send,
  Download,
  Repeat,
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign
} from 'lucide-react';

const quickActions = [
  { name: 'Send', icon: Send, color: 'text-blue-500' },
  { name: 'Receive', icon: Download, color: 'text-green-500' },
  { name: 'Swap', icon: Repeat, color: 'text-purple-500' }
];

const recentTransactions = [
  {
    id: 1,
    type: 'send',
    amount: '-0.5 ETH',
    to: '0x1234...5678',
    timestamp: '2 hours ago',
    status: 'completed'
  },
  {
    id: 2,
    type: 'receive',
    amount: '+1.2 ETH',
    from: '0x8765...4321',
    timestamp: '5 hours ago',
    status: 'completed'
  },
  {
    id: 3,
    type: 'swap',
    amount: '2 ETH → 3000 USDT',
    timestamp: '1 day ago',
    status: 'completed'
  }
];

export default function UserDashboard() {
  return (
    <div className="space-y-8">
      {/* Wallet Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Balance</p>
              <h1 className="text-4xl font-bold mt-2">12.345 ETH</h1>
              <p className="text-lg text-muted-foreground mt-1">≈ $23,456.78</p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-green-500 flex items-center">
                <TrendingUp className="h-5 w-5 mr-1" />
                +5.67%
              </span>
              <span className="text-sm text-muted-foreground">24h</span>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-4">
        {quickActions.map((action, index) => (
          <motion.div
            key={action.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Button
              variant="outline"
              className="w-full h-24 flex flex-col items-center justify-center space-y-2"
            >
              <action.icon className={`h-6 w-6 ${action.color}`} />
              <span>{action.name}</span>
            </Button>
          </motion.div>
        ))}
      </div>

      {/* Recent Transactions */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Transactions</h2>
        <div className="space-y-4">
          {recentTransactions.map((tx) => (
            <motion.div
              key={tx.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center justify-between p-4 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center space-x-4">
                {tx.type === 'send' && <Send className="h-5 w-5 text-blue-500" />}
                {tx.type === 'receive' && <Download className="h-5 w-5 text-green-500" />}
                {tx.type === 'swap' && <Repeat className="h-5 w-5 text-purple-500" />}
                <div>
                  <p className="font-medium">{tx.amount}</p>
                  <p className="text-sm text-muted-foreground">
                    {tx.to ? `To: ${tx.to}` : tx.from ? `From: ${tx.from}` : 'Swap'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">{tx.timestamp}</p>
                <p className="text-sm text-green-500">{tx.status}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </Card>
    </div>
  );
}