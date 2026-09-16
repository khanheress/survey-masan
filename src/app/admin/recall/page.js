'use client';
import {useCallback} from 'react';
import Link from 'next/link';
import useRemoteData from '@/hooks/useRemoteData';
export default function RecallPage(){
 const load=useCallback(async signal=>{const res=await fetch('/api/projects',{signal});if(!res.ok)throw Error();return res.json();},[]);
 const {data:projects,loading,error,refresh}=useRemoteData(load,[],'Không thể tải dự án.');
 return <div><div className="page-header"><div><h1 className="page-title">Form Recall theo dự án</h1><p>Chọn dự án để tạo form, quản lý lịch hẹn và xem đăng ký.</p></div></div>{loading?<p>Đang tải…</p>:error?<button className="btn btn-secondary" onClick={refresh}>Thử lại</button>:<div className="grid-cols-3">{projects.map(p=><Link className="card" style={{textDecoration:'none',color:'inherit'}} key={p.id} href={`/admin/recall/${p.id}`}><h2>{p.name}</h2><p style={{marginTop:12}}>Quản lý Form Recall →</p></Link>)}</div>}{!loading&&!error&&!projects.length&&<p>Chưa có dự án. <Link href="/admin/projects">Tạo dự án</Link></p>}<p style={{marginTop:24}}><Link href="/admin/recall/unassigned">Form cũ chưa gắn dự án</Link></p></div>;
}
