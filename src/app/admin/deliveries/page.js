'use client';
import {useCallback} from 'react';
import Link from 'next/link';
import useRemoteData from '@/hooks/useRemoteData';
export default function DeliveriesPage(){
 const load=useCallback(async signal=>{const res=await fetch('/api/deliveries',{signal});if(!res.ok)throw Error();return res.json();},[]);
 const {data:projects,loading,error,refresh}=useRemoteData(load,[],'Không thể tải danh sách giao mẫu.');
 return <div><div className="page-header"><div><h1 className="page-title">Giao mẫu</h1><p>Chọn dự án để theo dõi giao mẫu cho những người đã được duyệt tham gia.</p></div><button className="btn btn-secondary" onClick={refresh}>Làm mới</button></div>{loading?<p>Đang tải…</p>:error?<p role="alert">Không thể tải dữ liệu. Vui lòng thử lại.</p>:<div className="grid-cols-3">{projects.map(p=><Link className="card" style={{textDecoration:'none',color:'inherit'}} key={p.id} href={`/admin/deliveries/${p.id}`}><h2>{p.name}</h2><p style={{marginTop:16}}>{p.total} người được tham gia</p><p>Đã giao: <strong>{p.delivered}</strong> · Chưa giao: <strong>{p.total-p.delivered}</strong></p><p style={{marginTop:16,color:'var(--accent-primary)'}}>Xem danh sách →</p></Link>)}</div>}{!loading&&!error&&!projects.length&&<p>Chưa có dự án.</p>}</div>;
}
