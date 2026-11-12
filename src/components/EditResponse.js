'use client';

import { useState } from 'react';
import Modal from '@/components/Modal';
import { RESPONDENT_FIELDS } from '@/lib/respondent.mjs';

const fields = [...RESPONDENT_FIELDS, { key: 'respondent_email', label: 'Email', type: 'email', maxLength: 254 }];

export default function EditResponse({ response, onClose, onSaved }) {
  const [values, setValues] = useState(() => Object.fromEntries(fields.map(field => [field.key, response[field.key] ?? ''])));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save(event) {
    event.preventDefault();
    if (busy) return;
    const changes = Object.fromEntries(fields.filter(field => String(values[field.key]) !== String(response[field.key] ?? '')).map(field => [field.key, values[field.key]]));
    if (!Object.keys(changes).length) { onClose(); return; }
    setBusy(true); setError('');
    try {
      const res = await fetch(`/api/responses/${encodeURIComponent(response.id)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(changes),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Không thể cập nhật phản hồi.');
      onSaved({ ...response, ...result.profile });
    } catch (error) { setError(error.message); }
    finally { setBusy(false); }
  }
  return (
    <Modal isOpen onClose={() => { if (!busy) onClose(); }} title="Sửa thông tin người trả lời" size="lg">
      <form onSubmit={save}>
        <p className="form-hint">Thay đổi áp dụng cho phản hồi này. Hồ sơ chung được chỉnh sửa riêng tại Quản lý data.</p>
        <div className="respondent-grid">
          {fields.map(field => (
            <label className="form-label" key={field.key}>
              {field.label}
              {field.options ? (
                <select className="form-select" value={values[field.key]} disabled={busy} onChange={event => setValues({ ...values, [field.key]: event.target.value })}>
                  <option value="">Chưa cung cấp</option>
                  {values[field.key] && !field.options.includes(values[field.key]) && <option value={values[field.key]}>{values[field.key]} (đã lưu)</option>}
                  {field.options.map(option => <option key={option}>{option}</option>)}
                </select>
              ) : (
                <input className="form-input" type={field.type} maxLength={field.maxLength}
                  min={field.type === 'number' ? 1900 : undefined} max={field.type === 'number' ? new Date().getFullYear() : undefined}
                  step={field.type === 'number' ? 1 : undefined} value={values[field.key]} disabled={busy}
                  onChange={event => setValues({ ...values, [field.key]: event.target.value })} />
              )}
            </label>
          ))}
        </div>
        {error && <p role="alert" style={{ color: 'var(--danger)' }}>{error}</p>}
        <div className="flex gap-2" style={{ marginTop: 20 }}>
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={onClose}>Hủy</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu thay đổi'}</button>
        </div>
      </form>
    </Modal>
  );
}
