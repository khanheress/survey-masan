'use client';
import {useState} from 'react';
import {useSession} from 'next-auth/react';
export default function ParticipantBlacklist({person,onSaved}){
 const {data:session}=useSession();const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function change(blacklisted){setBusy(true);setError('');try{const res=await fetch(`/api/participants/${encodeURIComponent(person.id)}/blacklist`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({blacklisted})});const data=await res.json();if(!res.ok)throw Error(data.error);onSaved(data.blacklisted);}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <div className="card" style={{marginBottom:16}}><label style={{display:'flex',alignItems:'center',gap:10}}><input type="checkbox" checked={Boolean(person.blacklisted)} disabled={busy||session?.user?.role!=='admin'||!person.respondent_phone} onChange={e=>change(e.target.checked)}/>Blacklist — chặn đăng ký mới</label><p className="form-hint">Chặn số điện thoại này đăng ký khảo sát, Form Recall hoặc nhập thêm vào dự án. Bỏ đánh dấu để cho phép đăng ký lại. Phản hồi và lịch hẹn cũ được giữ nguyên.</p>{!person.respondent_phone&&<p>Cần bổ sung số điện thoại để chặn đăng ký.</p>}{busy&&<p role="status">Đang lưu…</p>}{error&&<p role="alert" className="recall-error">{error}</p>}</div>;
}
