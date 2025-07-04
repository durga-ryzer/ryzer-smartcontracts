'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Wallet,
  Send,
  BarChart2,
  Settings,
  History,
  Layers,
  Shield,
  LogOut
} from 'lucide-react';

const navigation = [
  { name: 'My Wallet', href: '/user', icon: Wallet },
  { name: 'Send/Receive', href: '/user/transfer', icon: Send },
  { name: 'Transactions', href: '/user/transactions', icon: History },
  { name: 'Assets', href: '/user/assets', icon: Layers },
  { name: 'Analytics', href: '/user/analytics', icon: BarChart2 },
  { name: 'Security', href: '/user/security', icon: Shield },
  { name: 'Settings', href: '/user/settings', icon: Settings },
];

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        {/* Sidebar */}
        <motion.aside
          initial={{ width: 240 }}
          animate={{ width: isCollapsed ? 80 : 240 }}
          transition={{ duration: 0.3 }}
          className="bg-card border-r border-border"
        >
          <div className="p-6">
            <h1 className={`font-bold text-xl ${isCollapsed ? 'hidden' : 'block'}`}>
              My Wallet
            </h1>
          </div>

          <nav className="space-y-2 px-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}
                >
                  <item.icon className="h-5 w-5" />
                  {!isCollapsed && <span>{item.name}</span>}
                </Link>
              );
            })}
          </nav>

          <div className="absolute bottom-4 left-0 right-0 px-4">
            <button
              className="flex items-center space-x-3 px-3 py-2 w-full rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <LogOut className="h-5 w-5" />
              {!isCollapsed && <span>Logout</span>}
            </button>
          </div>
        </motion.aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}