'use client';

import { use, useEffect, useState } from 'react';
import Icon from '@/components/Icon';

const formatDate = value => value.split('-').reverse().join('/');

function RecallRegistration({ token }) {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/public/recall/${token}`, { signal: controller.signal, cache: 'no-store' });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Không thể tải form.');
        if (!controller.signal.aborted) setForm(result);
      } catch (error) {
        if (!controller.signal.aborted) setLoadError(error.message);
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    load();
    return () => controller.abort();
  }, [token]);

  const submit = async event => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch(`/api/public/recall/${token}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, phone, starts_at: slot }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || 'Không thể đăng ký. Vui lòng thử lại.');
        if (response.status === 409) {
          setSlot('');
          const latest = await fetch(`/api/public/recall/${token}`, { cache: 'no-store' });
          if (latest.ok) setForm(await latest.json());
        }
        return;
      }
      setReceipt(result);
    } catch { setError('Lỗi kết nối. Vui lòng thử lại.'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="public-form-card" role="status">Đang tải Form Recall…</div>;
  if (loadError) return <div className="public-form-card form-closed"><Icon name="calendar" size={24} /><h1 style={{ fontSize: '1.5rem', margin: '1rem 0' }}>Không thể mở đăng ký</h1><p role="alert">{loadError}</p></div>;
  if (receipt) return <div className="public-form-card form-success"><Icon name="check" size={24} /><h1 style={{ fontSize: '1.5rem', margin: '1rem 0' }}>Đăng ký thành công</h1><p>{receipt.title}</p><p className="recall-receipt">{formatDate(receipt.starts_at.slice(0,10))} · {receipt.starts_at.slice(11)}</p><p className="form-hint">Giờ Việt Nam (UTC+7). Vui lòng lưu lại lịch hẹn này.</p></div>;
  const dates = [...new Set(form.slots.map(item => item.starts_at.slice(0,10)))];
  const anyAvailable = form.slots.some(item => item.available);
  const times = form.slots.filter(item => item.starts_at.startsWith(`${date}T`));
  const selectedAvailable = form.slots.some(item => item.starts_at === slot && item.available);

  return <div className="public-form-card">
    <span className="badge badge-completed">Form Recall</span><h1 className="recall-public-title">{form.title}</h1>
    {form.project_name&&<p className="form-hint">Dự án: {form.project_name}</p>}{form.description && <p className="recall-description">{form.description}</p>}
    <p className="form-hint">Điền thông tin và chọn lịch hẹn. Các mục có dấu * là bắt buộc. Giờ Việt Nam (UTC+7).</p>
    {!anyAvailable && <p className="recall-error" role="status">Hiện không còn khung giờ khả dụng. Vui lòng liên hệ người tạo form.</p>}
    {error && <p className="recall-error" role="alert">{error}</p>}
    <form onSubmit={submit}>
      <fieldset className="recall-fieldset" disabled={submitting || !anyAvailable}>
        <div className="form-group"><label className="form-label" htmlFor="recall-name">Tên *</label><input id="recall-name" className="form-input" autoComplete="name" required maxLength={200} value={name} onChange={event => setName(event.target.value)} placeholder="Nhập họ và tên" /></div>
        <div className="form-group"><label className="form-label" htmlFor="recall-phone">Số điện thoại *</label><input id="recall-phone" className="form-input" type="tel" autoComplete="tel" required maxLength={30} value={phone} onChange={event => setPhone(event.target.value)} placeholder="Nhập số điện thoại" /></div>
        <div className="grid-cols-2">
          <div className="form-group"><label className="form-label" htmlFor="recall-date">Ngày đăng ký *</label><select id="recall-date" className="form-select" required value={date} onChange={event => { setDate(event.target.value); setSlot(''); }}><option value="" disabled>Chọn ngày</option>{dates.map(day => <option key={day} value={day} disabled={!form.slots.some(item => item.starts_at.startsWith(`${day}T`) && item.available)}>{formatDate(day)}</option>)}</select></div>
          <div className="form-group"><label className="form-label" htmlFor="recall-time">Giờ đăng ký *</label><select id="recall-time" className="form-select" required disabled={!date} value={slot} onChange={event => setSlot(event.target.value)}><option value="" disabled>Chọn giờ</option>{times.map(item => <option key={item.starts_at} value={item.starts_at} disabled={!item.available}>{item.starts_at.slice(11)}{!item.available ? ' — Không còn khả dụng' : ''}</option>)}</select></div>
        </div>
        <p className="form-hint">{form.allow_overlap ? 'Khung giờ có thể có nhiều người đăng ký.' : 'Mỗi khung giờ chỉ nhận một người. Giờ đã được chọn sẽ không nhận thêm đăng ký.'}</p>
      </fieldset>
      <button className="btn btn-primary" style={{ width: '100%' }} disabled={submitting || !selectedAvailable}>{submitting ? 'Đang gửi…' : 'Xác nhận đăng ký'}</button>
    </form>
  </div>;
}

export default function RecallPage({ params }) {
  const { token } = use(params);
  return <main className="public-form-container"><RecallRegistration key={token} token={token} /></main>;
}
