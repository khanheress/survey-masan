import test from 'node:test';
import assert from 'node:assert/strict';
import Database from './support/database.mjs';
import {initializeParticipantStore,recordParticipant} from '../src/lib/participantStore.mjs';
import {editParticipant} from '../src/lib/participantEditing.mjs';
import {initializeDeliveryStore,getProjectDeliveries,saveDelivery} from '../src/lib/deliveryStore.mjs';
async function setup(){const db=new Database(':memory:');await db.exec(`CREATE TABLE projects(id TEXT,name TEXT,status TEXT);INSERT INTO projects VALUES ('p','Dự án 1','active'),('p2','Dự án 2','active');CREATE TABLE surveys(id TEXT,title TEXT);CREATE TABLE responses(id TEXT,project_id TEXT,survey_id TEXT,respondent_name TEXT,respondent_phone TEXT,respondent_address TEXT,review_status TEXT,created_at TEXT);`);await initializeParticipantStore(db);await initializeDeliveryStore(db);return db;}
async function add(db,id,project,phone,status='approved'){const response={id,project_id:project,survey_id:'s',respondent_name:'Người '+phone,respondent_phone:phone,respondent_address:'Địa chỉ gốc',created_at:'2026-09-16 00:00:00'};await db.prepare('INSERT INTO responses VALUES (?,?,?,?,?,?,?,?)').run(id,project,'s',response.respondent_name,phone,response.respondent_address,status,response.created_at);await recordParticipant(db,response);}
test('deliveries include only approved people, deduplicate within project and isolate project status/notes',async()=>{const db=await setup();try{
 await add(db,'a','p','0901234567');await add(db,'b','p','+84901234567');await add(db,'c','p','0902222222','pending');await add(db,'d','p','0903333333','rejected');await add(db,'e','p2','0901234567');
 const list=await getProjectDeliveries(db,'p');assert.equal(list.total,1);const person=list.people[0];
 const saved=await saveDelivery(db,'p',{participant_id:person.participant_id,delivered:true,notes:'Giao buổi sáng'},'admin');assert.equal(saved.delivered,true);assert.equal((await getProjectDeliveries(db,'p')).delivered,1);assert.equal((await getProjectDeliveries(db,'p2')).people[0].delivered,false);
 await saveDelivery(db,'p',{participant_id:person.participant_id,notes:'Ghi chú mới'},'admin');assert.equal((await getProjectDeliveries(db,'p')).people[0].delivered,true);
 await saveDelivery(db,'p',{participant_id:person.participant_id,delivered:false},'admin');assert.equal((await getProjectDeliveries(db,'p')).people[0].notes,'Ghi chú mới');
 await assert.rejects(saveDelivery(db,'p',{participant_id:'phone:0902222222',delivered:true},'admin'),e=>e.status===409);
 await assert.rejects(saveDelivery(db,'p',{participant_id:person.participant_id,notes:'x'.repeat(2001)},'admin'),e=>e.status===400);
 await db.prepare("UPDATE responses SET review_status='rejected' WHERE project_id='p'").run();assert.equal((await getProjectDeliveries(db,'p')).total,0);await assert.rejects(saveDelivery(db,'p',{participant_id:person.participant_id,delivered:true},'admin'),e=>e.status===409);
 }finally{await db.close();}});
test('edited profile data and phone retain delivery status and notes across projects',async()=>{const db=await setup();try{
 await add(db,'a','p','0901234567');await add(db,'b','p2','0901234567');const id='phone:0901234567';await saveDelivery(db,'p',{participant_id:id,delivered:true,notes:'Đã nhận'},'admin');
 const updated=await editParticipant(db,id,{respondent_name:'Tên sửa',respondent_phone:'0999999999',respondent_address:'Địa chỉ mới'});assert.equal(updated.status,200);
 const list=await getProjectDeliveries(db,'p');assert.equal(list.total,1);assert.equal(list.people[0].phone,'0999999999');assert.equal(list.people[0].address,'Địa chỉ mới');assert.equal(list.people[0].delivered,true);assert.equal(list.people[0].notes,'Đã nhận');assert.equal((await getProjectDeliveries(db,'p2')).people[0].delivered,false);
 await initializeDeliveryStore(db);assert.equal((await getProjectDeliveries(db,'p')).delivered,1);
 }finally{await db.close();}});
