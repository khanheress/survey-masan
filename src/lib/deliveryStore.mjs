import {normalizePhone} from './participantStore.mjs';
export class DeliveryError extends Error {constructor(message,status=400){super(message);this.status=status;}}
export async function initializeDeliveryStore(db){
 await db.exec(`CREATE TABLE IF NOT EXISTS sample_deliveries (
 project_id TEXT NOT NULL, participant_id TEXT NOT NULL,
 delivered INTEGER NOT NULL DEFAULT 0, notes TEXT NOT NULL DEFAULT '',
 updated_at TEXT NOT NULL, updated_by TEXT NOT NULL,
 PRIMARY KEY(project_id,participant_id));`);
}
export async function getProjectDeliveries(db,projectId){
 const project=await db.prepare('SELECT id,name,status FROM projects WHERE id = ?').get(projectId);
 if(!project)throw new DeliveryError('Không tìm thấy dự án.',404);
 const responses=await db.prepare(`SELECT r.id,r.respondent_name,r.respondent_phone,r.respondent_address,h.inviter AS respondent_inviter,h.participant_id,p.profile_json
 FROM responses r LEFT JOIN participant_history h ON h.response_id=r.id
 LEFT JOIN participants p ON p.id=h.participant_id
 WHERE r.project_id = ? AND r.review_status='approved' ORDER BY r.created_at DESC,r.id`).all(projectId);
 const saved=await db.prepare('SELECT * FROM sample_deliveries WHERE project_id = ?').all(projectId);
 const byId=new Map(saved.map(row=>[row.participant_id,row]));const people=new Map();
 for(const row of responses){
  const phone=normalizePhone(row.respondent_phone||'');const id=row.participant_id||(phone?`phone:${phone}`:`response:${row.id}`);
  if(people.has(id))continue;
  let profile=row;if(row.profile_json){try{profile=JSON.parse(row.profile_json);}catch{}}
  const state=byId.get(id);
  people.set(id,{participant_id:id,name:profile.respondent_name||'',phone:profile.respondent_phone||'',address:profile.respondent_address||'',inviter:profile.respondent_inviter||'',delivered:Boolean(state?.delivered),notes:state?.notes||'',updated_at:state?.updated_at||null});
 }
 if(await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='project_members'").get()){
  const imported=await db.prepare("SELECT m.participant_id,p.profile_json FROM project_members m JOIN participants p ON p.id=m.participant_id WHERE m.project_id = ? AND m.review_status='approved'").all(projectId);
  for(const row of imported){if(people.has(row.participant_id))continue;const profile=JSON.parse(row.profile_json),state=byId.get(row.participant_id);people.set(row.participant_id,{participant_id:row.participant_id,name:profile.respondent_name||'',phone:profile.respondent_phone||'',address:profile.respondent_address||'',inviter:profile.respondent_inviter||'',delivered:Boolean(state?.delivered),notes:state?.notes||'',updated_at:state?.updated_at||null});}
 }
 const list=[...people.values()].sort((a,b)=>a.name.localeCompare(b.name,'vi'));
 return {project,people:list,total:list.length,delivered:list.filter(p=>p.delivered).length};
}
export async function saveDelivery(db,projectId,input,userId){
 if(!input||typeof input.participant_id!=='string'||!input.participant_id)throw new DeliveryError('Hồ sơ không hợp lệ.');
 const hasDelivered=Object.hasOwn(input,'delivered'),hasNotes=Object.hasOwn(input,'notes');
 if((!hasDelivered&&!hasNotes)||(hasDelivered&&typeof input.delivered!=='boolean')||(hasNotes&&(typeof input.notes!=='string'||input.notes.length>2000)))throw new DeliveryError('Trạng thái phải hợp lệ và ghi chú tối đa 2.000 ký tự.');
 return db.transaction(async()=>{
  const data=await getProjectDeliveries(db,projectId);const person=data.people.find(p=>p.participant_id===input.participant_id);
  if(!person)throw new DeliveryError('Người này hiện chưa được duyệt tham gia dự án. Vui lòng tải lại danh sách.',409);
  const result={...person,delivered:hasDelivered?input.delivered:person.delivered,notes:hasNotes?input.notes:person.notes,updated_at:new Date().toISOString()};
  await db.prepare(`INSERT INTO sample_deliveries (project_id,participant_id,delivered,notes,updated_at,updated_by) VALUES (?,?,?,?,?,?)
   ON CONFLICT(project_id,participant_id) DO UPDATE SET delivered=excluded.delivered,notes=excluded.notes,updated_at=excluded.updated_at,updated_by=excluded.updated_by`).run(projectId,person.participant_id,Number(result.delivered),result.notes,result.updated_at,userId);
  return result;
 })();
}
