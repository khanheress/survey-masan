'use client';

import Icon from '@/components/Icon';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/stats');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error('Failed to fetch stats', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    { title: 'Tổng Dự án', value: stats?.totalProjects || 0, icon: <Icon name="folder" />, color: 'var(--accent-primary)' },
    { title: 'Tổng Khảo sát', value: stats?.totalSurveys || 0, icon: <Icon name="chart" />, color: 'var(--accent-secondary)' },
    { title: 'Tổng Phản hồi', value: stats?.totalResponses || 0, icon: <Icon name="file" />, color: 'var(--success)' },
    { title: 'Dự án Đang hoạt động', value: stats?.activeProjects || 0, icon: <Icon name="arrow-right" />, color: 'var(--warning)' },
  ];

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div>
          <h1 className="page-title">Xin chào, {session?.user?.username}!</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Chào mừng bạn quay lại hệ thống quản lý khảo sát.
          </p>
        </div>
      </div>

      <div className="grid-cols-4" style={{ marginBottom: '2rem' }}>
        {loading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="glass-card skeleton" style={{ height: '140px' }}></div>
          ))
        ) : (
          statCards.map((stat, i) => (
            <div key={i} className="stat-card" style={{ borderLeftColor: stat.color }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{
                  width: '36px', height: '36px',
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${stat.color} 0%, transparent 100%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.5rem', opacity: 0.8
                }}>
                  {stat.icon}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{stat.title}</div>
              </div>
              <div style={{ fontSize: '2.5rem', fontWeight: 800 }}>{stat.value}</div>
            </div>
          ))
        )}
      </div>

      <div className="grid-cols-2">
        <div className="card">
          <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Dự án Gần đây</h2>
            <Link href="/admin/projects" className="btn-ghost" style={{ fontSize: '0.875rem' }}>Xem tất cả</Link>
          </div>
          {loading ? (
             <div className="skeleton" style={{ height: '200px' }}></div>
          ) : stats?.recentProjects?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {stats.recentProjects.map(project => (
                <div key={project.id} style={{
                  padding: '1rem', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{project.name}</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      {project.surveyCount} khảo sát • {project.responseCount} phản hồi
                    </div>
                  </div>
                  <span className={`badge ${project.status === 'active' ? 'badge-active' : 'badge-inactive'}`}>
                    {project.status === 'active' ? 'Hoạt động' : 'Đóng'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '2rem' }}>
              Chưa có dự án nào
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Phản hồi Mới nhất</h2>
            <Link href="/admin/responses" className="btn-ghost" style={{ fontSize: '0.875rem' }}>Xem tất cả</Link>
          </div>
          {loading ? (
             <div className="skeleton" style={{ height: '200px' }}></div>
          ) : stats?.recentResponses?.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tên</th>
                    <th>Dự án</th>
                    <th>Thời gian</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentResponses.map(response => (
                    <tr key={response.id}>
                      <td>{response.respondent_name || 'Ẩn danh'}</td>
                      <td>{response.projectName}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        {new Date(response.created_at).toLocaleDateString('vi-VN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '2rem' }}>
              Chưa có phản hồi nào
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
