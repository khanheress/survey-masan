'use client';

import Icon from '@/components/Icon';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);

  const links = [
    { href: '/admin', label: 'Tổng quan', icon: <Icon name="chart" /> },
    { href: '/admin/projects', label: 'Dự án', icon: <Icon name="folder" /> },
    { href: '/admin/responses', label: 'Phản hồi', icon: <Icon name="file" /> },
    { href: '/admin/recall', label: 'Form Recall', icon: <Icon name="calendar" /> },
    { href: '/admin/data', label: 'Quản lý data', icon: <Icon name="database" /> },
  ];

  if (session?.user?.role === 'admin') {
    links.push({ href: '/admin/users', label: 'Người dùng', icon: <Icon name="users" /> });
  }

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <>
      <button 
        className="btn-icon btn-secondary sidebar-toggle" 
        aria-label={isOpen ? "Đóng menu" : "Mở menu"} aria-expanded={isOpen} aria-controls="main-sidebar" onClick={toggleSidebar}
      >
        <Icon name="menu" />
      </button>
      
      {isOpen && <button className="sidebar-overlay" aria-label="Đóng menu" onClick={() => setIsOpen(false)} />}
      <div
        id="main-sidebar"
        className={`glass-card app-sidebar ${isOpen ? 'is-open' : ''}`}
        style={{
          width: '250px',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid var(--border-color)',
          borderTop: 'none',
          borderBottom: 'none',
          borderLeft: 'none',
          borderRadius: 0,
          background: 'var(--bg-secondary)',
          padding: '1.5rem',
          zIndex: 90,
        }}
      >
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: 800,
            background: 'var(--accent-gradient)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            SurveyPro
          </h1>
        </div>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {links.map((link) => {
            const isActive = pathname === link.href ||
              (link.href !== '/admin' && pathname.startsWith(`${link.href}/`));
            return (
              <Link 
                key={link.href} 
                href={link.href}
                onClick={() => setIsOpen(false)}
                aria-current={isActive ? 'page' : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  textDecoration: 'none',
                  color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  background: isActive ? 'var(--accent-soft)' : 'transparent',
                  borderLeft: isActive ? '4px solid var(--accent-primary)' : '4px solid transparent',
                  fontWeight: isActive ? 600 : 500,
                  transition: 'var(--transition)'
                }}
              >
                <span>{link.icon}</span>
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{session?.user?.username || 'User'}</div>
            <span className={`badge ${session?.user?.role === 'admin' ? 'badge-admin' : 'badge-completed'}`}>
              {session?.user?.role === 'admin' ? 'Admin' : 'User'}
            </span>
          </div>
          <button 
            className="btn btn-ghost" 
            style={{ width: '100%', justifyContent: 'flex-start', padding: '8px' }}
            onClick={() => signOut()}
          >
            <Icon name="logout" /> Đăng xuất
          </button>
        </div>
      </div>
    </>
  );
}
