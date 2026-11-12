'use client';

import CopyProject from '@/components/CopyProject';
import Icon from '@/components/Icon';
import ProjectRulesEditor from '@/components/ProjectRulesEditor';
import {emptyProjectRules,parseProjectRules} from '@/lib/projectRules.mjs';
import useRemoteData from '@/hooks/useRemoteData';
import { sortProjects, formatProjectDate } from '@/lib/projectList.mjs';

import React, { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import Modal from '@/components/Modal';
import { useToast } from '@/components/Toast';

export default function ProjectsPage() {
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
  const [statusFilter, setStatusFilter] = useState('');
  const [sort, setSort] = useState({ key: 'created_at', direction: 'desc' });

  const loadProjects = useCallback(async (signal) => {
    const res = await fetch('/api/projects', { signal, cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to load projects');
    return res.json();
  }, []);
  const { data: projects, loading, error, refresh: fetchProjects } = useRemoteData(
    loadProjects, [], 'Lỗi khi tải danh sách dự án'
  );
  const visibleProjects = useMemo(() => sortProjects(
    projects.filter(project => !statusFilter || project.status === statusFilter), sort
  ), [projects, statusFilter, sort]);
  const changeSort = key => setSort(previous => ({
    key, direction: previous.key === key && previous.direction === 'asc' ? 'desc' : 'asc',
  }));
  const sortHeader = (key, label) => (
    <th scope="col" aria-sort={sort.key === key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="btn btn-ghost btn-sm" style={{ padding: 0, whiteSpace: 'nowrap', color: 'inherit' }}
        onClick={() => changeSort(key)} title={key === 'status' ? 'Đổi thứ tự Onfield / Đóng' : `Sắp xếp theo ${label.toLowerCase()}`}>
        {label} <span aria-hidden="true">{sort.key === key ? (sort.direction === 'asc' ? '↑' : '↓') : '↕'}</span>
      </button>
    </th>
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
        const created = await res.json();
        addToast('Tạo dự án thành công', 'success');
        setIsCreateModalOpen(false);
        fetchProjects(current => [...current, { ...created, survey_count: 0, response_count: 0 }]);
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
        const updated = await res.json();
        addToast('Cập nhật dự án thành công', 'success');
        setIsEditModalOpen(false);
        fetchProjects(current => current.map(project => project.id === updated.id ? { ...project, ...updated } : project));
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
        fetchProjects(current => current.filter(project => project.id !== currentProject.id));
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

      <div className="card" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'end', gap: '1rem', flexWrap: 'wrap' }}>
        <label className="form-label" htmlFor="project-status-filter" style={{ minWidth: 200, marginBottom: 0 }}>
          Trạng thái dự án
          <select id="project-status-filter" className="form-select" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
            <option value="">Tất cả trạng thái</option>
            <option value="active">Onfield</option>
            <option value="inactive">Đóng</option>
          </select>
        </label>
        <div style={{ flex: 1 }}>
          <p aria-live="polite">{loading ? 'Đang tải…' : `${visibleProjects.length} / ${projects.length} dự án`}</p>
          <p className="form-hint" style={{ marginBottom: 0 }}>Bấm tiêu đề cột để đổi thứ tự tăng/giảm. Ngày chưa đặt được xếp cuối.</p>
        </div>
      </div>

      {loading ? (
        <div className="card skeleton" style={{ height: 320 }} role="status" aria-label="Đang tải dự án" />
      ) : error ? (
        <div className="card empty-state"><p role="alert">Không thể tải danh sách dự án.</p><button className="btn btn-secondary" onClick={fetchProjects}>Thử lại</button></div>
      ) : projects.length === 0 ? (
        <div className="glass-card empty-state">
          <Icon name="folder" size={32} />
          <h3 style={{ margin: '1rem 0 .5rem' }}>Chưa có dự án nào</h3>
          <p>Bắt đầu bằng cách tạo dự án khảo sát đầu tiên của bạn.</p>
          <button className="btn btn-primary" style={{ marginTop: '1.5rem' }} onClick={openCreateModal}>Tạo Dự án Ngay</button>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" aria-label="Danh sách dự án">
              <thead>
                <tr>
                  {sortHeader('name', 'Dự án')}
                  {sortHeader('status', 'Trạng thái')}
                  {sortHeader('start_date', 'Ngày bắt đầu')}
                  {sortHeader('end_date', 'Ngày kết thúc')}
                  {sortHeader('created_at', 'Ngày tạo')}
                  <th scope="col">Khảo sát</th>
                  <th scope="col">Phản hồi</th>
                  <th scope="col">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {visibleProjects.map(project => {
                  const progress = project.max_responses > 0 ? Math.min(100, Math.round(((project.response_count || 0) / project.max_responses) * 100)) : 0;
                  return (
                    <tr key={project.id}>
                      <td style={{ minWidth: 220, maxWidth: 320 }}>
                        <Link href={`/admin/projects/${encodeURIComponent(project.id)}`} style={{ fontWeight: 600 }}>{project.name}</Link>
                        <p title={project.description || ''} style={{ color: 'var(--text-secondary)', fontSize: '.875rem', margin: '.25rem 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {project.description || 'Không có mô tả'}
                        </p>
                      </td>
                      <td><span className={`badge ${project.status === 'active' ? 'badge-active' : 'badge-inactive'}`}>{project.status === 'active' ? 'Onfield' : 'Đóng'}</span></td>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatProjectDate(project.start_date)}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatProjectDate(project.end_date)}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{project.created_at ? formatProjectDate(project.created_at) : '—'}</td>
                      <td>{project.survey_count || 0}</td>
                      <td style={{ minWidth: 130 }}>
                        <span>{project.response_count || 0}{project.max_responses > 0 ? ` / ${project.max_responses}` : ''}</span>
                        {project.max_responses > 0 && <div role="progressbar" aria-label={`Tiến độ phản hồi ${project.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} style={{ height: 6, background: 'var(--bg-tertiary)', borderRadius: 3, overflow: 'hidden', marginTop: 6 }}>
                          <div style={{ height: '100%', width: `${progress}%`, background: 'var(--accent-gradient)' }} />
                        </div>}
                      </td>
                      <td>
                        <div className="flex gap-2" style={{ flexWrap: 'nowrap' }}>
                          <Link className="btn btn-secondary btn-icon" href={`/admin/projects/${encodeURIComponent(project.id)}`} title="Xem dự án" aria-label={`Xem dự án ${project.name}`}><Icon name="eye" /></Link>
                          {isAdmin && <>
                            <CopyProject project={project} />
                            <button className="btn btn-secondary btn-icon" title="Chỉnh sửa dự án" aria-label={`Chỉnh sửa dự án ${project.name}`} onClick={() => openEditModal(project)}><Icon name="edit" /></button>
                            <button className="btn btn-secondary btn-icon" style={{ color: 'var(--danger)' }} title="Xóa dự án" aria-label={`Xóa dự án ${project.name}`} onClick={() => openDeleteModal(project)}><Icon name="trash" /></button>
                          </>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {visibleProjects.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>Không có dự án ở trạng thái này. <button className="btn btn-secondary btn-sm" onClick={() => setStatusFilter('')}>Xem tất cả</button></td></tr>}
              </tbody>
            </table>
          </div>
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
