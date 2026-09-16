'use client';

import { useState, useCallback } from 'react';
import useRemoteData from '@/hooks/useRemoteData';
import Icon from './Icon';
import RecallScheduleBuilder from './RecallScheduleBuilder';
import {resolveRecallSchedule} from '@/lib/recallSchedule.mjs';

export default function RecallEditor({ initialForm, onSaved, onClose, projectId, projectName }) {
  const [selectedProject,setSelectedProject]=useState(initialForm?.project_id || (projectId==='unassigned'?'':projectId) || '');
  const loadProjects=useCallback(async signal=>{const res=await fetch('/api/projects',{signal});if(!res.ok)throw Error();return res.json();},[]);
  const {data:projects}=useRemoteData(loadProjects,[],'Không thể tải danh sách dự án.',projectId==='unassigned');
  const [title, setTitle] = useState(initialForm?.title || '');
  const [description, setDescription] = useState(initialForm?.description || '');
  const [allowOverlap, setAllowOverlap] = useState(Boolean(initialForm?.allow_overlap));
  const [isOpen, setIsOpen] = useState(initialForm ? Boolean(initialForm.is_open) : true);
  const [slots, setSlots] = useState(initialForm?.slots.map(slot => ({
    key: slot.starts_at, date: slot.starts_at.slice(0,10), time: slot.starts_at.slice(11), booked: slot.booked_count,
  })) || [{ key: 'initial', date: '', time: '', booked: 0 }]);
  const [mode,setMode]=useState(initialForm&&!initialForm.schedule?'manual':'quick');
  const [schedule,setSchedule]=useState(initialForm?.schedule||{dates:[...new Set((initialForm?.slots||[]).map(s=>s.starts_at.slice(0,10)))],start:'09:40',end:'20:00',interval:20,breaks:[{start:'12:10',end:'12:59'},{start:'18:00',end:'19:00'}]});
  let generated={slots:[],preserved:[]},scheduleError='';
  if(mode==='quick'){try{generated=resolveRecallSchedule(schedule,initialForm?.slots||[]);}catch(e){scheduleError=e.message;}}
  function changeMode(next){if(next==='manual'&&mode==='quick'&&!scheduleError)setSlots(generated.slots.map(value=>({key:value,date:value.slice(0,10),time:value.slice(11),booked:initialForm?.slots.find(s=>s.starts_at===value)?.booked_count||0})));setMode(next);}
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const updateSlot = (key, field, value) => setSlots(previous => previous.map(slot => slot.key === key ? { ...slot, [field]: value } : slot));

  const save = async event => {
    event.preventDefault();
    if(mode==='quick'&&scheduleError){setError(scheduleError);return;}
    setSaving(true);
    setError('');
    try {
      const response = await fetch(initialForm ? `/api/recall/${initialForm.id}` : '/api/recall', {
        method: initialForm ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id:selectedProject, title, description, allow_overlap: allowOverlap, is_open: isOpen, schedule:mode==='quick'?schedule:null, slots:mode==='quick'?generated.slots:slots.map(slot => `${slot.date}T${slot.time}`) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Không thể lưu form.');
      onSaved(result);
    } catch (error) {
      setError(error.message);
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={save}>
      {error && <p className="recall-error" role="alert">{error}</p>}
      <fieldset className="recall-fieldset" disabled={saving}>
        {projectId==='unassigned'?<label className="form-label">Gắn vào dự án<select aria-label="Gắn vào dự án" className="form-select" required value={selectedProject} onChange={e=>setSelectedProject(e.target.value)}><option value="">Chọn dự án</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>:<p style={{marginBottom:16}}>Dự án: <strong>{projectName}</strong></p>}
        <div className="form-group"><label className="form-label" htmlFor="recall-title">Tên form *</label><input id="recall-title" className="form-input" required maxLength={200} value={title} onChange={event => setTitle(event.target.value)} placeholder="Ví dụ: Đăng ký lịch phỏng vấn" /></div>
        <div className="form-group"><label className="form-label" htmlFor="recall-description">Mô tả / hướng dẫn</label><textarea id="recall-description" className="form-textarea" maxLength={5000} value={description} onChange={event => setDescription(event.target.value)} placeholder="Địa điểm, hướng dẫn hoặc thông tin cần lưu ý…" /></div>
        <div className="form-group"><label className="form-label" htmlFor="recall-mode">Số người trong một khung giờ</label>
          <select id="recall-mode" className="form-select" value={allowOverlap ? 'shared' : 'single'} onChange={event => setAllowOverlap(event.target.value === 'shared')}>
            <option value="single">Mỗi khung giờ chỉ nhận một người</option><option value="shared">Cho phép nhiều người cùng khung giờ</option>
          </select>
        </div>
        <div className="recall-section-title"><h3>Ngày và giờ đăng ký</h3><span>Giờ Việt Nam (UTC+7)</span></div>
        <div className="form-group"><label className="form-label">Cách tạo lịch<select aria-label="Cách tạo lịch" className="form-select" value={mode} onChange={e=>changeMode(e.target.value)}><option value="quick">Tạo nhanh theo ngày và khoảng giờ</option><option value="manual">Nhập từng khung giờ</option></select></label></div>
        {mode==='quick'?<RecallScheduleBuilder value={schedule} onChange={setSchedule} preview={generated.slots} preserved={generated.preserved} error={scheduleError}/>:<>
        <p className="form-hint">Mỗi dòng là một khung giờ người tham gia có thể chọn. Khung giờ đã có đăng ký không thể xóa hoặc đổi.</p>
        <div className="recall-slot-list">
          {slots.map((slot, index) => <div className="recall-slot-row" key={slot.key}>
            <div><label className="form-label" htmlFor={`date-${slot.key}`}>Ngày {index + 1} *</label><input id={`date-${slot.key}`} type="date" className="form-input" required disabled={slot.booked > 0} value={slot.date} onChange={event => updateSlot(slot.key, 'date', event.target.value)} /></div>
            <div><label className="form-label" htmlFor={`time-${slot.key}`}>Giờ *</label><input id={`time-${slot.key}`} type="time" className="form-input" required disabled={slot.booked > 0} value={slot.time} onChange={event => updateSlot(slot.key, 'time', event.target.value)} /></div>
            <button className="btn btn-secondary" type="button" disabled={slot.booked > 0 || slots.length === 1} aria-label={`Xóa khung giờ ${index + 1}`} onClick={() => setSlots(previous => previous.filter(item => item.key !== slot.key))}><Icon name="trash" /></button>
            {slot.booked > 0 && <small className="recall-slot-note">Đã có {slot.booked} đăng ký</small>}
          </div>)}
        </div>
        <button className="btn btn-secondary btn-sm" type="button" disabled={slots.length >= 500} onClick={() => setSlots(previous => [...previous, { key: crypto.randomUUID(), date: previous.at(-1)?.date || '', time: '', booked: 0 }])}>+ Thêm khung giờ</button>
        </>}
        <label className="recall-toggle"><input className="form-checkbox" type="checkbox" checked={isOpen} onChange={event => setIsOpen(event.target.checked)} /> Mở đăng ký qua link</label>
      </fieldset>
      <div className="recall-actions"><button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Hủy</button><button className="btn btn-primary" disabled={saving}>{saving ? 'Đang lưu…' : initialForm ? 'Lưu thay đổi' : 'Tạo form và link'}</button></div>
    </form>
  );
}
