'use client';

import { useCallback, useState } from 'react';
import useRemoteData from '@/hooks/useRemoteData';
import { downloadCsv } from '@/lib/downloadCsv';
import { useToast } from './Toast';
import Icon from './Icon';

export default function RecallBookings({ formId }) {
  const { addToast } = useToast();
  const [exporting, setExporting] = useState(false);
  const load = useCallback(async signal => {
    const response = await fetch(`/api/recall/${formId}`, { signal });
    if (!response.ok) throw new Error('Không thể tải đăng ký.');
    return response.json();
  }, [formId]);
  const { data, loading, error, refresh } = useRemoteData(load, null, 'Không thể tải danh sách đăng ký.');
  const exportData = async () => {
    setExporting(true);
    try { await downloadCsv(`/api/recall/${formId}?format=csv`, 'recall'); }
    catch (error) { addToast(error.message, 'error'); }
    finally { setExporting(false); }
  };
  if (loading) return <p role="status">Đang tải đăng ký…</p>;
  if (error || !data) return <button className="btn btn-secondary" onClick={refresh}>Tải lại danh sách</button>;
  return <>
    <div className="recall-section-title"><p>{data.bookings.length} đăng ký · Giờ Việt Nam</p><button className="btn btn-secondary btn-sm" onClick={exportData} disabled={exporting || !data.bookings.length}><Icon name="download" /> {exporting ? 'Đang xuất…' : 'Xuất CSV'}</button></div>
    {data.bookings.length === 0 ? <p className="empty-state">Chưa có người đăng ký qua link này.</p> : <div className="recall-table-wrap"><table className="data-table"><thead><tr><th>Tên</th><th>Số điện thoại</th><th>Ngày đăng ký</th><th>Giờ đăng ký</th></tr></thead><tbody>{data.bookings.map(booking => <tr key={booking.id}><td>{booking.name}</td><td>{booking.phone}</td><td>{booking.starts_at.slice(0,10).split('-').reverse().join('/')}</td><td>{booking.starts_at.slice(11)}</td></tr>)}</tbody></table></div>}
  </>;
}
