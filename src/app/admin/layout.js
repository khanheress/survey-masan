'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import ToastProvider from '@/components/Toast';

export default function AdminLayout({ children }) {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      // Redirect to login if not authenticated
    },
  });
  const router = useRouter();

  if (status === 'loading') {
    return (
      <div className="flex-center" style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <div className="spinner" style={{ width: '48px', height: '48px', borderWidth: '4px' }}></div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/login');
    return null;
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
