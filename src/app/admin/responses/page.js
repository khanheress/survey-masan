'use client';

import Icon from '@/components/Icon';
import RespondentDetails from '@/components/RespondentDetails';
import { downloadCsv } from '@/lib/downloadCsv';
import useRemoteData from '@/hooks/useRemoteData';

import React, { useState, useEffect, useCallback } from 'react';
import Modal from '@/components/Modal';
import { useToast } from '@/components/Toast';

export default function ResponsesPage() {
  const { addToast } = useToast();
  const [projects, setProjects] = useState([]);
  const [surveys, setSurveys] = useState([]);
  
  // Filters
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedSurvey, setSelectedSurvey] = useState('');
  const [phoneSearch, setPhoneSearch] = useState('');
  
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
    const params = new URLSearchParams();
    if (selectedProject) params.append('project_id', selectedProject);
    if (selectedSurvey) params.append('survey_id', selectedSurvey);
    if (phoneSearch) params.append('phone', phoneSearch);
    const res = await fetch(`/api/responses?${params.toString()}`, { signal });
    if (!res.ok) throw new Error('Failed to load responses');
    const data = await res.json();
    return data.responses || [];
  }, [selectedProject, selectedSurvey, phoneSearch]);
  const { data: responses, loading } = useRemoteData(
    loadResponses, [], 'Lỗi khi tải dữ liệu'
  );

  const exportCSV = async () => {
    const params = new URLSearchParams();
    if (selectedProject) params.set('project_id', selectedProject);
    if (selectedSurvey) params.set('survey_id', selectedSurvey);
    if (phoneSearch) params.set('phone', phoneSearch);
    try {
      await downloadCsv(`/api/responses/export?${params.toString()}`);
    } catch (error) {
      addToast(error.message, 'error');
    }
  };

  const clearFilters = () => {
    setSelectedProject('');
    setSelectedSurvey('');
    setPhoneSearch('');
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
            <select className="form-select" value={selectedProject} onChange={e => { setSelectedProject(e.target.value); setSelectedSurvey(''); }}>
              <option value="">Tất cả Dự án</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Lọc theo Khảo sát</label>
            <select className="form-select" value={selectedSurvey} onChange={e => setSelectedSurvey(e.target.value)} disabled={!selectedProject}>
              <option value="">Tất cả Khảo sát</option>
              {surveys.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Tìm Số điện thoại</label>
            <input type="text" className="form-input" placeholder="Nhập SĐT..." value={phoneSearch} onChange={e => setPhoneSearch(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary" onClick={clearFilters} title="Xóa bộ lọc"><Icon name="refresh" /></button>
            <button className="btn btn-primary" onClick={exportCSV} style={{ flex: 1 }} disabled={responses.length === 0}><Icon name="download" /> Xuất CSV</button>
          </div>
        </div>
      </div>

      <div className="response-layout">
        <div>
          {loading ? (
            <div className="card skeleton" style={{ height: '400px' }}></div>
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
                      <th>SĐT</th>
                      <th>Email</th>
                      <th>Dự án</th>
                      <th>Khảo sát</th>
                      <th>Ngày nộp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {responses.map(response => (
                      <tr key={response.id} onClick={() => setSelectedResponse(response)} style={{ cursor: 'pointer' }}>
                        <td style={{ fontWeight: 500 }}>{response.respondent_name || 'Ẩn danh'}</td>
                        <td>{response.respondent_phone || '-'}</td>
                        <td>{response.respondent_email || '-'}</td>
                        <td>{response.projectName}</td>
                        <td>{response.surveyName}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{new Date(response.created_at).toLocaleString('vi-VN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

      </div>

      <Modal isOpen={!!selectedResponse} onClose={() => setSelectedResponse(null)} title="Chi tiết Phản hồi" size="md">
        {selectedResponse && (
          <div>
            <RespondentDetails response={selectedResponse} />

            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
              Nội dung trả lời
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {Object.entries(selectedResponse.answers_json || {}).map(([questionId, answer]) => (
                <div key={questionId}>
                  <div style={{ fontWeight: 500, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>{questionId}</div>
                  <div style={{ background: 'var(--bg-glass)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                    {Array.isArray(answer) ? answer.join(', ') : (answer?.toString() || '-')}
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
    </div>
  );
}
