import {randomUUID} from 'node:crypto';
import {normalizePhone} from './participantStore.mjs';
import {REVIEW_LABELS} from './responseReview.mjs';
export class MemberError extends Error {constructor(message,status=400){super(message);this.status=status;}}
export async function initializeProjectMembers(db){
 await db.exec(`CREATE TABLE IF NOT EXISTS project_members (
 project_id TEXT NOT NULL,participant_id TEXT NOT NULL,review_status TEXT NOT NULL DEFAULT 'pending',
 created_at TEXT NOT NULL,reviewed_by TEXT NOT NULL,PRIMARY KEY(project_id,participant_id));`);
}
export async function listProjectMembers(db,projectId){
 if(!await db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId))throw new MemberError('Không tìm thấy dự án.',404);
 const rows=await db.prepare('SELECT m.*,p.profile_json FROM project_members m JOIN participants p ON p.id=m.participant_id WHERE m.project_id = ? ORDER BY m.created_at DESC,m.participant_id').all(projectId);
 return rows.map(({profile_json,...row})=>({...row,...JSON.parse(profile_json)}));
}
export async function reviewProjectMember(db,projectId,input,userId){
 if(!input||typeof input.participant_id!=='string'||!Object.hasOwn(REVIEW_LABELS,input.review_status))throw new MemberError('Trạng thái tham gia không hợp lệ.');
 const result=await db.prepare('UPDATE project_members SET review_status = ?,reviewed_by = ? WHERE project_id = ? AND participant_id = ?').run(input.review_status,userId,projectId,input.participant_id);
 if(!result.changes)throw new MemberError('Không tìm thấy người tham gia.',404);
 return {review_status:input.review_status};
}
export async function importProjectMembers(db,projectId,rows,{commit=false,reviewStatus='approved',userId}={}){
 if(!['pending','approved'].includes(reviewStatus))throw new MemberError('Chọn chờ duyệt hoặc cho tham gia.');
 return db.transaction(async()=>{
  const project=await db.prepare('SELECT id,name FROM projects WHERE id = ?').get(projectId);if(!project)throw new MemberError('Không tìm thấy dự án.',404);
  const people=await db.prepare('SELECT id,phone,profile_json FROM participants').all();const byPhone=new Map(people.filter(p=>p.phone).map(p=>[normalizePhone(p.phone),p]));
  const members=new Set((await db.prepare('SELECT participant_id FROM project_members WHERE project_id = ?').all(projectId)).map(p=>p.participant_id));
  const responses=await db.prepare('SELECT r.respondent_phone,h.participant_id FROM responses r LEFT JOIN participant_history h ON h.response_id=r.id WHERE r.project_id = ?').all(projectId);
  const responsePhones=new Set(responses.filter(r=>r.respondent_phone).map(r=>normalizePhone(r.respondent_phone)));responses.forEach(r=>{if(r.participant_id)members.add(r.participant_id);});
  const blocked=new Set((await db.prepare('SELECT phone FROM participant_blacklist').all()).map(p=>p.phone));
  const seen=new Set(),result=[];let added=0;
  for(const row of rows){
   if(row.error){result.push({...row,status:'error'});continue;}
   if(blocked.has(normalizePhone(row.phone))){result.push({...row,status:'error',error:'Số điện thoại đang trong blacklist. Cần bỏ chặn trước khi thêm vào dự án.'});continue;}
   const existing=byPhone.get(row.phone),id=existing?.id||`phone:${row.phone}`;
   if(seen.has(row.phone)||members.has(id)||responsePhones.has(row.phone)){result.push({...row,status:'skip',message:'Đã có trong dự án hoặc trùng trong file; giữ nguyên trạng thái hiện có.'});continue;}
   seen.add(row.phone);
   const profile=existing?JSON.parse(existing.profile_json):{respondent_name:row.name,respondent_phone:row.phone,respondent_birth_year:row.birthYear??null,respondent_address:row.address||null,respondent_occupation:row.occupation,respondent_marital_status:row.maritalStatus||null,respondent_inviter:row.inviter};
   result.push({...row,name:profile.respondent_name,phone:profile.respondent_phone,birthYear:profile.respondent_birth_year,address:profile.respondent_address,occupation:profile.respondent_occupation,maritalStatus:profile.respondent_marital_status,inviter:profile.respondent_inviter,project:project.name,status:'ready',existing:Boolean(existing)});
   if(!commit)continue;
   const now=new Date().toISOString();
   if(!existing)await db.prepare('INSERT INTO participants (id,phone,name,profile_json,first_seen,last_seen) VALUES (?,?,?,?,?,?)').run(id,row.phone,row.name,JSON.stringify(profile),now,now);
   else await db.prepare('UPDATE participants SET last_seen = ? WHERE id = ?').run(now,id);
   await db.prepare('INSERT INTO project_members (project_id,participant_id,review_status,created_at,reviewed_by) VALUES (?,?,?,?,?)').run(projectId,id,reviewStatus,now,userId);
   await db.prepare('INSERT INTO participant_history (response_id,participant_id,project_id,project_name,survey_id,survey_title,inviter,submitted_at) VALUES (?,?,?,?,NULL,?,?,?)').run('project-import:'+randomUUID(),id,projectId,project.name,'Nhập Excel vào dự án',profile.respondent_inviter||null,now);
   added++;
  }
  return {rows:result,added,valid:result.filter(r=>r.status==='ready').length,skipped:result.filter(r=>r.status==='skip').length,errors:result.filter(r=>r.status==='error').length};
 })();
}
