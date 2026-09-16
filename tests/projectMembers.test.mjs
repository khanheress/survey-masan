import test from 'node:test';
import assert from 'node:assert/strict';
import Database from './support/database.mjs';
import {initializeParticipantStore,listParticipants} from '../src/lib/participantStore.mjs';
import {initializeProjectMembers,importProjectMembers,listProjectMembers,reviewProjectMember} from '../src/lib/projectMembers.mjs';
import {initializeDeliveryStore,getProjectDeliveries,saveDelivery} from '../src/lib/deliveryStore.mjs';
import {editParticipant} from '../src/lib/participantEditing.mjs';
async function fixture(){const db=new Database();await db.exec("CREATE TABLE projects (id TEXT PRIMARY KEY,name TEXT,status TEXT); CREATE TABLE surveys (id TEXT,title TEXT); CREATE TABLE responses (id TEXT,project_id TEXT,survey_id TEXT,respondent_name TEXT,respondent_phone TEXT,respondent_address TEXT,review_status TEXT,created_at TEXT); INSERT INTO projects VALUES ('p','Dự án A','active'),('q','Dự án B','active');");await initializeParticipantStore(db);await initializeProjectMembers(db);await initializeDeliveryStore(db);return db;}
const row={row:2,name:'An',phone:'0901234567',occupation:'NV',inviter:'Khánh',birthYear:1990,address:'Địa chỉ',maritalStatus:'Độc thân',project:'Dự án khác'};
test('project import previews without writes, approves directly, links archive and delivery without creating survey answers',async()=>{
 const db=await fixture();try{
 assert.equal((await importProjectMembers(db,'p',[row])).valid,1);assert.equal((await listProjectMembers(db,'p')).length,0);
 assert.equal((await importProjectMembers(db,'p',[row],{commit:true,userId:'admin'})).added,1);
 assert.equal((await listProjectMembers(db,'p'))[0].review_status,'approved');assert.equal((await getProjectDeliveries(db,'p')).total,1);assert.equal((await getProjectDeliveries(db,'q')).total,0);
 assert.equal((await listParticipants(db,{projectId:'p'})).pagination.total,1);assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM responses').get()).n,0);
 const repeat=await importProjectMembers(db,'p',[row,row],{commit:true,userId:'admin'});assert.equal(repeat.added,0);assert.equal(repeat.skipped,2);
 }finally{await db.close();}
});
test('existing profiles are reused across projects; rejected members stay rejected on reimport; profile rekey preserves membership and delivery',async()=>{
 const db=await fixture();try{
 await importProjectMembers(db,'p',[row],{commit:true,userId:'admin'});
 const preview=await importProjectMembers(db,'q',[{...row,name:'Không ghi đè',address:'Sai'}]);assert.equal(preview.rows[0].existing,true);assert.equal(preview.rows[0].name,'An');
 await importProjectMembers(db,'q',[row],{commit:true,userId:'admin'});
 const id='phone:'+row.phone;await saveDelivery(db,'p',{participant_id:id,delivered:true,notes:'Đã giao'},'admin');await reviewProjectMember(db,'p',{participant_id:id,review_status:'rejected'},'admin');assert.equal((await getProjectDeliveries(db,'p')).total,0);
 assert.equal((await importProjectMembers(db,'p',[row],{commit:true,userId:'admin'})).skipped,1);assert.equal((await listProjectMembers(db,'p'))[0].review_status,'rejected');
 await reviewProjectMember(db,'p',{participant_id:id,review_status:'approved'},'admin');await editParticipant(db,id,{respondent_phone:'0901234599',respondent_address:'Địa chỉ mới'});
 const delivery=(await getProjectDeliveries(db,'p')).people[0];assert.equal(delivery.phone,'0901234599');assert.equal(delivery.address,'Địa chỉ mới');assert.equal(delivery.delivered,true);assert.equal(delivery.notes,'Đã giao');
 assert.equal((await listProjectMembers(db,'q'))[0].participant_id,'phone:0901234599');
 }finally{await db.close();}
});
test('skips submitted respondents, rejects missing project, and rolls back failed batch',async()=>{
 const db=await fixture();try{
 await assert.rejects(()=>importProjectMembers(db,'missing',[row],{commit:true,userId:'admin'}),e=>e.status===404);
 await db.prepare('INSERT INTO responses (id,project_id,respondent_phone,review_status) VALUES (?,?,?,?)').run('r','p','+84901234567','rejected');assert.equal((await importProjectMembers(db,'p',[row],{commit:true,userId:'admin'})).skipped,1);
 await db.exec("CREATE TRIGGER fail_member BEFORE INSERT ON project_members WHEN NEW.participant_id='phone:0901234500' BEGIN SELECT RAISE(ABORT,'test error'); END;");
 await assert.rejects(()=>importProjectMembers(db,'q',[row,{...row,phone:'0901234500',row:3}],{commit:true,userId:'admin'}));assert.equal((await listProjectMembers(db,'q')).length,0);assert.equal((await listParticipants(db)).pagination.total,0);
 }finally{await db.close();}
});
