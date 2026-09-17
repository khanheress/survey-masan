'use client';

import CopyProject from '@/components/CopyProject';
import Icon from '@/components/Icon';
import ProjectRulesEditor from '@/components/ProjectRulesEditor';
import {emptyProjectRules,parseProjectRules} from '@/lib/projectRules.mjs';
import useRemoteData from '@/hooks/useRemoteData';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Modal from '@/components/Modal';
import { useToast } from '@/components/Toast';

export default function ProjectsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { addToast } = useToast();
  
  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // Form state
  const [currentProject, setCurrentProject] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    max_responses: '',
    status: 'active', rules_json: emptyProjectRules()
  });
  const [formLoading, setFormLoading] = useState(false);

  const loadProjects = useCallback(async (signal) => {
    const res = await fetch('/api/projects', { signal });
    if (!res.ok) throw new Error('Failed to load projects');
    return res.json();
  }, []);
  const { data: projects, loading, refresh: fetchProjects } = useRemoteData(
    loadProjects, [], 'Lỗi khi tải danh sách dự án'
  );

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openCreateModal = () => {
    setFormData({ name: '', description: '', start_date: '', end_date: '', max_responses: '', status: 'active', rules_json:emptyProjectRules() });
    setIsCreateModalOpen(true);
  };

  const openEditModal = (project) => {
    setCurrentProject(project);
    setFormData({
      name: project.name,
      description: project.description || '',
      start_date: project.start_date ? project.start_date.split('T')[0] : '',
      end_date: project.end_date ? project.end_date.split('T')[0] : '',
      max_responses: project.max_responses || '',
      rules_json:parseProjectRules(project.rules_json),
      status: project.status
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (project) => {
    setCurrentProject(project);
    setIsDeleteModalOpen(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, max_responses: formData.max_responses ? parseInt(formData.max_responses) : null })
      });
      if (res.ok) {
        addToast('Tạo dự án thành công', 'success');
        setIsCreateModalOpen(false);
        fetchProjects();
      } else {
        const errorData = await res.json();
        addToast(errorData.error || 'Lỗi khi tạo dự án', 'error');
      }
    } catch (error) {
      addToast('Đã xảy ra lỗi', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const res = await fetch(`/api/projects/${currentProject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, max_responses: formData.max_responses ? parseInt(formData.max_responses) : null })
      });
      if (res.ok) {
        addToast('Cập nhật dự án thành công', 'success');
        setIsEditModalOpen(false);
        fetchProjects();
      } else {
        const errorData = await res.json();
        addToast(errorData.error || 'Lỗi khi cập nhật dự án', 'error');
      }
    } catch (error) {
      addToast('Đã xảy ra lỗi', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    setFormLoading(true);
    try {
      const res = await fetch(`/api/projects/${currentProject.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        addToast('Xóa dự án thành công', 'success');
        setIsDeleteModalOpen(false);
        fetchProjects();
      } else {
        const errorData = await res.json();
        addToast(errorData.error || 'Lỗi khi xóa dự án', 'error');
      }
    } catch (error) {
      addToast('Đã xảy ra lỗi', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const isAdmin = session?.user?.role === 'admin';

  const formContent = (
    <>
      <div className="form-group">
        <label className="form-label">Tên dự án *</label>
        <input type="text" name="name" className="form-input" value={formData.name} onChange={handleInputChange} required />
      </div>
      <ProjectRulesEditor value={formData.rules_json} onChange={rules_json=>setFormData({...formData,rules_json})}/>
      <div className="form-group">
        <label className="form-label">Mô tả</label>
        <textarea name="description" className="form-textarea" value={formData.description} onChange={handleInputChange}></textarea>
      </div>
      <div className="grid-cols-2">
        <div className="form-group">
          <label className="form-label">Ngày bắt đầu</label>
          <input type="date" name="start_date" className="form-input" value={formData.start_date} onChange={handleInputChange} />
        </div>
        <div className="form-group">
          <label className="form-label">Ngày kết thúc</label>
          <input type="date" name="end_date" className="form-input" value={formData.end_date} onChange={handleInputChange} />
        </div>
      </div>
      <div className="grid-cols-2">
        <div className="form-group">
          <label className="form-label">Giới hạn số phản hồi</label>
          <input type="number" name="max_responses" className="form-input" value={formData.max_responses} onChange={handleInputChange} min="1" />
        </div>
        <div className="form-group">
          <label className="form-label">Trạng thái</label>
          <select name="status" className="form-select" value={formData.status} onChange={handleInputChange}>
            <option value="active">Onfield</option>
            <option value="inactive">Đóng</option>
          </select>
        </div>
      </div>

    </>
  );

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <h1 className="page-title">Quản lý Dự án</h1>
        <button className="btn btn-primary" onClick={openCreateModal}>
          + Tạo Dự án Mới
        </button>
      </div>

      {loading ? (
        <div className="grid-cols-3">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="card skeleton" style={{ height: '240px' }}></div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="glass-card empty-state">
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}><Icon name="folder" /></div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Chưa có dự án nào</h3>
          <p>Bắt đầu bằng cách tạo dự án khảo sát đầu tiên của bạn.</p>
          <button className="btn btn-primary" style={{ marginTop: '1.5rem' }} onClick={openCreateModal}>
            Tạo Dự án Ngay
          </button>
        </div>
      ) : (
        <div className="grid-cols-3">
          {projects.map(project => {
            const progress = project.max_responses ? Math.min(100, Math.round(((project.response_count || 0) / project.max_responses) * 100)) : 0;
            return (
              <div key={project.id} className="card" style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer' }} onClick={() => router.push(`/admin/projects/${project.id}`)}>
                <div className="flex-between" style={{ marginBottom: '1rem' }}>
                  <span className={`badge ${project.status === 'active' ? 'badge-active' : 'badge-inactive'}`}>
                    {project.status === 'active' ? 'Onfield' : 'Đóng'}
                  </span>
                  {isAdmin && (
                    <div style={{ display: 'flex', gap: '0.5rem' }} onClick={e => e.stopPropagation()}>
                      <CopyProject project={project}/><button className="btn btn-secondary btn-icon" title="Chỉnh sửa dự án" aria-label="Chỉnh sửa dự án" onClick={() => openEditModal(project)}><Icon name="edit" /></button>
                      <button className="btn btn-secondary btn-icon" style={{ color: 'var(--danger)' }} title="Xóa dự án" aria-label="Xóa dự án" onClick={() => openDeleteModal(project)}><Icon name="trash" /></button>
                    </div>
                  )}
                </div>
                
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>{project.name}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1 }}>
                  {project.description || 'Không có mô tả'}
                </p>
                
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <Icon name="calendar" /> {project.start_date ? new Date(project.start_date).toLocaleDateString('vi-VN') : 'N/A'} - {project.end_date ? new Date(project.end_date).toLocaleDateString('vi-VN') : 'N/A'}
                </div>

                {project.max_responses && (
                  <div style={{ marginBottom: '1rem' }}>
                    <div className="flex-between" style={{ fontSize: '0.75rem', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>
                      <span>Tiến độ</span>
                      <span>{project.response_count || 0} / {project.max_responses}</span>
                    </div>
                    <div style={{ height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${progress}%`, background: 'var(--accent-gradient)', borderRadius: '3px' }}></div>
                    </div>
                  </div>
                )}

                <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Icon name="chart" /> {project.survey_count || 0} khảo sát</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Icon name="file" /> {project.response_count || 0} phản hồi</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Tạo Dự án Mới"
        size="lg"
      >
        <form id="createProjectForm" onSubmit={handleCreate}>
          {formContent}
        </form>
        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button type="button" className="btn btn-ghost" onClick={() => setIsCreateModalOpen(false)}>Hủy</button>
          <button type="submit" form="createProjectForm" className="btn btn-primary" disabled={formLoading}>
            {formLoading ? 'Đang lưu...' : 'Lưu Dự án'}
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Chỉnh sửa Dự án"
        size="lg"
      >
        <form id="editProjectForm" onSubmit={handleEdit}>
          {formContent}
        </form>
        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button type="button" className="btn btn-ghost" onClick={() => setIsEditModalOpen(false)}>Hủy</button>
          <button type="submit" form="editProjectForm" className="btn btn-primary" disabled={formLoading}>
            {formLoading ? 'Đang lưu...' : 'Cập nhật'}
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Xác nhận Xóa"
        size="sm"
      >
        <div style={{ padding: '1rem 0' }}>
          Bạn có chắc chắn muốn xóa dự án <strong>{currentProject?.name}</strong>?
          Thao tác này sẽ xóa toàn bộ khảo sát, phản hồi, Form Recall, lịch đăng ký và thông tin giao mẫu liên quan và không thể hoàn tác. Hồ sơ và lịch sử trong Quản lý data vẫn được lưu.
        </div>
        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button type="button" className="btn btn-ghost" onClick={() => setIsDeleteModalOpen(false)}>Hủy</button>
          <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={formLoading}>
            {formLoading ? 'Đang xóa...' : 'Xóa Dự án'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
