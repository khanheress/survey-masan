'use client';
import SummaryPreview from './SummaryPreview';
import Modal from './Modal';
import {useCallback,useState} from 'react';
import {useSession} from 'next-auth/react';
import useRemoteData from '@/hooks/useRemoteData';
import {useToast} from './Toast';
import ImportParticipants from './ImportParticipants';
import {REVIEW_LABELS} from '@/lib/responseReview.mjs';
export default function ProjectMembers({projectId,projectName}){
 const {data:session}=useSession(),{addToast}=useToast();const [summaryPerson,setSummaryPerson]=useState(null);const [importing,setImporting]=useState(false),[saving,setSaving]=useState(null),[search,setSearch]=useState('');
 const load=useCallback(async signal=>{const res=await fetch(`/api/projects/${projectId}/members`,{signal});if(!res.ok)throw Error();return res.json();},[projectId]);
 const {data:people,loading,error,refresh}=useRemoteData(load,[],'Không thể tải người tham gia.');
 async function review(person,status){setSaving(person.participant_id);try{const res=await fetch(`/api/projects/${projectId}/members`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({participant_id:person.participant_id,review_status:status})});const data=await res.json();if(!res.ok)throw Error(data.error);refresh();addToast('Đã cập nhật trạng thái tham gia','success');}catch(e){addToast(e.message,'error');}finally{setSaving(null);}}
 const filtered=people.filter(p=>`${p.respondent_name} ${p.respondent_phone}`.toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi')));
 return <section className="card"><div className="flex gap-2" style={{justifyContent:'space-between',flexWrap:'wrap'}}><h2>Người tham gia (Excel) · {people.length}</h2>{session?.user?.role==='admin'&&<button className="btn btn-primary" onClick={()=>setImporting(true)}>Nhập người tham gia từ Excel</button>}</div><p className="form-hint">Danh sách thêm trực tiếp từ Excel. Hồ sơ được cho tham gia sẽ xuất hiện trong Giao mẫu. Những người gửi khảo sát nằm ở mục Phản hồi.</p>
 <label className="form-label" htmlFor="member-search">Tìm tên hoặc số điện thoại</label><input id="member-search" className="form-input" value={search} onChange={e=>setSearch(e.target.value)}/>
 {loading?<p>Đang tải…</p>:error?<button className="btn btn-secondary" onClick={refresh}>Thử tải lại</button>:<div style={{overflowX:'auto',marginTop:16}}><table className="data-table"><thead><tr><th>Tên</th><th>Năm sinh</th><th>Số điện thoại</th><th>Địa chỉ</th><th>Nghề nghiệp</th><th>Tình trạng hôn nhân</th><th>Người mời</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{filtered.map(p=><tr key={p.participant_id}>{['respondent_name','respondent_birth_year','respondent_phone','respondent_address','respondent_occupation','respondent_marital_status','respondent_inviter'].map(k=><td key={k}>{p[k]||'—'}</td>)}<td>{REVIEW_LABELS[p.review_status]}</td><td><button className="btn btn-secondary btn-sm" onClick={()=>setSummaryPerson(p)}>Tóm tắt</button>{session?.user?.role==='admin'&&<select className="form-select" aria-label={`Trạng thái của ${p.respondent_name}`} disabled={saving!==null} value={p.review_status} onChange={e=>review(p,e.target.value)}>{Object.entries(REVIEW_LABELS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select>}</td></tr>)}</tbody></table>{!filtered.length&&<p>Chưa có người tham gia phù hợp.</p>}</div>}
 <Modal isOpen={Boolean(summaryPerson)} onClose={()=>setSummaryPerson(null)} title="Tóm tắt người tham gia">{summaryPerson&&<SummaryPreview key={summaryPerson.participant_id} projectId={projectId} participantId={summaryPerson.participant_id}/>}</Modal>
 {importing&&<ImportParticipants projectId={projectId} projectName={projectName} onClose={()=>setImporting(false)} onSaved={r=>{refresh();addToast(`Đã thêm ${r.added} người vào dự án`,'success');}}/>}
 </section>;
}
