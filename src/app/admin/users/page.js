'use client';

import Icon from '@/components/Icon';
import useRemoteData from '@/hooks/useRemoteData';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/Modal';
import { useToast } from '@/components/Toast';

export default function UsersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { addToast } = useToast();
  
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user'
  });

  useEffect(() => {
    if (session?.user?.role && session.user.role !== 'admin') {
      router.push('/admin');
    }
  }, [session, router]);

  const loadUsers = useCallback(async (signal) => {
    const res = await fetch('/api/users', { signal });
    if (!res.ok) throw new Error('Failed to load users');
    return res.json();
  }, []);
  const { data: users, loading, refresh: fetchUsers } = useRemoteData(
    loadUsers, [], 'Lỗi khi tải danh sách người dùng', session?.user?.role === 'admin'
  );

  const openCreateModal = () => {
    setCurrentUser(null);
    setFormData({ username: '', email: '', password: '', role: 'user' });
    setIsModalOpen(true);
  };

  const openEditModal = (user) => {
    setCurrentUser(user);
    setFormData({ username: user.username, email: user.email || '', password: '', role: user.role });
    setIsModalOpen(true);
  };

  const openDeleteModal = (user) => {
    setCurrentUser(user);
    setIsDeleteModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    
    const url = currentUser ? `/api/users/${currentUser.id}` : '/api/users';
    const method = currentUser ? 'PUT' : 'POST';
    
    const body = { ...formData };
    if (currentUser && !body.password) {
      delete body.password; // Don't send empty password on update
    }

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      if (res.ok) {
        addToast(currentUser ? 'Cập nhật thành công' : 'Tạo người dùng thành công', 'success');
        setIsModalOpen(false);
        fetchUsers();
      } else {
        const err = await res.json();
        addToast(err.error || 'Đã xảy ra lỗi', 'error');
      }
    } catch (error) {
      addToast('Lỗi kết nối', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    setFormLoading(true);
    try {
      const res = await fetch(`/api/users/${currentUser.id}`, { method: 'DELETE' });
      if (res.ok) {
        addToast('Xóa người dùng thành công', 'success');
        setIsDeleteModalOpen(false);
        fetchUsers();
      } else {
        const err = await res.json();
        addToast(err.error || 'Đã xảy ra lỗi', 'error');
      }
    } catch (error) {
      addToast('Lỗi kết nối', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  if (session?.user?.role !== 'admin') return null;

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <h1 className="page-title">Quản lý Người dùng</h1>
        <button className="btn btn-primary" onClick={openCreateModal}>
          + Tạo Người dùng
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="skeleton" style={{ height: '300px' }}></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Vai trò</th>
                  <th>Ngày tạo</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td style={{ color: 'var(--text-secondary)' }}>{user.id}</td>
                    <td style={{ fontWeight: 500 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1.25rem' }}><Icon name="user" /></span> {user.username}
                      </div>
                    </td>
                    <td>{user.email || '-'}</td>
                    <td>
                      <span className={`badge ${user.role === 'admin' ? 'badge-admin' : 'badge-completed'}`}>
                        {user.role.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {new Date(user.created_at).toLocaleDateString('vi-VN')}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button className="btn-icon btn-ghost" aria-label="Chỉnh sửa người dùng" onClick={() => openEditModal(user)}><Icon name="edit" /></button>
                        {user.id !== session?.user?.id && (
                          <button className="btn-icon btn-ghost" style={{ color: 'var(--danger)' }} aria-label="Xóa người dùng" onClick={() => openDeleteModal(user)}><Icon name="trash" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={currentUser ? "Chỉnh sửa Người dùng" : "Tạo Người dùng Mới"}>
        <form id="userForm" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Tên đăng nhập *</label>
            <input type="text" className="form-input" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} required disabled={!!currentUser} />
            {currentUser && <small style={{ color: 'var(--text-muted)' }}>Không thể thay đổi tên đăng nhập</small>}
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" className="form-input" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label">{currentUser ? 'Mật khẩu mới (Để trống nếu không đổi)' : 'Mật khẩu *'}</label>
            <input type="password" className="form-input" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required={!currentUser} />
          </div>
          <div className="form-group">
            <label className="form-label">Vai trò</label>
            <select className="form-select" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </form>
        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Hủy</button>
          <button type="submit" form="userForm" className="btn btn-primary" disabled={formLoading}>
            {formLoading ? 'Đang lưu...' : 'Lưu Người dùng'}
          </button>
        </div>
      </Modal>

      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Xác nhận Xóa" size="sm">
        <div style={{ padding: '1rem 0' }}>
          Bạn có chắc chắn muốn xóa người dùng <strong>{currentUser?.username}</strong>?
          Thao tác này không thể hoàn tác.
        </div>
        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button type="button" className="btn btn-ghost" onClick={() => setIsDeleteModalOpen(false)}>Hủy</button>
          <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={formLoading}>
            {formLoading ? 'Đang xóa...' : 'Xóa Người dùng'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
