'use client';

import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { 
  Wallet,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Activity
} from 'lucide-react';

const stats = [
  {
    name: 'Total Wallets',
    value: '1,234',
    change: '+12.3%',
    trend: 'up',
    icon: Wallet
  },
  {
    name: 'Active Users',
    value: '856',
    change: '+5.7%',
    trend: 'up',
    icon: Users
  },
  {
    name: 'Daily Transactions',
    value: '2,567',
    change: '-2.3%',
    trend: 'down',
    icon: Activity
  }
];

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <stat.icon className="h-8 w-8 text-muted-foreground" />
                <span
                  className={`flex items-center text-sm ${stat.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}
                >
                  {stat.change}
                  {stat.trend === 'up' ? (
                    <ArrowUpRight className="h-4 w-4 ml-1" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 ml-1" />
                  )}
                </span>
              </div>
              <div className="mt-4">
                <h2 className="text-2xl font-bold">{stat.value}</h2>
                <p className="text-sm text-muted-foreground">{stat.name}</p>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {/* Activity items would be mapped here */}
            <p className="text-muted-foreground">Loading activity...</p>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">System Health</h2>
          <div className="space-y-4">
            {/* System health metrics would be displayed here */}
            <p className="text-muted-foreground">Loading metrics...</p>
          </div>
        </Card>
      </div>
    </div>
  );
}