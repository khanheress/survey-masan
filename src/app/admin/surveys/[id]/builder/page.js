'use client';

import Icon from '@/components/Icon';
import SurveyFlowPreview from '@/components/SurveyFlowPreview';
import SurveyLogicEditor from '@/components/SurveyLogicEditor';
import { validateSurveyFields } from '@/lib/surveyFlow.mjs';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import Modal from '@/components/Modal';

const FIELD_TYPES = [
  { id: 'section', label: 'Chia phần', icon: <Icon name="file" /> },
  { id: 'short_text', label: 'Văn bản ngắn', icon: <Icon name="mail" /> },
  { id: 'long_text', label: 'Văn bản dài', icon: <Icon name="file" /> },
  { id: 'multiple_choice', label: 'Trắc nghiệm', icon: <Icon name="radio" /> },
  { id: 'checkbox', label: 'Hộp kiểm', icon: <Icon name="check-square" /> },
  { id: 'dropdown', label: 'Danh sách', icon: <Icon name="download" /> },
  { id: 'date', label: 'Ngày', icon: <Icon name="calendar" /> },
  { id: 'phone', label: 'Số điện thoại', icon: <Icon name="phone" /> },
  { id: 'email', label: 'Email', icon: <Icon name="mail" /> },
  { id: 'rating', label: 'Đánh giá', icon: <Icon name="star" /> },
  { id: 'linear_scale', label: 'Thang đo', icon: <Icon name="scale" /> }
];

