'use client';

import Icon from '@/components/Icon';
import RespondentFields from '@/components/RespondentFields';
import { validateRespondent } from '@/lib/respondent.mjs';

import React, { useState, useEffect } from 'react';
import SurveyQuestions from '@/components/SurveyQuestions';
import { evaluateSurvey, changeSurveyAnswer, validateSurveyAnswers } from '@/lib/surveyFlow.mjs';

export default function PublicSurveyPage({ params }) {
  const { token } = React.use(params);

  
  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('open'); // 'open', 'closed', 'submitted'
  const [submitting, setSubmitting] = useState(false);
  const [closedDetails, setClosedDetails] = useState(null);
  
  // Form state
  const [respondentInfo, setRespondentInfo] = useState({});
  const [answers, setAnswers] = useState({});
  const [endMessage, setEndMessage] = useState('');
  const flow = evaluateSurvey(survey?.fields_json || [], answers);

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

  const handleAnswerChange = (fieldId, value) => {
    const next = changeSurveyAnswer(survey.fields_json, answers, fieldId, value);
    setAnswers(next);
    const nextFlow = evaluateSurvey(survey.fields_json, next);
    if (nextFlow.status === 'screenout') {
      setEndMessage(nextFlow.message);
      setStatus('screenout');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const profile = validateRespondent(respondentInfo);
    if (profile.error) {
      alert(profile.error);
      return;
    }

    const checked = validateSurveyAnswers(survey.fields_json || [], answers);
    if (checked.error) { alert(checked.error); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          survey_id: survey.id,
          project_id: survey.project_id,
          ...profile.values,
          answers_json: checked.answers
        })
      });
      
      if (res.ok) {
        setStatus('submitted');
      } else {
        const errData = await res.json();
        if (errData.reason === 'screenout') { setEndMessage(errData.error); setStatus('screenout'); }
        else alert(errData.error || 'Có lỗi xảy ra khi gửi phản hồi');
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

  if (status === 'screenout') {
    return <div className="public-form-container"><div className="public-form-card" role="status">
      <h1>Khảo sát đã kết thúc</h1><p>{endMessage}</p>
    </div></div>;
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
          {flow.error && <p role="alert">Cấu hình khảo sát cần được người tạo kiểm tra lại.</p>}
          <RespondentFields values={respondentInfo} onChange={(key, value) => setRespondentInfo(previous => ({ ...previous, [key]: value }))} />

          <SurveyQuestions flow={flow} answers={answers} onChange={handleAnswerChange} />

          <div style={{ marginTop: '3rem', textAlign: 'center' }}>
            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', maxWidth: '300px', borderRadius: '50px', padding: '16px', fontSize: '1.1rem', fontWeight: 600 }} disabled={submitting || flow.status !== 'complete'}>
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
