'use client';

import { RESPONDENT_FIELDS } from '@/lib/respondent.mjs';

export default function RespondentFields({ values = {}, onChange, disabled = false }) {
  return (
    <fieldset className="respondent-fields" disabled={disabled}>
      <legend>Thông tin người tham gia</legend>
      <p className="form-hint">Vui lòng điền đầy đủ các mục có dấu <span className="required-mark">*</span>.</p>
      <div className="respondent-grid">
        {RESPONDENT_FIELDS.map(field => (
          <div className="form-group" key={field.key}>
            <label className="form-label" htmlFor={field.key}>{field.label} <span className="required-mark">*</span></label>
            {field.type === 'select' ? (
              <select id={field.key} name={field.key} className="form-select" required value={values[field.key] || ''} onChange={event => onChange?.(field.key, event.target.value)}>
                <option value="" disabled>Chọn {field.label.toLowerCase()}</option>
                {field.options.map(option => <option key={option} value={option}>{option}</option>)}
              </select>
            ) : (
              <input id={field.key} name={field.key} className="form-input" type={field.type} placeholder={field.placeholder}
                autoComplete={field.autoComplete} maxLength={field.maxLength} required
                min={field.type === 'number' ? 1900 : undefined} max={field.type === 'number' ? new Date().getFullYear() : undefined}
                step={field.type === 'number' ? 1 : undefined} value={values[field.key] ?? ''}
                onChange={event => onChange?.(field.key, event.target.value)} />
            )}
          </div>
        ))}
      </div>
    </fieldset>
  );
}
