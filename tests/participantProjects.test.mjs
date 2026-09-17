import test from 'node:test';
import assert from 'node:assert/strict';
import Database from './support/database.mjs';
import {initializeParticipantStore,listParticipants,recordParticipant} from '../src/lib/participantStore.mjs';
import {removeParticipantProject} from '../src/lib/participantProjects.mjs';
async function fixture(){const db=new Database();await db.exec(`CREATE TABLE projects(id TEXT,name TEXT);CREATE TABLE surveys(id TEXT,title TEXT);CREATE TABLE responses(id TEXT,project_id TEXT,survey_id TEXT,respondent_phone TEXT,respondent_name TEXT,created_at TEXT);INSERT INTO projects VALUES('p','Dự án'),('q','Dự án');INSERT INTO responses VALUES('r','p',NULL,'0901234567','An','2026-09-01');`);await initializeParticipantStore(db);return db;}
const row={respondent_phone:'0901234567',respondent_name:'An',created_at:'2026-09-02',project_name:'Dự án',respondent_inviter:'Khánh'};
test('removes all matching history from profile without deleting responses, is persistent across backfill and isolates project IDs',async()=>{
 const db=await fixture();try{await recordParticipant(db,{...row,id:'r2',project_id:'p'});await recordParticipant(db,{...row,id:'r3',project_id:'q'});await recordParticipant(db,{...row,id:'r4',project_id:'p',respondent_phone:'0901234568'});const id='phone:0901234567';assert.equal((await listParticipants(db,{search:'0901234567'})).participants[0].projects.length,2);const removed=await removeParticipantProject(db,id,{project_id:'p'});assert.equal(removed.removed,2);await initializeParticipantStore(db);const result=(await listParticipants(db,{search:'0901234567'})).participants[0];assert.equal(result.projects.length,1);assert.equal(result.projects[0].id,'q');assert.equal(result.history.length,1);assert.equal((await listParticipants(db,{projectId:'p'})).pagination.total,1);assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM responses').get()).n,1);assert.equal((await removeParticipantProject(db,id,{project_id:'p'})).status,404);
 }finally{await db.close();}
});
test('supports archived name-only projects and future genuine participation may reappear',async()=>{
 const db=await fixture();try{const id='phone:0901234567';await recordParticipant(db,{...row,id:'old',project_id:null,project_name:'Dự án cũ'});assert.equal((await removeParticipantProject(db,id,{project_id:null,project_name:'Dự án cũ'})).status,200);assert.equal((await listParticipants(db,{search:'0901234567'})).participants[0].projects.length,1);await removeParticipantProject(db,id,{project_id:'p'});assert.equal((await listParticipants(db,{search:'0901234567'})).participants[0].projects.length,0);await recordParticipant(db,{...row,id:'new',project_id:'p'});assert.equal((await listParticipants(db,{search:'0901234567'})).participants[0].projects.length,1);assert.equal((await removeParticipantProject(db,'missing',{project_id:'p'})).status,404);assert.equal((await removeParticipantProject(db,id,{})).status,400);
 }finally{await db.close();}
});
