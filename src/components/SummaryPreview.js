'use client';
import {useState} from 'react';
export default function SummaryPreview({projectId,responseId,participantId}){
 const [text,setText]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[copied,setCopied]=useState(false);
 async function load(){setBusy(true);setError('');setCopied(false);try{const query=new URLSearchParams(responseId?{response_id:responseId}:{participant_id:participantId});const res=await fetch(`/api/projects/${encodeURIComponent(projectId)}/summary?${query}`);const data=await res.json();if(!res.ok)throw Error(data.error);setText(data.text);}catch(e){setError(e.message);}finally{setBusy(false);}}
 async function copy(){try{await navigator.clipboard.writeText(text);setCopied(true);}catch{setError('Không thể sao chép tự động. Bạn có thể chọn và sao chép nội dung bên dưới.');}}
 return <section style={{margin:'16px 0'}}><button className="btn btn-secondary" onClick={load} disabled={busy}>{busy?'Đang tạo…':text===null?'Tóm tắt thông tin người khảo sát':'Cập nhật bản tóm tắt'}</button>{error&&<p role="alert" className="recall-error">{error}</p>}{text!==null&&<><textarea aria-label="Bản tóm tắt người khảo sát" className="form-textarea" rows={10} style={{margin:'12px 0'}} value={text} onChange={e=>{setText(e.target.value);setCopied(false);}}/><p className="form-hint">Có thể sửa nội dung trước khi sao chép. Việc này không thay đổi hồ sơ hay mẫu dự án.</p><button className="btn btn-primary" onClick={copy}>{copied?'Đã sao chép':'Sao chép tóm tắt'}</button></>}</section>;
}
