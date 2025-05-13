'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';

const NAVIGATION_ITEMS = [
  { href: '/user/dashboard', label: 'Dashboard' },
  { href: '/user/transactions', label: 'Transactions' },
  { href: '/user/settings', label: 'Settings' },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="flex space-x-2">
      {NAVIGATION_ITEMS.map((item) => (
        <Link key={item.href} href={item.href}>
          <Button
            variant={pathname === item.href ? 'default' : 'ghost'}
            className="w-full"
          >
            {item.label}
          </Button>
        </Link>
      ))}
    </nav>
  );
}