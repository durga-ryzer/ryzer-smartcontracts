'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to user panel by default
    // In a real application, this would check authentication status
    router.push('/user');
  }, [router]);

  return null;
}