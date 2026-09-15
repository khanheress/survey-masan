'use client';
import { useId } from 'react';
export default function SurveyQuestions({ flow, answers, onChange }) {
  const groupId = useId();
  const handleAnswerChange = (id, value, checkbox = false) => {
    const selected = Array.isArray(answers[id]) ? answers[id] : [];
    onChange(id, checkbox ? (selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value]) : value);
  };
  return <div className="survey-questions">
          {/* Dynamic Fields */}
          {flow.visible.map((field, index) => field.type === 'section' ? (
            <section key={field.id} className="survey-section-heading"><h2>{field.label}</h2>{field.description && <p>{field.description}</p>}</section>
          ) : (
            <div key={field.id} className="card" style={{ marginBottom: '1.5rem', background: 'var(--bg-secondary)' }}>
              <label className="form-label" style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
                {flow.visible.slice(0, index + 1).filter(item => item.type !== 'section').length}. {field.label} {(field.required || Boolean(field.rules?.length)) && <span style={{ color: 'var(--danger)' }}>*</span>}
              </label>

              {['short_text', 'phone', 'email'].includes(field.type) && (
                <input 
                  type={field.type === 'phone' ? 'tel' : field.type === 'email' ? 'email' : 'text'} 
                  className="form-input" 
                  placeholder={field.placeholder || 'Nhập câu trả lời...'} 
                  value={answers[field.id] || ''}
                  onChange={e => handleAnswerChange(field.id, e.target.value)}
                  required={field.required || Boolean(field.rules?.length)}
                />
              )}
              
              {field.type === 'date' && (
                <input 
                  type="date"
                  className="form-input" 
                  value={answers[field.id] || ''}
                  onChange={e => handleAnswerChange(field.id, e.target.value)}
                  required={field.required || Boolean(field.rules?.length)}
                />
              )}

              {field.type === 'long_text' && (
                <textarea 
                  className="form-textarea" 
                  placeholder={field.placeholder || 'Nhập câu trả lời...'}
                  value={answers[field.id] || ''}
                  onChange={e => handleAnswerChange(field.id, e.target.value)}
                  required={field.required || Boolean(field.rules?.length)}
                ></textarea>
              )}

              {field.type === 'multiple_choice' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {field.options.map((opt, i) => (
                    <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.5rem', borderRadius: 'var(--radius-sm)', transition: 'background 0.2s' }} className="hover:bg-glass">
                      <input 
                        type="radio" 
                        name={`${groupId}_${field.id}`}
                        className="form-radio" 
                        checked={answers[field.id] === opt}
                        onChange={() => handleAnswerChange(field.id, opt)}
                        required={field.required || Boolean(field.rules?.length) && !answers[field.id]}
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

                </div>
              )}

              {field.type === 'dropdown' && (
                <select 
                  className="form-select" 
                  value={answers[field.id] || ''}
                  onChange={e => handleAnswerChange(field.id, e.target.value)}
                  required={field.required || Boolean(field.rules?.length)}
                >
                  <option value="" disabled>Chọn một tùy chọn</option>
                  {field.options.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                </select>
              )}

              {field.type === 'rating' && (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {Array(field.max ?? 5).fill(0).map((_, i) => (
                    <button 
                      key={i}
                      type="button"
                      aria-label={`${i + 1} sao`}
                      aria-pressed={answers[field.id] === i + 1}
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
                      {Array.from({ length: (field.max ?? 5) - (field.min ?? 1) + 1 }, (_, i) => (field.min ?? 1) + i).map(n => (
                        <div key={n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{n}</span>
                          <button 
                            type="button"
                            aria-label={`Mức ${n}`}
                            aria-pressed={answers[field.id] === n}
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

    {flow.status === 'pending' && <p role="status" className="survey-flow-note">Chọn câu trả lời ở trên để tiếp tục khảo sát.</p>}
  </div>;
}
