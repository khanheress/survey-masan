'use client';
import {use,useCallback} from 'react';
import Link from 'next/link';
import useRemoteData from '@/hooks/useRemoteData';
import RecallManager from '@/components/RecallManager';
export default function ProjectRecallPage({params}){
 const {projectId}=use(params);
 const load=useCallback(async signal=>{if(projectId==='unassigned')return {name:'Form cũ chưa gắn dự án'};const res=await fetch(`/api/projects/${encodeURIComponent(projectId)}`,{signal});if(!res.ok)throw Error();return res.json();},[projectId]);
 const {data,loading,error,refresh}=useRemoteData(load,null,'Không thể tải dự án.');
 return <div><Link href="/admin/recall">← Danh sách dự án</Link>{loading?<p>Đang tải…</p>:error?<div><p>Không tìm thấy hoặc không thể tải dự án.</p><button onClick={refresh} className="btn btn-secondary">Thử lại</button></div>:<RecallManager projectId={projectId} projectName={data.name}/>}</div>;
}
