'use client';
import {useState} from 'react';
import {useSession} from 'next-auth/react';
import {useToast} from '@/components/Toast';
import {REVIEW_LABELS} from '@/lib/responseReview.mjs';
export default function ResponseReview({response,onSaved}){
 const {data:session}=useSession();const {addToast}=useToast();const [busy,setBusy]=useState(false);
 async function change(review_status){setBusy(true);try{const res=await fetch(`/api/responses/${encodeURIComponent(response.id)}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({review_status})});const data=await res.json();if(!res.ok)throw Error(data.error);onSaved(data.review_status);addToast('Đã cập nhật trạng thái tham gia','success');}catch(e){addToast(e.message,'error');}finally{setBusy(false);}}
 return session?.user?.role==='admin'?<select className="form-select" style={{minWidth:210}} aria-label={`Duyệt tham gia của ${response.respondent_name||response.respondent_phone}`} value={response.review_status||'pending'} disabled={busy} onChange={e=>change(e.target.value)}>{Object.entries(REVIEW_LABELS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select>:<span>{REVIEW_LABELS[response.review_status||'pending']}</span>;
}
