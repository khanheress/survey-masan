'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Modal from '@/components/Modal';
import Icon from '@/components/Icon';
import { useToast } from '@/components/Toast';

export default function DeleteSurvey({ survey, onDeleted }) {
  const { data: session } = useSession();
  const { addToast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (session?.user?.role !== 'admin') return null;

  async function remove() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/surveys/${encodeURIComponent(survey.id)}`, { method: 'DELETE' });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Không thể xóa khảo sát.');
      }
      setOpen(false);
      addToast('Đã xóa khảo sát', 'success');
      onDeleted();
    } catch {
      setError('Không thể xóa khảo sát. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  }

  return <>
    <button className="btn btn-danger" aria-label={`Xóa khảo sát ${survey.title}`} onClick={() => { setError(''); setOpen(true); }}>
      <Icon name="trash" /> Xóa khảo sát
    </button>
    <Modal isOpen={open} onClose={() => { if (!busy) setOpen(false); }} title="Xóa khảo sát" size="sm">
      <p>Bạn muốn xóa khảo sát <strong>{survey.title}</strong>?</p>
      <p style={{ marginTop: 12 }}>Toàn bộ câu hỏi và phản hồi của khảo sát này sẽ bị xóa; link khảo sát sẽ ngừng hoạt động. Thao tác không thể hoàn tác.</p>
      <p style={{ marginTop: 12 }}>Hồ sơ và lịch sử trong Quản lý data vẫn được giữ lại.</p>
      {error && <p role="alert" style={{ color: 'var(--danger)', marginTop: 12 }}>{error}</p>}
      <div className="flex gap-2" style={{ marginTop: 20, flexWrap: 'wrap' }}>
        <button className="btn btn-secondary" disabled={busy} onClick={() => setOpen(false)}>Hủy</button>
        <button className="btn btn-danger" disabled={busy} onClick={remove}>{busy ? 'Đang xóa…' : 'Xác nhận xóa khảo sát'}</button>
      </div>
    </Modal>
  </>;
}
