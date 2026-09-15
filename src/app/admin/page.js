'use client';
import {useCallback,useState} from 'react';
import Link from 'next/link';
import useRemoteData from '@/hooks/useRemoteData';
import ProjectProgress from '@/components/ProjectProgress';
export default function DashboardPage(){
 const [month,setMonth]=useState(()=>new Date(Date.now()+7*3600000).toISOString().slice(0,7));
 const load=useCallback(async signal=>{const res=await fetch(`/api/stats?month=${month}`,{signal});if(!res.ok)throw Error('Không thể tải thống kê');return res.json();},[month]);
 const {data,loading,error,refresh}=useRemoteData(load,null,'Không thể tải thống kê');
 return <div className="animate-fadeIn"><div className="page-header"><div><h1 className="page-title">Tổng quan</h1><p className="data-description">Số lượng phản hồi hợp lệ và tiến độ thu thập khảo sát.</p></div><button className="btn btn-secondary" onClick={refresh}>Làm mới</button></div>
  {error?<div className="card"><p>Không thể tải thống kê.</p><button className="btn btn-secondary" onClick={refresh}>Thử lại</button></div>:loading?<div className="card skeleton" style={{height:300}}/>:<>
   <div className="grid-cols-4" style={{marginBottom:'1.5rem'}}>{[['Dự án',data.stats.total_projects],['Khảo sát',data.stats.total_surveys],['Phản hồi',data.stats.total_responses],['Dự án đang nhận',data.stats.active_projects]].map(([label,value])=><div className="card" key={label}><p>{label}</p><strong style={{fontSize:'2rem'}}>{value}</strong></div>)}</div>
   <section className="card" style={{marginBottom:'1.5rem'}}><div className="flex-between" style={{gap:'1rem',flexWrap:'wrap'}}><h2 style={{fontSize:'1.25rem'}}>Phản hồi theo người mời trong tháng</h2><label className="form-label">Tháng thống kê<input aria-label="Tháng thống kê" type="month" className="form-input" value={month} onChange={e=>{if(e.target.value)setMonth(e.target.value);}}/></label></div><p className="survey-flow-note">Tính theo số phản hồi đã lưu, theo giờ Việt Nam; một người gửi nhiều khảo sát được tính nhiều phản hồi.</p><div className="grid-cols-3">{data.monthly_inviters.map(item=><div className="card" key={item.inviter}><h3>{item.inviter}</h3><strong style={{fontSize:'1.8rem'}}>{item.count}</strong><span> phản hồi</span></div>)}</div></section>
   <h2 style={{fontSize:'1.25rem',marginBottom:'1rem'}}>Tiến độ dự án đang hoạt động</h2><div className="grid-cols-2">{data.active_projects.map(project=><section className="card" key={project.id}><Link href={`/admin/projects/${project.id}`}><h3>{project.name}</h3></Link><p className="survey-flow-note">{project.availability.isOpen?'Đang nhận phản hồi':project.availability.message}</p><ProjectProgress project={project}/></section>)}</div>{!data.active_projects.length&&<p>Chưa có dự án đang hoạt động.</p>}
   <section className="card" style={{marginTop:'1.5rem'}}><h2 style={{fontSize:'1.25rem',marginBottom:'1rem'}}>Phản hồi mới nhất</h2><div style={{overflowX:'auto'}}><table className="data-table"><thead><tr><th>Tên</th><th>Người mời</th><th>Dự án</th><th>Ngày gửi</th></tr></thead><tbody>{data.recent_responses.map(r=><tr key={r.id}><td>{r.respondent_name}</td><td>{r.respondent_inviter||'—'}</td><td>{r.project_name}</td><td>{new Date(r.created_at.includes('T')?r.created_at:r.created_at.replace(' ','T')+'Z').toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})}</td></tr>)}</tbody></table></div></section>
  </>}
 </div>;
}
