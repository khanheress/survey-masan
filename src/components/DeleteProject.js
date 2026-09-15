'use client';
import {useState} from 'react';
import {useSession} from 'next-auth/react';
import {useRouter} from 'next/navigation';
import Modal from '@/components/Modal';
export default function DeleteProject({project}) {
 const {data:session}=useSession();const router=useRouter();const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 if(session?.user?.role!=='admin')return null;
 async function remove(){setBusy(true);setError('');try{const res=await fetch(`/api/projects/${encodeURIComponent(project.id)}`,{method:'DELETE'});if(!res.ok)throw Error((await res.json()).error||'Không thể xóa dự án.');router.push('/admin/projects');}catch(e){setError(e.message);setBusy(false);}}
 return <><button className="btn btn-danger" onClick={()=>setOpen(true)}>Xóa dự án</button><Modal isOpen={open} onClose={()=>{if(!busy)setOpen(false);}} title="Xóa dự án" size="sm"><p>Xóa dự án <strong>{project.name}</strong> cùng toàn bộ khảo sát và phản hồi? Thao tác không thể hoàn tác. Hồ sơ trong Quản lý data vẫn được giữ lại.</p>{error&&<p role="alert">{error}</p>}<div className="flex gap-2" style={{marginTop:20}}><button className="btn btn-secondary" disabled={busy} onClick={()=>setOpen(false)}>Hủy</button><button className="btn btn-danger" disabled={busy} onClick={remove}>{busy?'Đang xóa…':'Xác nhận xóa dự án'}</button></div></Modal></>;
}
