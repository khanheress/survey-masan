'use client';

import { useCallback, useState } from 'react';
import Icon from '@/components/Icon';
import Modal from '@/components/Modal';
import RecallEditor from '@/components/RecallEditor';
import RecallBookings from '@/components/RecallBookings';
import { useToast } from '@/components/Toast';
import useRemoteData from '@/hooks/useRemoteData';

export default function RecallPage() {
  const { addToast } = useToast();
  const [editor, setEditor] = useState(null);
  const [bookingForm, setBookingForm] = useState(null);
  const load = useCallback(async signal => {
    const response = await fetch('/api/recall', { signal });
    if (!response.ok) throw new Error('Không thể tải Form Recall.');
    return response.json();
  }, []);
  const { data: forms, loading, error, refresh } = useRemoteData(load, [], 'Không thể tải Form Recall.');
  const copyLink = async form => {
    try { await navigator.clipboard.writeText(`${window.location.origin}/recall/${form.share_token}`); addToast('Đã sao chép link đăng ký.', 'success'); }
    catch { addToast('Không thể sao chép. Bạn có thể mở form và sao chép địa chỉ trên trình duyệt.', 'error'); }
  };
  return <div className="animate-fadeIn">
    <div className="page-header"><div><h1 className="page-title">Form Recall</h1><p className="data-description">Tạo link đăng ký tên, số điện thoại và lịch hẹn.</p></div><button className="btn btn-primary" onClick={() => setEditor({})}>+ Tạo Form Recall</button></div>
    <div className="recall-section-title"><p>{loading ? 'Đang tải…' : `${forms.length} form`}</p><button className="btn btn-secondary btn-sm" onClick={refresh} disabled={loading}><Icon name="refresh" /> Làm mới</button></div>
    {loading ? <div className="skeleton" style={{ height: 220 }} /> : error ? <p className="recall-error" role="alert">Không thể tải form. Vui lòng bấm Làm mới.</p> : forms.length === 0 ? <div className="card empty-state"><Icon name="calendar" size={24} /><h2 style={{ fontSize: '1.125rem', margin: '1rem 0' }}>Chưa có Form Recall</h2><p>Tạo form, thiết lập ngày giờ rồi gửi link cho người tham gia.</p></div> : <div className="grid-cols-2">
      {forms.map(form => <article className="card recall-card" key={form.id}>
        <div className="flex-between"><span className={`badge ${form.is_open ? 'badge-active' : 'badge-inactive'}`}>{form.is_open ? 'Đang mở đăng ký' : 'Đã đóng đăng ký'}</span><Icon name="calendar" /></div>
        <h2>{form.title}</h2><p className="data-description">{form.description || 'Chưa có mô tả'}</p>
        <div className="recall-metrics"><span>{form.slots.length} khung giờ</span><span>{form.booking_count} đăng ký</span></div>
        <p className="form-hint">{form.allow_overlap ? 'Cho phép nhiều người cùng khung giờ' : 'Mỗi khung giờ chỉ nhận một người'}</p>
        <div className="recall-card-actions"><button className="btn btn-primary btn-sm" onClick={() => copyLink(form)}><Icon name="link" /> Sao chép link</button><a className="btn btn-secondary btn-sm" href={`/recall/${form.share_token}`} target="_blank" rel="noreferrer">Mở form</a><button className="btn btn-secondary btn-sm" onClick={() => setEditor(form)}>Chỉnh sửa</button><button className="btn btn-ghost btn-sm" onClick={() => setBookingForm(form)}>Xem đăng ký ({form.booking_count})</button></div>
      </article>)}
    </div>}
    <Modal isOpen={!!editor} onClose={() => setEditor(null)} title={editor?.id ? 'Chỉnh sửa Form Recall' : 'Tạo Form Recall'} size="lg">
      {editor && <RecallEditor key={editor.id || 'new'} initialForm={editor.id ? editor : null} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); refresh(); addToast('Đã lưu Form Recall.', 'success'); }} />}
    </Modal>
    <Modal isOpen={!!bookingForm} onClose={() => setBookingForm(null)} title={`Đăng ký · ${bookingForm?.title || ''}`} size="lg">{bookingForm && <RecallBookings key={bookingForm.id} formId={bookingForm.id} />}</Modal>
  </div>;
}
