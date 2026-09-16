'use client';

import { useCallback, useState } from 'react';
import Icon from '@/components/Icon';
import {useSession} from 'next-auth/react';
import ImportParticipants from '@/components/ImportParticipants';
import EditParticipant from '@/components/EditParticipant';
import Modal from '@/components/Modal';
import RespondentDetails from '@/components/RespondentDetails';
import { useToast } from '@/components/Toast';
import useRemoteData from '@/hooks/useRemoteData';
import { INVITERS } from '@/lib/respondent.mjs';
import { downloadCsv } from '@/lib/downloadCsv';

const emptyData = { participants: [], projects: [], pagination: { total: 0, page: 1, totalPages: 1 } };
const formatDate = value => new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`).toLocaleString('vi-VN');

export default function DataPage() {
  const { addToast } = useToast();
  const {data:session}=useSession();
  const [importing,setImporting]=useState(false);
  const [editing,setEditing]=useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState({ search: '', project_id: '', inviter: '', page: 1 });
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [exporting, setExporting] = useState(false);
  const query = new URLSearchParams(filters).toString();
  const load = useCallback(async signal => {
    const response = await fetch(`/api/participants?${query}`, { signal });
    if (!response.ok) throw new Error('Không thể tải data');
    return response.json();
  }, [query]);
  const { data, loading, error, refresh } = useRemoteData(load, emptyData, 'Không thể tải danh sách người tham gia');
  const updateFilter = (key, value) => setFilters(previous => ({ ...previous, [key]: value, page: 1 }));

  const exportData = async () => {
    setExporting(true);
    try {
      await downloadCsv(`/api/participants?${query}&format=csv`, 'quan-ly-data');
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div>
          <h1 className="page-title">Quản lý data</h1>
          <p className="data-description">Hồ sơ từ khảo sát, file Excel và các dự án đã tham gia.</p>
        </div>
        <div className="flex gap-2" style={{flexWrap:'wrap'}}>{session?.user?.role==='admin'&&<button className="btn btn-secondary" onClick={()=>setImporting(true)}>Nhập Excel .xlsx</button>}<button className="btn btn-primary" onClick={exportData} disabled={loading || exporting || data.pagination.total === 0}>
          <Icon name="download" /> {exporting ? 'Đang xuất…' : 'Xuất CSV'}
        </button></div>
      </div>

      <form className="card data-filters" onSubmit={event => { event.preventDefault(); updateFilter('search', searchInput.trim()); }}>
        <div>
          <label className="form-label" htmlFor="data-search">Tên hoặc số điện thoại</label>
          <input id="data-search" className="form-input" placeholder="Nhập tên hoặc số điện thoại…" value={searchInput} onChange={event => setSearchInput(event.target.value)} />
        </div>
        <div>
          <label className="form-label" htmlFor="data-project">Dự án đã tham gia</label>
          <select id="data-project" className="form-select" value={filters.project_id} onChange={event => updateFilter('project_id', event.target.value)}>
            <option value="">Tất cả dự án</option>
            {data.projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label" htmlFor="data-inviter">Người mời</label>
          <select id="data-inviter" className="form-select" value={filters.inviter} onChange={event => updateFilter('inviter', event.target.value)}>
            <option value="">Tất cả người mời</option>
            {INVITERS.map(inviter => <option key={inviter}>{inviter}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-primary" type="submit"><Icon name="search" /> Tìm kiếm</button>
          <button className="btn btn-secondary" type="button" title="Xóa bộ lọc" aria-label="Xóa bộ lọc" onClick={() => { setSearchInput(''); setFilters({ search: '', project_id: '', inviter: '', page: 1 }); }}><Icon name="refresh" /></button>
        </div>
      </form>

      <div className="data-list-header">
        <p aria-live="polite">{loading ? 'Đang tải…' : `${data.pagination.total} hồ sơ`}</p>
        <span>Gộp theo số điện thoại · Có thể chỉnh sửa hồ sơ</span>
      </div>

      {loading ? <div className="skeleton" style={{ height: 280 }} /> : error ? (
        <div className="card empty-state"><p>Không thể tải dữ liệu.</p><button className="btn btn-secondary" onClick={refresh}>Thử lại</button></div>
      ) : data.participants.length === 0 ? (
        <div className="card empty-state"><Icon name="database" size={24} /><h2 style={{ fontSize: '1.125rem', margin: '1rem 0 .5rem' }}>Chưa có hồ sơ phù hợp</h2><p>Hồ sơ được thêm từ khảo sát hoặc nhập Excel. Bạn có thể thử thay đổi bộ lọc.</p></div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table participant-table">
              <thead><tr><th>Tên / Số điện thoại</th><th>Năm sinh</th><th>Nghề nghiệp</th><th>Người mời gần nhất</th><th>Dự án đã tham gia</th><th>Gần nhất</th><th>Thao tác</th></tr></thead>
              <tbody>{data.participants.map(person => (
                <tr key={person.id}>
                  <td><strong>{person.respondent_name || 'Chưa có tên'}</strong><div className="data-description">{person.respondent_phone || 'Chưa có số điện thoại'}</div></td>
                  <td>{person.respondent_birth_year || '—'}</td>
                  <td>{person.respondent_occupation || '—'}</td>
                  <td>{person.respondent_inviter || '—'}</td>
                  <td><div className="data-project-tags">{person.projects.map(project => <span className="badge badge-completed" key={project.id || project.name}>{project.name}</span>)}</div></td>
                  <td>{formatDate(person.last_seen)}</td>
                  <td><button className="btn btn-secondary btn-sm" onClick={() => setSelectedPerson(person)} aria-label={`Xem hồ sơ ${person.respondent_name || person.respondent_phone || ''}`}>Xem</button>{session?.user?.role==='admin'&&<button className="btn btn-secondary btn-sm" style={{marginLeft:8}} aria-label={`Sửa hồ sơ ${person.respondent_name || person.respondent_phone || ''}`} onClick={()=>setEditing(person)}>Chỉnh sửa</button>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div className="data-pagination">
            <span>Trang {data.pagination.page} / {data.pagination.totalPages}</span>
            <div className="flex gap-2">
              <button className="btn btn-secondary btn-sm" disabled={data.pagination.page <= 1} onClick={() => setFilters(previous => ({ ...previous, page: data.pagination.page - 1 }))}>Trước</button>
              <button className="btn btn-secondary btn-sm" disabled={data.pagination.page >= data.pagination.totalPages} onClick={() => setFilters(previous => ({ ...previous, page: data.pagination.page + 1 }))}>Sau</button>
            </div>
          </div>
        </div>
      )}

      {importing&&<ImportParticipants onClose={()=>setImporting(false)} onSaved={result=>{refresh();addToast(`Đã nhập ${result.added} hồ sơ`,'success');}}/>}
      {editing&&<EditParticipant person={editing} onClose={()=>setEditing(null)} onSaved={()=>{setEditing(null);setSelectedPerson(null);refresh();addToast('Đã cập nhật hồ sơ','success');}}/>}
      <Modal isOpen={!!selectedPerson} onClose={() => setSelectedPerson(null)} title="Hồ sơ người tham gia" size="lg">
        {selectedPerson && <>
          <RespondentDetails response={{ ...selectedPerson, created_at: selectedPerson.last_seen }} />
          <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>Lịch sử tham gia · {selectedPerson.history.length} lần</h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table"><thead><tr><th>Dự án</th><th>Khảo sát</th><th>Người mời</th><th>Ngày gửi</th></tr></thead>
              <tbody>{selectedPerson.history.map(item => <tr key={item.response_id}><td>{item.project_name}</td><td>{item.survey_title}</td><td>{item.inviter || '—'}</td><td>{formatDate(item.submitted_at)}</td></tr>)}</tbody>
            </table>
          </div>
        </>}
      </Modal>
    </div>
  );
}
