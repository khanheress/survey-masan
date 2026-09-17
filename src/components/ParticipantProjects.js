'use client';
import {useState} from 'react';
import {useSession} from 'next-auth/react';
import Modal from './Modal';
export default function ParticipantProjects({person,onClose,onSaved}){
 const {data:session}=useSession();const [projects,setProjects]=useState(person.projects),[pending,setPending]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const same=(a,b)=>a.id===b.id&&(a.id||a.name===b.name);
 async function remove(){setBusy(true);setError('');try{const res=await fetch(`/api/participants/${encodeURIComponent(person.id)}/projects`,{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({project_id:pending.id||null,project_name:pending.name})});const data=await res.json();if(!res.ok)throw Error(data.error);setProjects(previous=>previous.filter(p=>!same(p,pending)));setPending(null);onSaved();}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <Modal isOpen onClose={()=>{if(!busy)onClose();}} title={`Dự án đã tham gia · ${person.respondent_name||person.respondent_phone||''}`}>
 <p>{projects.length} dự án</p><p className="form-hint">Gỡ dự án khỏi lịch sử trong Quản lý data không xóa dự án, phản hồi gốc hoặc thay đổi quyền tham gia và giao mẫu.</p>
 {error&&<p role="alert" className="recall-error">{error}</p>}
 {projects.length?<ul style={{listStyle:'none',padding:0}}>{projects.map(p=><li key={JSON.stringify([p.id,p.id?null:p.name])} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,padding:'12px 0',borderBottom:'1px solid var(--border-color)'}}><span style={{overflowWrap:'anywhere'}}>{p.name}</span>{session?.user?.role==='admin'&&<button className="btn btn-secondary btn-sm" disabled={busy} onClick={()=>{setPending(p);setError('');}}>Gỡ khỏi hồ sơ</button>}</li>)}</ul>:<p>Hồ sơ chưa có dự án trong lịch sử.</p>}
 {pending&&<div className="card" style={{marginTop:16}}><p>Gỡ <strong>{pending.name}</strong> và các lượt tham gia dự án này khỏi lịch sử hồ sơ?</p><div className="flex gap-2" style={{marginTop:12}}><button className="btn btn-secondary" disabled={busy} onClick={()=>setPending(null)}>Hủy</button><button className="btn btn-danger" disabled={busy} onClick={remove}>{busy?'Đang gỡ…':'Xác nhận gỡ'}</button></div></div>}
 </Modal>;
}
