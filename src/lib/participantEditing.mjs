import {RESPONDENT_FIELDS} from './respondent.mjs';
import {normalizePhone} from './participantStore.mjs';
export function validateProfileEdit(body) {
 const values={};
 for(const field of RESPONDENT_FIELDS){
  if(!Object.hasOwn(body,field.key))continue;
  const raw=body[field.key];if(raw!==null&&typeof raw!=='string'&&typeof raw!=='number')return {error:`${field.label} không hợp lệ.`};
  const value=String(raw??'').trim();
  if(!value){values[field.key]=null;continue;}
  if(field.maxLength&&value.length>field.maxLength)return {error:`${field.label} quá dài.`};
  if(field.options&&!field.options.includes(value))return {error:`${field.label} không hợp lệ.`};
  if(field.key==='respondent_birth_year'){if(!/^\d{4}$/.test(value)||Number(value)<1900||Number(value)>new Date().getFullYear())return {error:'Năm sinh không hợp lệ.'};values[field.key]=Number(value);}
  else values[field.key]=field.key==='respondent_phone'?normalizePhone(value):value;
 }
 if(!Object.keys(values).length)return {error:'Chưa có thông tin cần cập nhật.'};
 return {values};
}
export async function editParticipant(db,id,values){
 return db.transaction(async()=>{
  const person=await db.prepare('SELECT * FROM participants WHERE id = ?').get(id);if(!person)return {status:404,error:'Không tìm thấy hồ sơ.'};
  const profile={...JSON.parse(person.profile_json),...values};
  const phone=normalizePhone(profile.respondent_phone||'');const newId=phone?`phone:${phone}`:id;
  const conflict=await db.prepare('SELECT id FROM participants WHERE (id = ? OR phone = ?) AND id != ?').get(newId,phone||null,id);
  if(conflict)return {status:409,error:'Số điện thoại đã thuộc một hồ sơ khác. Vui lòng kiểm tra lại.'};
  const overrides={...JSON.parse(person.profile_overrides_json||'{}'),...values};
  await db.prepare('UPDATE participants SET id = ?, phone = ?, name = ?, profile_json = ?, profile_overrides_json = ? WHERE id = ?').run(newId,phone||null,profile.respondent_name||'',JSON.stringify(profile),JSON.stringify(overrides),id);
  if(newId!==id){
   await db.prepare('UPDATE participant_history SET participant_id = ? WHERE participant_id = ?').run(newId,id);
   if(await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='sample_deliveries'").get())await db.prepare('UPDATE sample_deliveries SET participant_id = ? WHERE participant_id = ?').run(newId,id);
  }
  return {status:200,id:newId,profile};
 })();
}
