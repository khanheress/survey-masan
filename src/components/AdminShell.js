'use client';

import React, { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import ToastProvider from '@/components/Toast';

export default function AdminShell({ children }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const authorized = status === 'authenticated' && session?.user?.role === 'admin';
  useEffect(() => {
    if (status !== 'loading' && !authorized) router.replace('/login');
  }, [status, authorized, router]);

  if (!authorized) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <div className="spinner" style={{ width: '48px', height: '48px', borderWidth: '4px' }}></div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <Sidebar />
        <main className="admin-main">
          {children}
        </main>
      </div>
    </ToastProvider>
  );
}
