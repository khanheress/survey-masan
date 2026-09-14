'use client';

import Icon from '@/components/Icon';
import RespondentFields from '@/components/RespondentFields';
import { validateRespondent } from '@/lib/respondent.mjs';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PublicSurveyPage({ params }) {
  const { token } = React.use(params);
  const router = useRouter();
  
  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('open'); // 'open', 'closed', 'submitted'
  const [submitting, setSubmitting] = useState(false);
  const [closedDetails, setClosedDetails] = useState(null);
  
  // Form state
  const [respondentInfo, setRespondentInfo] = useState({});
  const [answers, setAnswers] = useState({});

  useEffect(() => {
    const fetchSurvey = async () => {
      try {
        const res = await fetch(`/api/public/surveys/${token}`);
        if (res.ok) {
          const data = await res.json();
          setSurvey(data);
          
          // Check if closed based on project status or max_responses (assuming API handles some of this, but we can do client side checks if needed)
          if (data.project_status !== 'active') {
             setStatus('closed');
          }
          
          // Initialize answers state with defaults based on fields
          const initialAnswers = {};
          if (data.fields_json) {
            data.fields_json.forEach(field => {
              if (field.type === 'checkbox') initialAnswers[field.id] = [];
              else initialAnswers[field.id] = '';
            });
            setAnswers(initialAnswers);
          }
        } else {
          const errData = await res.json();
          if (res.status === 410) {
            setClosedDetails(errData);
            setStatus('closed');
          }
          else setError(errData.error || 'Không tìm thấy khảo sát');
        }
      } catch (err) {
        setError('Lỗi kết nối. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSurvey();
  }, [token]);

  const handleAnswerChange = (fieldId, value, isCheckbox = false) => {
    setAnswers(prev => {
      if (isCheckbox) {
        const current = prev[fieldId] || [];
        if (current.includes(value)) {
          return { ...prev, [fieldId]: current.filter(v => v !== value) };
        } else {
          return { ...prev, [fieldId]: [...current, value] };
        }
      }
      return { ...prev, [fieldId]: value };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const profile = validateRespondent(respondentInfo);
    if (profile.error) {
      alert(profile.error);
      return;
    }

    // Validate required fields
    if (survey.fields_json) {
      for (const field of survey.fields_json) {
        if (field.required) {
          const ans = answers[field.id];
          if (!ans || (Array.isArray(ans) && ans.length === 0)) {
            alert(`Vui lòng trả lời câu hỏi: ${field.label}`);
            return;
          }
        }
      }
    }
    
    setSubmitting(true);
    try {
      const res = await fetch('/api/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          survey_id: survey.id,
          project_id: survey.project_id,
          ...profile.values,
          answers_json: answers
        })
      });
      
      if (res.ok) {
        setStatus('submitted');
      } else {
        const errData = await res.json();
        alert(errData.error || 'Có lỗi xảy ra khi gửi phản hồi');
      }
    } catch (err) {
      alert('Lỗi kết nối. Vui lòng thử lại sau.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="public-form-container">
        <div className="public-form-card flex-center" style={{ minHeight: '400px' }}>
          <div className="spinner" style={{ width: '48px', height: '48px', borderWidth: '4px' }}></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="public-form-container">
        <div className="public-form-card flex-center flex-col animate-fadeIn">
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}><Icon name="alert" /></div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>Lỗi</h2>
          <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
        </div>
      </div>
    );
  }

  if (status === 'closed') {
    return (
      <div className="public-form-container">
        <div className="public-form-card form-closed animate-fadeIn">
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}><Icon name="lock" /></div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-primary)' }}>{closedDetails?.reason === 'not_started' ? 'Khảo sát chưa bắt đầu' : closedDetails?.reason === 'invalid_schedule' ? 'Khảo sát chưa sẵn sàng' : 'Khảo sát đã đóng'}</h2>
          <p>{closedDetails?.message || 'Cảm ơn sự quan tâm của bạn. Khảo sát này hiện không còn nhận thêm phản hồi.'}</p>
        </div>
      </div>
    );
  }

  if (status === 'submitted') {
    return (
      <div className="public-form-container">
        <div className="public-form-card form-success animate-fadeIn">
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '50%', background: '#f0fdf4', color: 'var(--success)', fontSize: '3rem', marginBottom: '1.5rem' }}>
            <Icon name="check" size={20} />
          </div>
          <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>Cảm ơn bạn!</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Phản hồi của bạn đã được ghi nhận.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="public-form-container">
      <div className="public-form-card animate-slideUp">
        <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
          {survey.project_name && (
            <div style={{ display: 'inline-block', background: 'var(--bg-tertiary)', padding: '4px 12px', borderRadius: '50px', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', fontWeight: 500 }}>
              Dự án: {survey.project_name}
            </div>
          )}
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, marginBottom: '1rem', background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {survey.title}
          </h1>
          {survey.description && (
            <p style={{ color: 'var(--text-primary)', fontSize: '1.1rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {survey.description}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <RespondentFields values={respondentInfo} onChange={(key, value) => setRespondentInfo(previous => ({ ...previous, [key]: value }))} />

          {/* Dynamic Fields */}
          {(survey.fields_json || []).map((field, index) => (
            <div key={field.id} className="card" style={{ marginBottom: '1.5rem', background: 'var(--bg-secondary)' }}>
              <label className="form-label" style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
                {index + 1}. {field.label} {field.required && <span style={{ color: 'var(--danger)' }}>*</span>}
              </label>

              {['short_text', 'phone', 'email'].includes(field.type) && (
                <input 
                  type={field.type === 'phone' ? 'tel' : field.type === 'email' ? 'email' : 'text'} 
                  className="form-input" 
                  placeholder={field.placeholder || 'Nhập câu trả lời...'} 
                  value={answers[field.id] || ''}
                  onChange={e => handleAnswerChange(field.id, e.target.value)}
                  required={field.required}
                />
              )}
              
              {field.type === 'date' && (
                <input 
                  type="date"
                  className="form-input" 
                  value={answers[field.id] || ''}
                  onChange={e => handleAnswerChange(field.id, e.target.value)}
                  required={field.required}
                />
              )}

              {field.type === 'long_text' && (
                <textarea 
                  className="form-textarea" 
                  placeholder={field.placeholder || 'Nhập câu trả lời...'}
                  value={answers[field.id] || ''}
                  onChange={e => handleAnswerChange(field.id, e.target.value)}
                  required={field.required}
                ></textarea>
              )}

              {field.type === 'multiple_choice' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {field.options.map((opt, i) => (
                    <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.5rem', borderRadius: 'var(--radius-sm)', transition: 'background 0.2s' }} className="hover:bg-glass">
                      <input 
                        type="radio" 
                        name={`field_${field.id}`}
                        className="form-radio" 
                        checked={answers[field.id] === opt}
                        onChange={() => handleAnswerChange(field.id, opt)}
                        required={field.required && !answers[field.id]}
                      />
                      <span style={{ fontSize: '1rem' }}>{opt}</span>
                    </label>
                  ))}
                </div>
              )}

              {field.type === 'checkbox' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {field.options.map((opt, i) => (
                    <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.5rem', borderRadius: 'var(--radius-sm)', transition: 'background 0.2s' }} className="hover:bg-glass">
                      <input 
                        type="checkbox" 
                        className="form-checkbox" 
                        checked={(answers[field.id] || []).includes(opt)}
                        onChange={() => handleAnswerChange(field.id, opt, true)}
                      />
                      <span style={{ fontSize: '1rem' }}>{opt}</span>
                    </label>
                  ))}
                  {field.required && (answers[field.id] || []).length === 0 && (
                    <input type="checkbox" style={{ display: 'none' }} required /> // Hidden input just for HTML5 validation if needed, though we do manual
                  )}
                </div>
              )}

              {field.type === 'dropdown' && (
                <select 
                  className="form-select" 
                  value={answers[field.id] || ''}
                  onChange={e => handleAnswerChange(field.id, e.target.value)}
                  required={field.required}
                >
                  <option value="" disabled>Chọn một tùy chọn</option>
                  {field.options.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                </select>
              )}

              {field.type === 'rating' && (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {Array(field.max || 5).fill(0).map((_, i) => (
                    <button 
                      key={i}
                      type="button"
                      onClick={() => handleAnswerChange(field.id, i + 1)}
                      style={{ 
                        background: 'none', border: 'none', fontSize: '2rem', cursor: 'pointer', 
                        color: answers[field.id] > i ? 'var(--warning)' : 'var(--bg-tertiary)',
                        transition: 'color 0.2s'
                      }}
                    >
                      ★
                    </button>
                  ))}
                </div>
              )}

              {field.type === 'linear_scale' && (
                <div style={{ overflowX: 'auto', paddingBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', minWidth: 'max-content' }}>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{field.minLabel}</span>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      {Array.from({ length: (field.max || 5) - (field.min || 1) + 1 }, (_, i) => (field.min || 1) + i).map(n => (
                        <div key={n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{n}</span>
                          <button 
                            type="button"
                            onClick={() => handleAnswerChange(field.id, n)}
                            style={{ 
                              width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', transition: 'all 0.2s',
                              background: answers[field.id] === n ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                              border: answers[field.id] === n ? 'none' : '1px solid var(--border-color)',
                              boxShadow: answers[field.id] === n ? 'var(--shadow-glow)' : 'none'
                            }}
                          ></button>
                        </div>
                      ))}
                    </div>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{field.maxLabel}</span>
                  </div>
                </div>
              )}
            </div>
          ))}

          <div style={{ marginTop: '3rem', textAlign: 'center' }}>
            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', maxWidth: '300px', borderRadius: '50px', padding: '16px', fontSize: '1.1rem', fontWeight: 600 }} disabled={submitting}>
              {submitting ? <span className="spinner"></span> : 'Gửi Phản Hồi'}
            </button>
          </div>
        </form>
        
        <div style={{ textAlign: 'center', marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Powered by <strong style={{ color: 'var(--text-secondary)' }}>SurveyPro</strong>
        </div>
      </div>
    </div>
  );
}
