'use client';
import dynamic from 'next/dynamic';

import CopyProject from '@/components/CopyProject';
const ProjectSummaryEditor=dynamic(()=>import('@/components/ProjectSummaryEditor'),{loading:()=> <p>Đang tải…</p>});
import SummaryPreview from '@/components/SummaryPreview';
const ProjectMembers=dynamic(()=>import('@/components/ProjectMembers'),{loading:()=> <p>Đang tải…</p>});
import Icon from '@/components/Icon';
import ProjectProgress from '@/components/ProjectProgress';
import ProjectExport from '@/components/ProjectExport';
import DeleteProject from '@/components/DeleteProject';
import DeleteSurvey from '@/components/DeleteSurvey';
const RecallManager=dynamic(()=>import('@/components/RecallManager'),{loading:()=> <p>Đang tải…</p>});
import SurveyAnswerValue from '@/components/SurveyAnswerValue';
import RespondentDetails from '@/components/RespondentDetails';
import { downloadCsv } from '@/lib/downloadCsv';
import useRemoteData from '@/hooks/useRemoteData';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Modal from '@/components/Modal';
import { useToast } from '@/components/Toast';

export default function ProjectDetailPage({ params }) {
  const { id } = React.use(params);
  const router = useRouter();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('surveys');
  
  const [isCreateSurveyOpen, setIsCreateSurveyOpen] = useState(false);
  const [surveyForm, setSurveyForm] = useState({ title: '', description: '' });
  const [formLoading, setFormLoading] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState(null);

  const loadProjectData = useCallback(async (signal) => {
    const results = await Promise.all([
      fetch(`/api/projects/${id}`, { signal }),
      fetch(`/api/surveys?project_id=${id}`, { signal }),
      fetch(`/api/responses?project_id=${id}`, { signal }),
    ]);
    if (results.some(res => !res.ok)) throw new Error('Failed to load project data');
    const [project, surveys, responseData] = await Promise.all(results.map(res => res.json()));
    return { project, surveys, responses: responseData.responses || [] };
  }, [id]);
  const { data: { project, surveys, responses }, loading, refresh: fetchProjectData } = useRemoteData(
    loadProjectData, { project: null, surveys: [], responses: [] }, 'Lỗi khi tải dữ liệu'
  );

  const handleCreateSurvey = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const res = await fetch('/api/surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...surveyForm, project_id: id })
      });
      if (res.ok) {
        addToast('Tạo khảo sát thành công', 'success');
        setIsCreateSurveyOpen(false);
        const newSurvey = await res.json();
        router.push(`/admin/surveys/${newSurvey.id}/builder`);
      } else {
        const error = await res.json();
        addToast(error.error || 'Lỗi khi tạo khảo sát', 'error');
      }
    } catch (error) {
      addToast('Đã xảy ra lỗi', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const copyToClipboard = (token) => {
    const url = `${window.location.origin}/s/${token}`;
    navigator.clipboard.writeText(url);
    addToast('Đã sao chép link chia sẻ', 'success');
  };

  const togglePublish = async (survey) => {
    try {
      const res = await fetch(`/api/surveys/${survey.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: !survey.is_published })
      });
      if (res.ok) {
        addToast(`Đã ${survey.is_published ? 'ẩn' : 'công khai'} khảo sát`, 'success');
        fetchProjectData();
      } else {
        const result = await res.json();
        addToast(result.error || 'Không thể cập nhật trạng thái khảo sát.', 'error');
      }
    } catch (error) {
      addToast('Lỗi khi cập nhật trạng thái', 'error');
    }
  };

  const exportCSV = async () => {
    try {
      await downloadCsv(`/api/responses/export?project_id=${encodeURIComponent(id)}`);
    } catch (error) {
      addToast(error.message, 'error');
    }
  };

  if (loading) {
    return (
      <div>
        <div className="skeleton" style={{ height: '40px', width: '200px', marginBottom: '2rem' }}></div>
        <div className="skeleton card" style={{ height: '200px', marginBottom: '2rem' }}></div>
      </div>
    );
  }

  if (!project) return <div>Không tìm thấy dự án</div>;

  return (
    <div className="animate-fadeIn">
      <div style={{ marginBottom: '1.5rem' }}>
        <button className="btn-ghost" onClick={() => router.push('/admin/projects')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
          ← Quay lại danh sách
        </button>
      </div>

      <div className="glass-card" style={{ marginBottom: '2rem' }}>
        <div className="flex-between" style={{ marginBottom: '1rem' }}>
          <h1 className="page-title" style={{ margin: 0 }}>{project.name}</h1>
          <span className={`badge ${project.status === 'active' ? 'badge-active' : 'badge-inactive'}`} style={{ fontSize: '1rem', padding: '6px 16px' }}>
            {project.status === 'active' ? 'Onfield' : 'Đóng'}
          </span>
        </div>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '1.1rem' }}>
          {project.description || 'Không có mô tả'}
        </p>
        <div className="grid-cols-4" style={{ gap: '1rem' }}>
          <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Ngày bắt đầu</div>
            <div style={{ fontWeight: 600 }}>{project.start_date ? new Date(project.start_date).toLocaleDateString('vi-VN') : 'Không giới hạn'}</div>
          </div>
          <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Ngày kết thúc</div>
            <div style={{ fontWeight: 600 }}>{project.end_date ? new Date(project.end_date).toLocaleDateString('vi-VN') : 'Không giới hạn'}</div>
          </div>
          <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Số phản hồi</div>
            <div style={{ fontWeight: 600 }}>{project.response_count || 0} {project.max_responses ? `/ ${project.max_responses}` : ''}</div>
          </div>
          <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Số khảo sát</div>
            <div style={{ fontWeight: 600 }}>{surveys.length}</div>
          </div>
        </div>
      </div>

      <section className="card" style={{marginBottom:'1rem'}}><h2>Tiến độ chỉ tiêu</h2><ProjectProgress project={project}/></section>
      <div className="flex gap-2" style={{flexWrap:'wrap',marginBottom:20}}><ProjectExport projectId={id}/><CopyProject project={project}/><DeleteProject project={project}/></div>
      <div style={{ borderBottom: '1px solid var(--border-color)', marginBottom: '2rem', display: 'flex', gap: '2rem' }}>
        <button 
          className="btn-ghost" 
          style={{ 
            padding: '1rem 0', border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 600,
            color: activeTab === 'surveys' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'surveys' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            borderRadius: 0
          }}
          onClick={() => setActiveTab('surveys')}
        >
          <Icon name="file" /> Danh sách Khảo sát
        </button>
        <button 
          className="btn-ghost" 
          style={{ 
            padding: '1rem 0', border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 600,
            color: activeTab === 'responses' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'responses' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            borderRadius: 0
          }}
          onClick={() => setActiveTab('responses')}
        >
          <Icon name="download" /> Phản hồi ({responses.length})
        </button>
      </div>

      <div className="flex gap-2" style={{marginBottom:20,flexWrap:'wrap'}}><button className={activeTab==='summary'?'btn btn-primary':'btn btn-secondary'} onClick={()=>setActiveTab('summary')}>Mẫu tóm tắt</button><button className={activeTab==='members'?'btn btn-primary':'btn btn-secondary'} onClick={()=>setActiveTab('members')}>Người tham gia (Excel)</button><button className={activeTab==='recall'?'btn btn-primary':'btn btn-secondary'} onClick={()=>setActiveTab('recall')}>Form Recall của dự án</button></div>
      {activeTab==='summary'&&<ProjectSummaryEditor projectId={id}/>}
      {activeTab==='members'&&<ProjectMembers projectId={id} projectName={project.name}/>}
      {activeTab==='recall'&&<RecallManager projectId={id} projectName={project.name}/>}
      {activeTab === 'surveys' && (
        <div>
          <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Khảo sát trong dự án</h2>
            <button className="btn btn-primary" onClick={() => setIsCreateSurveyOpen(true)}>
              + Tạo Khảo sát
            </button>
          </div>
          
          {surveys.length === 0 ? (
            <div className="empty-state glass-card">
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}><Icon name="file" /></div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Chưa có khảo sát</h3>
              <p style={{ marginBottom: '1.5rem' }}>Dự án này chưa có khảo sát nào.</p>
              <button className="btn btn-primary" onClick={() => setIsCreateSurveyOpen(true)}>Tạo Khảo sát Đầu tiên</button>
            </div>
          ) : (
            <div className="grid-cols-3">
              {surveys.map(survey => (
                <div key={survey.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div className="flex-between" style={{ marginBottom: '1rem' }}>
                    <span className={`badge ${survey.is_published ? 'badge-success' : 'badge-inactive'}`} style={{
                      background: survey.is_published ? 'rgba(16, 185, 129, 0.1)' : 'rgba(85, 85, 119, 0.1)',
                      color: survey.is_published ? 'var(--success)' : 'var(--text-muted)'
                    }}>
                      {survey.is_published ? 'Công khai' : 'Bản nháp'}
                    </span>
                    <button 
                      className="btn-icon btn-ghost" 
                      title={survey.is_published ? 'Ẩn khảo sát' : 'Công khai'}
                      onClick={() => togglePublish(survey)}
                    >
                      {survey.is_published ? <Icon name="eye" /> : <Icon name="lock" />}
                    </button>
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>{survey.title}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem', flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {survey.description || 'Không có mô tả'}
                  </p>
                  
                  {survey.is_published && (
                    <div style={{ background: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
                      <input type="text" readOnly value={`${window.location.origin}/s/${survey.share_token}`} style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '0.75rem', outline: 'none' }} />
                      <button className="btn-icon btn-secondary" style={{ width: '28px', height: '28px', fontSize: '0.75rem' }} onClick={() => copyToClipboard(survey.share_token)} title="Copy link"><Icon name="copy" /></button>
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => router.push(`/admin/surveys/${survey.id}/builder`)}>
                      Chỉnh sửa
                    </button>
                    <DeleteSurvey survey={survey} onDeleted={fetchProjectData} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'responses' && (
        <div>
          <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Danh sách Phản hồi</h2>
            <button className="btn btn-secondary" onClick={exportCSV} disabled={responses.length === 0}>
              <Icon name="download" /> Xuất CSV
            </button>
          </div>
          
          {responses.length === 0 ? (
            <div className="empty-state glass-card">
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}><Icon name="download" /></div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Chưa có phản hồi</h3>
              <p>Chưa có ai tham gia khảo sát trong dự án này.</p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Tên</th>
                      <th>Số điện thoại</th>
                      <th>Email</th>
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
      )}

      <Modal isOpen={isCreateSurveyOpen} onClose={() => setIsCreateSurveyOpen(false)} title="Tạo Khảo sát Mới">
        <form id="createSurveyForm" onSubmit={handleCreateSurvey}>
          <div className="form-group">
            <label className="form-label">Tiêu đề khảo sát *</label>
            <input type="text" className="form-input" value={surveyForm.title} onChange={e => setSurveyForm({...surveyForm, title: e.target.value})} required />
          </div>
          <div className="form-group">
            <label className="form-label">Mô tả (Tùy chọn)</label>
            <textarea className="form-textarea" value={surveyForm.description} onChange={e => setSurveyForm({...surveyForm, description: e.target.value})}></textarea>
          </div>
        </form>
        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button type="button" className="btn btn-ghost" onClick={() => setIsCreateSurveyOpen(false)}>Hủy</button>
          <button type="submit" form="createSurveyForm" className="btn btn-primary" disabled={formLoading}>
            {formLoading ? 'Đang tạo...' : 'Tạo Khảo sát'}
          </button>
        </div>
      </Modal>

      <Modal isOpen={!!selectedResponse} onClose={() => setSelectedResponse(null)} title="Chi tiết Phản hồi" size="md">
        {selectedResponse && (
          <div>
            <RespondentDetails response={selectedResponse} /><SummaryPreview key={selectedResponse.id} projectId={id} responseId={selectedResponse.id}/>

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
    </div>
  );
}
