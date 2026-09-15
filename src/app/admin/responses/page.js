'use client';

import Icon from '@/components/Icon';
import {INVITERS} from '@/lib/respondent.mjs';
import SurveyAnswerValue from '@/components/SurveyAnswerValue';
import { useSession } from 'next-auth/react';
import RespondentDetails from '@/components/RespondentDetails';
import { downloadCsv } from '@/lib/downloadCsv';
import useRemoteData from '@/hooks/useRemoteData';

import React, { useState, useEffect, useCallback } from 'react';
import Modal from '@/components/Modal';
import { useToast } from '@/components/Toast';

const emptyResponses = { responses: [], pagination: { total: 0, page: 1, totalPages: 1 } };

export default function ResponsesPage() {
  const { addToast } = useToast();
  const { data: session } = useSession();
  const canDelete = session?.user?.role === 'admin';
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [projects, setProjects] = useState([]);
  const [surveys, setSurveys] = useState([]);
  
  // Filters
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedSurvey, setSelectedSurvey] = useState('');
  const [phoneSearch, setPhoneSearch] = useState('');
  const [inviter,setInviter]=useState('');
  const [sort,setSort]=useState('newest');
  
  // Modals
  const [selectedResponse, setSelectedResponse] = useState(null);
  
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch('/api/projects');
        if (res.ok) setProjects(await res.json());
      } catch (e) {
        console.error(e);
      }
    };
    fetchProjects();
  }, []);

  useEffect(() => {
    const fetchSurveys = async () => {
      if (!selectedProject) {
        setSurveys([]);
        return;
      }
      try {
        const res = await fetch(`/api/surveys?project_id=${selectedProject}`);
        if (res.ok) setSurveys(await res.json());
      } catch (e) {
        console.error(e);
      }
    };
    fetchSurveys();
  }, [selectedProject]);

  const loadResponses = useCallback(async (signal) => {
    const params = new URLSearchParams({ page: String(page) });
    if (selectedProject) params.append('project_id', selectedProject);
    if (selectedSurvey) params.append('survey_id', selectedSurvey);
    if (phoneSearch) params.append('phone', phoneSearch);
    if(inviter)params.set('inviter',inviter);
    params.set('sort',sort);
    const res = await fetch(`/api/responses?${params.toString()}`, { signal });
    if (!res.ok) throw new Error('Failed to load responses');
    const data = await res.json();
    return { responses: data.responses || [], pagination: data.pagination || emptyResponses.pagination };
  }, [selectedProject, selectedSurvey, phoneSearch, page, inviter, sort]);
  const { data, loading, error, refresh } = useRemoteData(
    loadResponses, emptyResponses, 'Lỗi khi tải dữ liệu'
  );
  const { responses, pagination } = data;
  const totalPages = Math.max(1, pagination.totalPages);

  const deleteResponse = async () => {
    if (!pendingDelete || deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/responses/${encodeURIComponent(pendingDelete.id)}`, { method: 'DELETE' });
      const result = await res.json();
      if (!res.ok && res.status !== 404) throw new Error(result.error || 'Không thể xóa phản hồi.');
      if (selectedResponse?.id === pendingDelete.id) setSelectedResponse(null);
      setPendingDelete(null);
      if (responses.length === 1 && page > 1) setPage(page - 1);
      else refresh();
      addToast(res.status === 404 ? 'Phản hồi đã được xóa trước đó.' : 'Đã xóa phản hồi.', 'success');
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const exportCSV = async () => {
    const params = new URLSearchParams();
    if (selectedProject) params.set('project_id', selectedProject);
    if (selectedSurvey) params.set('survey_id', selectedSurvey);
    if (phoneSearch) params.set('phone', phoneSearch);
    if(inviter)params.set('inviter',inviter);
    params.set('sort',sort);
    try {
      await downloadCsv(`/api/responses/export?${params.toString()}`);
    } catch (error) {
      addToast(error.message, 'error');
    }
  };

  const clearFilters = () => {
    setSelectedProject('');
    setSelectedSurvey('');
    setPhoneSearch('');setInviter('');setSort('newest');
    setPage(1);
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <h1 className="page-title">Quản lý Phản hồi</h1>
      </div>

      <div className="glass-card" style={{ marginBottom: '2rem', padding: '1rem' }}>
        <div className="response-filters" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', alignItems: 'end' }}>
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Lọc theo Dự án</label>
            <select className="form-select" value={selectedProject} onChange={e => { setSelectedProject(e.target.value); setSelectedSurvey(''); setPage(1); }}>
              <option value="">Tất cả Dự án</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Lọc theo Khảo sát</label>
            <select className="form-select" value={selectedSurvey} onChange={e => { setSelectedSurvey(e.target.value); setPage(1); }} disabled={!selectedProject}>
              <option value="">Tất cả Khảo sát</option>
              {surveys.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Tìm Số điện thoại</label>
            <input type="text" className="form-input" placeholder="Nhập SĐT..." value={phoneSearch} onChange={e => { setPhoneSearch(e.target.value); setPage(1); }} />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary" onClick={clearFilters} title="Xóa bộ lọc"><Icon name="refresh" /></button>
            <button className="btn btn-primary" onClick={exportCSV} style={{ flex: 1 }} disabled={responses.length === 0}><Icon name="download" /> Xuất CSV</button>
          </div>
        </div>
      </div>

      <div className="editor-grid" style={{marginBottom:'1rem'}}>
        <label className="form-label">Người mời<select aria-label="Người mời" className="form-select" value={inviter} onChange={e=>{setInviter(e.target.value);setPage(1);}}><option value="">Tất cả người mời</option>{INVITERS.map(v=><option key={v}>{v}</option>)}</select></label>
        <label className="form-label">Sắp xếp<select aria-label="Sắp xếp" className="form-select" value={sort} onChange={e=>{setSort(e.target.value);setPage(1);}}><option value="newest">Mới nhất</option><option value="inviter_asc">Người mời A → Z</option><option value="inviter_desc">Người mời Z → A</option></select></label>
      </div>
      <div className="response-layout">
        <div>
          {loading ? (
            <div className="card skeleton" style={{ height: '400px' }}></div>
          ) : error ? (
            <div className="card empty-state"><p>Không thể tải phản hồi.</p><button className="btn btn-secondary" onClick={refresh}>Thử lại</button></div>
          ) : responses.length === 0 ? (
            <div className="glass-card empty-state">
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}><Icon name="file" /></div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Không có phản hồi</h3>
              <p>Không tìm thấy phản hồi nào phù hợp với bộ lọc.</p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Tên</th>
                      <th>SĐT</th><th>Người mời</th>
                      <th>Email</th>
                      <th>Dự án</th>
                      <th>Khảo sát</th>
                      <th>Ngày nộp</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {responses.map(response => (
                      <tr key={response.id} onClick={() => setSelectedResponse(response)} style={{ cursor: 'pointer' }}>
                        <td style={{ fontWeight: 500 }}>{response.respondent_name || 'Ẩn danh'}</td>
                        <td>{response.respondent_phone || '-'}</td><td>{response.respondent_inviter || '—'}</td>
                        <td>{response.respondent_email || '-'}</td>
                        <td>{response.projectName}</td>
                        <td>{response.surveyName}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{new Date(response.created_at).toLocaleString('vi-VN')}</td>
                        <td><div className="flex gap-2">
                          <button className="btn btn-secondary btn-sm" aria-label={`Xem phản hồi của ${response.respondent_name || response.respondent_phone || 'người tham gia'}`} onClick={event => { event.stopPropagation(); setSelectedResponse(response); }}>Xem</button>
                          {canDelete && <button className="btn btn-danger btn-sm" aria-label={`Xóa phản hồi của ${response.respondent_name || response.respondent_phone || 'người tham gia'}`} onClick={event => { event.stopPropagation(); setPendingDelete(response); }}><Icon name="trash" /> Xóa</button>}
                        </div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="data-pagination">
                <span>{pagination.total} phản hồi · Trang {page} / {totalPages}</span>
                <div className="flex gap-2">
                  <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(previous => previous - 1)}>Trước</button>
                  <button className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage(previous => previous + 1)}>Sau</button>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

      <Modal isOpen={!!selectedResponse} onClose={() => setSelectedResponse(null)} title="Chi tiết Phản hồi" size="md" footer={canDelete && <button className="btn btn-danger" onClick={() => { setPendingDelete(selectedResponse); setSelectedResponse(null); }}><Icon name="trash" /> Xóa phản hồi này</button>}>
        {selectedResponse && (
          <div>
            <RespondentDetails response={selectedResponse} />

            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
              Nội dung trả lời
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {Object.entries(selectedResponse.answers_json || {}).map(([questionId, answer]) => (
                <div key={questionId}>
                  <div style={{ fontWeight: 500, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>{selectedResponse.question_labels?.[questionId] || 'Câu hỏi không còn trong bản khảo sát hiện tại'}</div>
                  <div style={{ background: 'var(--bg-glass)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                    <SurveyAnswerValue value={answer} />
                  </div>
                </div>
              ))}
              {(!selectedResponse.answers_json || Object.keys(selectedResponse.answers_json).length === 0) && (
                <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Không có dữ liệu trả lời chi tiết</div>
              )}
            </div>
          </div>
        )}
      </Modal>
      <Modal isOpen={!!pendingDelete} onClose={() => { if (!deleting) setPendingDelete(null); }} title="Xóa phản hồi?" size="sm" footer={<>
        <button className="btn btn-secondary" disabled={deleting} onClick={() => setPendingDelete(null)}>Hủy</button>
        <button className="btn btn-danger" disabled={deleting} onClick={deleteResponse}>{deleting ? 'Đang xóa…' : 'Xác nhận xóa'}</button>
      </>}>
        {pendingDelete && <>
          <p>Phản hồi của <strong>{pendingDelete.respondent_name || 'người tham gia'}</strong> ({pendingDelete.respondent_phone || 'không có số điện thoại'}) trong khảo sát <strong>{pendingDelete.surveyName || pendingDelete.survey_title}</strong> sẽ bị xóa vĩnh viễn.</p>
          <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Hồ sơ và lịch sử đã lưu trong Quản lý data vẫn được giữ lại. Số điện thoại này có thể gửi lại khảo sát nếu khảo sát còn mở.</p>
        </>}
      </Modal>
    </div>
  );
}
