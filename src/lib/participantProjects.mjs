export async function removeParticipantProject(db,participantId,input){
 if(!input||!(typeof input.project_id==='string'&&input.project_id.trim()||input.project_id===null&&typeof input.project_name==='string'&&input.project_name.trim()))return {status:400,error:'Dự án không hợp lệ.'};
 return db.transaction(async()=>{
  if(!await db.prepare('SELECT id FROM participants WHERE id = ?').get(participantId))return {status:404,error:'Không tìm thấy hồ sơ.'};
  const condition=input.project_id?'project_id = ?':'project_id IS NULL AND project_name = ?';
  const result=await db.prepare(`UPDATE participant_history SET removed_from_profile = 1 WHERE participant_id = ? AND removed_from_profile = 0 AND ${condition}`).run(participantId,input.project_id||input.project_name);
  if(!result.changes)return {status:404,error:'Dự án này không còn trong lịch sử hồ sơ.'};
  return {status:200,removed:result.changes};
 })();
}
