import {normalizePhone} from './participantStore.mjs';
export const BLOCKED_MESSAGE='Bạn hiện không thể đăng ký. Vui lòng liên hệ lại người mời khảo sát.';
export async function initializeBlacklistStore(db){await db.exec('CREATE TABLE IF NOT EXISTS participant_blacklist (phone TEXT PRIMARY KEY,participant_id TEXT NOT NULL,created_at TEXT NOT NULL,created_by TEXT NOT NULL); CREATE INDEX IF NOT EXISTS blacklist_participant ON participant_blacklist(participant_id);');}
export async function isPhoneBlacklisted(db,phone){return Boolean(await db.prepare('SELECT 1 FROM participant_blacklist WHERE phone = ?').get(normalizePhone(phone)));}
export async function setParticipantBlacklist(db,id,blocked,userId){
 if(typeof blocked!=='boolean')return {status:400,error:'Trạng thái blacklist không hợp lệ.'};
 return db.transaction(async()=>{
  const person=await db.prepare('SELECT phone FROM participants WHERE id = ?').get(id);if(!person)return {status:404,error:'Không tìm thấy hồ sơ.'};
  const phone=normalizePhone(person.phone||'');if(blocked&&!phone)return {status:400,error:'Cần bổ sung số điện thoại trước khi đánh dấu blacklist.'};
  if(blocked)await db.prepare('INSERT INTO participant_blacklist (phone,participant_id,created_at,created_by) VALUES (?,?,?,?) ON CONFLICT(phone) DO UPDATE SET participant_id=excluded.participant_id,created_at=excluded.created_at,created_by=excluded.created_by').run(phone,id,new Date().toISOString(),userId);
  else await db.prepare('DELETE FROM participant_blacklist WHERE participant_id = ?').run(id);
  return {status:200,blacklisted:blocked};
 })();
}
