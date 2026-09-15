'use client';
import {useState} from 'react';
import Script from 'next/script';
import Modal from '@/components/Modal';
import {createGoogleSheet,GOOGLE_SHEETS_SCOPE} from '@/lib/googleSheets.mjs';
export default function ProjectExport({projectId}){
 const [open,setOpen]=useState(false),[columns,setColumns]=useState([]),[selected,setSelected]=useState([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[total,setTotal]=useState(0);
 const [format,setFormat]=useState('xlsx'),[clientId,setClientId]=useState(''),[googleReady,setGoogleReady]=useState(false),[sheetUrl,setSheetUrl]=useState(''),[scriptError,setScriptError]=useState(false);
 async function show(){setOpen(true);setError('');setSheetUrl('');setColumns([]);setSelected([]);setBusy(true);try{const res=await fetch(`/api/projects/${projectId}/export`);const data=await res.json();if(!res.ok)throw Error(data.error);setColumns(data.columns);setSelected(data.columns.map(c=>c.key));setTotal(data.total);setClientId(data.google_client_id||'');}catch(e){setError(e.message);}finally{setBusy(false);}}
 async function download(){setBusy(true);setError('');try{const res=await fetch(`/api/projects/${projectId}/export`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({columns:selected})});if(!res.ok)throw Error((await res.json()).error);const url=URL.createObjectURL(await res.blob());const a=document.createElement('a');a.href=url;a.download='phan-hoi-du-an.xlsx';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setOpen(false);}catch(e){setError(e.message);}finally{setBusy(false);}}
 function googleExport(){
  setBusy(true);setError('');setSheetUrl('');
  try{
   const client=window.google.accounts.oauth2.initTokenClient({client_id:clientId,scope:GOOGLE_SHEETS_SCOPE,include_granted_scopes:false,
    error_callback:()=>{setBusy(false);setError('Đăng nhập Google đã đóng hoặc bị trình duyệt chặn. Bạn có thể thử lại.');},
    callback:async token=>{
     try{
      if(token.error||!token.access_token)throw Error('Bạn chưa cấp quyền xuất Google Sheets.');
      if(!window.google.accounts.oauth2.hasGrantedAllScopes(token,GOOGLE_SHEETS_SCOPE))throw Error('Cần cấp quyền tạo tệp để xuất Google Sheets.');
      const res=await fetch(`/api/projects/${projectId}/export`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({format:'google',columns:selected})});const data=await res.json();if(!res.ok)throw Error(data.error);
      setSheetUrl(await createGoogleSheet(token.access_token,data.title,data.values));
     }catch(e){setError(e.message);}finally{setBusy(false);}
    }});
   client.requestAccessToken({prompt:'select_account'});
  }catch{setBusy(false);setError('Chưa thể mở đăng nhập Google. Vui lòng tải lại trang.');}
 }
 return <><button className="btn btn-secondary" onClick={show}>Xuất dữ liệu (Excel / Google Sheets)</button>
 {open&&clientId&&<Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onReady={()=>setGoogleReady(true)} onError={()=>{setScriptError(true);setGoogleReady(false);}}/>}
 <Modal isOpen={open} onClose={()=>{if(!busy)setOpen(false);}} title="Xuất dữ liệu dự án" size="lg">
  <label className="form-label">Định dạng xuất<select aria-label="Định dạng xuất" className="form-select" value={format} disabled={busy} onChange={e=>{setFormat(e.target.value);setError('');setSheetUrl('');}}><option value="xlsx">Excel (.xlsx)</option><option value="google">Google Sheets</option></select></label>
  <p>Xuất toàn bộ {total} phản hồi của dự án, gồm các mục bạn chọn.</p>
  {format==='google'&&<p>{!clientId?'Xuất Google Sheets chưa được quản trị viên cấu hình. Bạn vẫn có thể xuất Excel.':scriptError?'Không tải được đăng nhập Google. Vui lòng kiểm tra kết nối và tải lại trang.':'Đăng nhập Google để tạo bảng tính mới trong tài khoản bạn chọn.'}</p>}
  {error&&<p role="alert" style={{color:'var(--danger)'}}>{error}</p>}
  {sheetUrl&&<p role="status">Đã tạo bảng tính. <a href={sheetUrl} target="_blank" rel="noopener noreferrer">Mở Google Sheets</a></p>}
  <div className="flex gap-2" style={{margin:'1rem 0'}}><button className="btn btn-secondary btn-sm" disabled={busy} onClick={()=>setSelected(columns.map(c=>c.key))}>Chọn tất cả</button><button className="btn btn-secondary btn-sm" disabled={busy} onClick={()=>setSelected([])}>Bỏ chọn tất cả</button></div>
  <div style={{maxHeight:'40vh',overflowY:'auto'}}>{columns.map(c=><label key={c.key} style={{display:'flex',gap:10,padding:8}}><input type="checkbox" checked={selected.includes(c.key)} disabled={busy} onChange={e=>setSelected(e.target.checked?[...selected,c.key]:selected.filter(k=>k!==c.key))}/>{c.label}</label>)}</div>
  <div className="flex gap-2" style={{marginTop:20}}><button className="btn btn-secondary" disabled={busy} onClick={()=>setOpen(false)}>Đóng</button><button className="btn btn-primary" disabled={busy||!selected.length||(format==='google'&&(!clientId||!googleReady))} onClick={format==='google'?googleExport:download}>{busy?'Đang xử lý…':format==='google'?'Đăng nhập Google và xuất':`Xuất ${selected.length} mục`}</button></div>
 </Modal></>;
}
