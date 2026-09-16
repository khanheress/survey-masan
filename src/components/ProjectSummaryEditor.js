'use client';
import {useCallback,useState} from 'react';
import {useSession} from 'next-auth/react';
import useRemoteData from '@/hooks/useRemoteData';
import {useToast} from './Toast';
export default function ProjectSummaryEditor({projectId}){
 const {data:session}=useSession(),{addToast}=useToast();const [draft,setDraft]=useState(null),[saving,setSaving]=useState(false);
 const load=useCallback(async signal=>{const res=await fetch(`/api/projects/${projectId}/summary`,{signal});const data=await res.json();if(!res.ok)throw Error(data.error);return data;},[projectId]);
 const {data,loading,error,refresh}=useRemoteData(load,null,'Không thể tải mẫu tóm tắt.');
 if(loading)return <p>Đang tải mẫu…</p>;if(error||!data)return <button className="btn btn-secondary" onClick={refresh}>Thử tải lại mẫu</button>;
 const template=draft||data.template;const update=patch=>setDraft({...template,...patch});const changeRow=(index,patch)=>update({rows:template.rows.map((r,i)=>i===index?{...r,...patch}:r)});
 const move=(index,delta)=>{const rows=[...template.rows];[rows[index],rows[index+delta]]=[rows[index+delta],rows[index]];update({rows});};
 async function save(){setSaving(true);try{const res=await fetch(`/api/projects/${projectId}/summary`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(template)});const result=await res.json();if(!res.ok)throw Error(result.error);setDraft(result.template);addToast('Đã lưu mẫu tóm tắt của dự án','success');}catch(e){addToast(e.message,'error');}finally{setSaving(false);}}
 return <section className="card"><h2>Mẫu tóm tắt thông tin người khảo sát</h2><p className="form-hint">Mỗi dự án có một mẫu riêng. Đặt tên từng mục và chọn thông tin sẽ tự điền. Sau khi lưu, mở một phản hồi hoặc hồ sơ nhập Excel để tạo và sao chép bản tóm tắt.</p>
 <fieldset className="recall-fieldset" disabled={saving||session?.user?.role!=='admin'}><label className="form-label" htmlFor="summary-intro">Lời mở đầu<textarea id="summary-intro" aria-label="Lời mở đầu" className="form-textarea" maxLength={2000} value={template.intro} onChange={e=>update({intro:e.target.value})}/></label>
 {template.rows.map((row,i)=><div key={i} style={{display:'flex',flexWrap:'wrap',gap:8,alignItems:'end',margin:'12px 0'}}><label className="form-label" style={{flex:'1 1 160px'}}>Tên mục {i+1}<input className="form-input" maxLength={200} value={row.label} onChange={e=>changeRow(i,{label:e.target.value})}/></label><label className="form-label" style={{flex:'2 1 240px',minWidth:0}}>Thông tin tự điền {i+1}<select aria-label={`Thông tin tự điền ${i+1}`} className="form-select" value={row.source} onChange={e=>changeRow(i,{source:e.target.value})}>{!data.sources.some(s=>s.id===row.source)&&<option value={row.source}>Trường không còn tồn tại — vui lòng chọn lại</option>}{data.sources.map(source=><option key={source.id} value={source.id}>{source.label}</option>)}</select></label><button className="btn btn-secondary btn-sm" aria-label={`Đưa mục ${i+1} lên`} disabled={i===0} onClick={()=>move(i,-1)}>↑</button><button className="btn btn-secondary btn-sm" aria-label={`Đưa mục ${i+1} xuống`} disabled={i===template.rows.length-1} onClick={()=>move(i,1)}>↓</button><button className="btn btn-secondary btn-sm" aria-label={`Xóa mục ${i+1}`} disabled={template.rows.length===1} onClick={()=>update({rows:template.rows.filter((_,j)=>j!==i)})}>Xóa</button></div>)}
 <button className="btn btn-secondary" disabled={template.rows.length>=50} onClick={()=>update({rows:[...template.rows,{label:'Thông tin thêm',source:'respondent_name'}]})}>+ Thêm mục tóm tắt</button>
 <label className="form-label" style={{marginTop:16}}>Lời kết<textarea aria-label="Lời kết" className="form-textarea" maxLength={2000} value={template.outro} onChange={e=>update({outro:e.target.value})}/></label>
 <button className="btn btn-primary" style={{marginTop:12}} onClick={save}>{saving?'Đang lưu…':'Lưu mẫu tóm tắt'}</button></fieldset>
 <h3 style={{marginTop:20}}>Bố cục mẫu</h3><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',fontFamily:'inherit',lineHeight:1.7}}>{[template.intro,...template.rows.map(r=>`${r.label}: [${data.sources.find(s=>s.id===r.source)?.label||'Chưa chọn thông tin'}]`),template.outro].filter(Boolean).join('\n')}</pre>
 </section>;
}