export default function SurveyBuilderPage({ params }) {
  const { id } = React.use(params);
  const router = useRouter();
  const { addToast } = useToast();
  
  const [survey, setSurvey] = useState(null);
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showFieldPicker, setShowFieldPicker] = useState(false);

  useEffect(() => {
    const fetchSurvey = async () => {
      try {
        const res = await fetch(`/api/surveys/${id}`);
        if (res.ok) {
          const data = await res.json();
          setSurvey(data);
          setFields(data.fields_json || []);
        } else {
          addToast('Lỗi khi tải khảo sát', 'error');
        }
      } catch (error) {
        addToast('Lỗi mạng', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchSurvey();
  }, [id, addToast]);

  const handleSave = async () => {
    const configError = validateSurveyFields(fields);
    if (configError) { addToast(configError, 'error'); return false; }
    setSaving(true);
    try {
      const res = await fetch(`/api/surveys/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: survey.title, description: survey.description, fields_json: fields })
      });
      if (res.ok) {
        addToast('Đã lưu thành công', 'success');
        setSurvey(await res.json());
        return true;
      } else {
        const data = await res.json();
        addToast(data.error || 'Lỗi khi lưu', 'error');
        return false;
      }
    } catch (error) {
      addToast('Lỗi mạng', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePublishToggle = async () => {
    if (!survey.is_published && !(await handleSave())) return;
    try {
      const res = await fetch(`/api/surveys/${id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: !survey.is_published })
      });
      if (res.ok) {
        setSurvey(prev => ({ ...prev, is_published: !prev.is_published }));
        addToast(`Khảo sát đã được ${!survey.is_published ? 'công khai' : 'ẩn'}`, 'success');
      } else {
        const data = await res.json();
        addToast(data.error || 'Không thể công khai khảo sát', 'error');
      }
    } catch (error) {
      addToast('Lỗi', 'error');
    }
  };

  const handleAddField = (type) => {
    const newField = {
      id: `field_${crypto.randomUUID()}`,
      type,
      label: type === 'section' ? 'Phần mới' : 'Câu hỏi chưa có tiêu đề',
      description: '',
      after: 'next',
      rules: [],
      required: false,
      placeholder: '',
      options: ['Tùy chọn 1'],
      min: 1,
      max: 5,
      minLabel: 'Kém',
      maxLabel: 'Tốt'
    };
    setFields(previous => [...previous, newField]);
    setShowFieldPicker(false);
  };

  const updateField = (fieldId, updates) => {
    setFields(previous => previous.map(f => f.id === fieldId ? { ...f, ...updates } : f));
  };

  const removeField = (fieldId) => {
    const referenced = fields.some(f => f.after === fieldId || f.rules?.some(r => r.target === fieldId));
    if (referenced) { addToast('Mục này đang là điểm đến của quy tắc. Hãy đổi điểm đến trước khi xóa.', 'error'); return; }
    setFields(fields.filter(f => f.id !== fieldId));
  };

  const moveField = (index, direction) => {
    if ((direction === -1 && index === 0) || (direction === 1 && index === fields.length - 1)) return;
    const newFields = [...fields];
    const temp = newFields[index];
    newFields[index] = newFields[index + direction];
    newFields[index + direction] = temp;
    const error = validateSurveyFields(newFields);
    if (error) { addToast(error, 'error'); return; }
    setFields(newFields);
  };

  if (loading) return <div className="flex-center" style={{ minHeight: '100vh' }}><div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '4px' }}></div></div>;
  if (!survey) return <div>Không tìm thấy khảo sát</div>;

  return (
    <div className="animate-fadeIn builder-page">
      <div className="flex-between builder-toolbar" style={{ marginBottom: '1.5rem', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn-icon btn-ghost" onClick={() => router.push(`/admin/projects/${survey.project_id}`)}>←</button>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Tạo câu hỏi: {survey.title}</h1>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {Boolean(survey.is_published) && (
            <button className="btn btn-secondary" onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/s/${survey.share_token}`);
              addToast('Đã copy link', 'success');
            }}>
              <Icon name="link" /> Copy Link
            </button>
          )}
          <button className={`btn ${survey.is_published ? 'btn-danger' : 'btn-secondary'}`} onClick={handlePublishToggle} disabled={saving}>
            {survey.is_published ? 'Ngừng Công Khai' : 'Công Khai'}
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Đang lưu...' : <><Icon name="save" /> Lưu</>}
          </button>
        </div>
      </div>

      <div className="builder-container">
        {/* LEFT PANEL - BUILDER */}
        <div className="builder-panel">
          <div className="card" style={{ marginBottom: '2rem', borderTop: '6px solid var(--accent-primary)' }}>
            <input 
              type="text" 
              value={survey.title}
              onChange={e => setSurvey({...survey, title: e.target.value})}
              style={{ fontSize: '2rem', fontWeight: 700, width: '100%', background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', marginBottom: '1rem' }}
              placeholder="Tiêu đề khảo sát"
            />
            <textarea
              value={survey.description || ''}
              onChange={e => setSurvey({...survey, description: e.target.value})}
              style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', outline: 'none', resize: 'vertical', minHeight: '60px', fontFamily: 'inherit' }}
              placeholder="Mô tả khảo sát"
            />
          </div>

          <p className="survey-flow-note">Thêm “Chia phần” trước nhóm câu hỏi. Với các nhánh riêng, đặt “Sau phần này” để chuyển đến phần chung hoặc hoàn tất, tránh đi tiếp sang nhánh khác.</p>
          {fields.map((field, index) => (
            <div key={field.id} className={`builder-field-card ${field.type === 'section' ? 'builder-section-card' : ''}`}>
              <div style={{ display: 'flex', justifyContent: 'center', padding: '0.25rem', color: 'var(--text-muted)', cursor: 'grab' }}>
                <Icon name="menu" />
              </div>
              <div style={{ padding: '1rem 1.5rem 1.5rem' }}>
                <div className="flex-between" style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-tertiary)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem' }}>
                    {FIELD_TYPES.find(t => t.id === field.type)?.icon} 
                    {FIELD_TYPES.find(t => t.id === field.type)?.label}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn-icon btn-ghost" onClick={() => moveField(index, -1)} disabled={index === 0}>↑</button>
                    <button className="btn-icon btn-ghost" onClick={() => moveField(index, 1)} disabled={index === fields.length - 1}>↓</button>
                    <button className="btn-icon btn-ghost" style={{ color: 'var(--danger)' }} aria-label="Xóa câu hỏi" onClick={() => removeField(field.id)}><Icon name="close" /></button>
                  </div>
                </div>

                <div className="form-group">
                  <input
                    type="text"
                    className="form-input"
                    value={field.label}
                    onChange={e => updateField(field.id, { label: e.target.value })}
                    placeholder={field.type === 'section' ? 'Tên phần' : 'Câu hỏi'}
                    style={{ fontSize: '1.1rem', fontWeight: 500, padding: '1rem' }}
                  />
                </div>

                <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                  {/* Field Specific Options */}
                  {field.type === 'section' && <label className="form-label">Mô tả phần
                    <textarea className="form-textarea" value={field.description || ''} onChange={e => updateField(field.id, { description: e.target.value })} />
                  </label>}
                  {['short_text', 'long_text', 'date', 'phone', 'email'].includes(field.type) && (
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Placeholder (Tùy chọn)</label>
                      <input type="text" className="form-input" value={field.placeholder || ''} onChange={e => updateField(field.id, { placeholder: e.target.value })} placeholder="Ví dụ: Nhập câu trả lời của bạn..." />
                    </div>
                  )}

                  {['multiple_choice', 'checkbox', 'dropdown'].includes(field.type) && (
                    <div>
                      <label className="form-label">Tùy chọn</label>
                      {field.options.map((opt, oIdx) => (
                        <div key={oIdx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px' }}>
                            {field.type === 'multiple_choice' ? <Icon name="radio" /> : field.type === 'checkbox' ? <Icon name="check-square" /> : `${oIdx + 1}.`}
                          </span>
                          <input 
                            type="text" 
                            className="form-input" 
                            style={{ padding: '8px' }}
                            value={opt}
                            onChange={e => {
                              const newOpts = [...field.options];
                              newOpts[oIdx] = e.target.value;
                              updateField(field.id, { options: newOpts, rules: (field.rules || []).map(rule => rule.value === opt ? { ...rule, value: e.target.value } : rule) });
                            }}
                          />
                          <button className="btn-icon btn-ghost" onClick={() => {
                            if (field.options.length <= 1) return;
                            updateField(field.id, { options: field.options.filter((_, i) => i !== oIdx), rules: (field.rules || []).filter(rule => rule.value !== opt) });
                          }}><Icon name="close" /></button>
                        </div>
                      ))}
                      <button className="btn-ghost" style={{ fontSize: '0.875rem', marginTop: '0.5rem', padding: '0.25rem' }} onClick={() => updateField(field.id, { options: [...field.options, `Tùy chọn ${field.options.length + 1}`] })}>
                        + Thêm tùy chọn
                      </button>
                    </div>
                  )}

                  {field.type === 'rating' && (
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Thang điểm tối đa</label>
                      <select className="form-select" value={field.max} onChange={e => updateField(field.id, { max: parseInt(e.target.value) })}>
                        {[3, 4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n} Sao</option>)}
                      </select>
                    </div>
                  )}

                  {field.type === 'linear_scale' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center' }}>Từ</span>
                          <select className="form-select" style={{ width: '80px', padding: '8px' }} value={field.min} onChange={e => updateField(field.id, { min: parseInt(e.target.value) })}>
                            <option value="0">0</option>
                            <option value="1">1</option>
                          </select>
                        </div>
                        <input type="text" className="form-input" placeholder="Nhãn tối thiểu" value={field.minLabel} onChange={e => updateField(field.id, { minLabel: e.target.value })} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center' }}>Đến</span>
                          <select className="form-select" style={{ width: '80px', padding: '8px' }} value={field.max} onChange={e => updateField(field.id, { max: parseInt(e.target.value) })}>
                            {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </div>
                        <input type="text" className="form-input" placeholder="Nhãn tối đa" value={field.maxLabel} onChange={e => updateField(field.id, { maxLabel: e.target.value })} />
                      </div>
                    </div>
                  )}
                </div>

                <SurveyLogicEditor field={field} fields={fields} index={index} onChange={updates => updateField(field.id, updates)} />
                {field.type !== 'section' && <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '1.5rem', paddingTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                    <span style={{ fontWeight: 500 }}>Bắt buộc trả lời</span>
                    <div style={{ position: 'relative', width: '40px', height: '24px', background: field.required ? 'var(--accent-primary)' : 'var(--bg-tertiary)', borderRadius: '12px', transition: '0.3s' }}>
                      <div style={{ position: 'absolute', top: '2px', left: field.required ? '18px' : '2px', width: '20px', height: '20px', background: '#fff', borderRadius: '50%', transition: '0.3s' }}></div>
                    </div>
                    <input type="checkbox" style={{ display: 'none' }} checked={field.required} onChange={e => updateField(field.id, { required: e.target.checked })} />
                  </label>
                </div>}
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', margin: '2rem 0' }}>
            <button className="btn btn-primary btn-lg" onClick={() => setShowFieldPicker(true)} style={{ borderRadius: '50px', padding: '12px 24px', boxShadow: 'var(--shadow-md)' }}>
              + Thêm câu hỏi mới
            </button>
            <button className="btn btn-secondary" onClick={() => handleAddField('section')}>+ Chia phần</button>
          </div>
        </div>

        {/* RIGHT PANEL - PREVIEW */}
        <div className="preview-panel">
          <div className="preview-header">
            <h2 id="survey-preview-heading" style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0, color: 'var(--text-secondary)' }}><Icon name="eye" /> Xem trước (Live Preview)</h2>
          </div>
          
          <div className="preview-scroll" role="region" aria-labelledby="survey-preview-heading" tabIndex={0}>
          <div className="preview-form" style={{ background: 'var(--bg-primary)', padding: '2rem 1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>{survey.title || 'Tiêu đề khảo sát'}</h1>
            {survey.description && <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', whiteSpace: 'pre-wrap' }}>{survey.description}</p>}
            
            <SurveyFlowPreview key={JSON.stringify(fields)} fields={fields} />

          </div>
          </div>
        </div>
      </div>

      <Modal isOpen={showFieldPicker} onClose={() => setShowFieldPicker(false)} title="Chọn loại câu hỏi" size="md">
        <div className="field-type-selector">
          {FIELD_TYPES.map(type => (
            <button key={type.id} className="btn btn-secondary" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1.5rem', height: 'auto', background: 'var(--bg-primary)' }} onClick={() => handleAddField(type.id)}>
              <span style={{ display: 'flex' }}>{type.icon}</span>
              <span style={{ fontWeight: 500 }}>{type.label}</span>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
