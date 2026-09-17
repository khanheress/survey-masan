import test from 'node:test';
import assert from 'node:assert/strict';
import Database from './support/database.mjs';
import {initializeParticipantStore,recordParticipant,listParticipants} from '../src/lib/participantStore.mjs';
import {initializePerformanceIndexes} from '../src/lib/performanceIndexes.mjs';
import {projectQuotaCounts,countProjectQuotaRows,emptyProjectRules} from '../src/lib/projectRules.mjs';
test('participant history loads in a fixed four queries for a full page',async()=>{
 const db=new Database();try{await db.exec('CREATE TABLE projects(id TEXT,name TEXT);CREATE TABLE surveys(id TEXT,title TEXT);CREATE TABLE responses(id TEXT,project_id TEXT,survey_id TEXT,created_at TEXT);');await initializeParticipantStore(db);for(let i=0;i<25;i++)await recordParticipant(db,{id:`r${i}`,respondent_name:`Người ${i}`,respondent_phone:`090000${String(i).padStart(4,'0')}`,project_id:'p',project_name:'Dự án',created_at:'2026-09-01'});let queries=0;const counted={prepare(sql){queries++;return db.prepare(sql);}};const result=await listParticipants(counted);assert.equal(queries,4);assert.equal(result.participants.length,20);assert.ok(result.participants.every(p=>p.history.length===1&&p.projects[0].id==='p'));queries=0;assert.equal((await listParticipants(counted,{exportAll:true})).participants.length,25);assert.equal(queries,4);
 }finally{await db.close();}
});
test('indexes are repeatable and used for project, survey phone, month and visible history queries; batch quotas match individual calculation',async()=>{
 const db=new Database();try{await db.exec(`CREATE TABLE responses(project_id TEXT,survey_id TEXT,respondent_phone TEXT,respondent_inviter TEXT,review_status TEXT,created_at TEXT,respondent_gender TEXT,respondent_birth_year INTEGER,respondent_age INTEGER,respondent_bumo TEXT);CREATE TABLE surveys(project_id TEXT,created_at TEXT);CREATE TABLE participant_history(participant_id TEXT,project_id TEXT,removed_from_profile INTEGER,submitted_at TEXT);`);await initializePerformanceIndexes(db);await initializePerformanceIndexes(db);
 for(const [sql,index] of [["SELECT * FROM responses WHERE project_id='p' ORDER BY created_at",'responses_project_created'],["SELECT * FROM responses WHERE survey_id='s' AND respondent_phone='0901234567'",'responses_survey_phone'],["SELECT respondent_inviter,COUNT(*) FROM responses WHERE strftime('%Y-%m',datetime(created_at,'+7 hours'))='2026-09' GROUP BY respondent_inviter",'responses_inviter_month'],["SELECT * FROM participant_history WHERE participant_id='person' AND removed_from_profile=0 ORDER BY submitted_at",'history_person_visible']]){const plan=await db.prepare('EXPLAIN QUERY PLAN '+sql).all();assert.ok(plan.some(row=>row.detail.includes(index)),JSON.stringify(plan));}
 await db.prepare('INSERT INTO responses(project_id,respondent_gender,respondent_age,respondent_bumo,created_at) VALUES(?,?,?,?,?)').run('p','Nam',25,'["A"]','2026-09-01');const rules=emptyProjectRules();rules.age.bands=[{min:18,max:30,quota:10}];assert.deepEqual(countProjectQuotaRows(await db.prepare('SELECT * FROM responses').all(),rules),await projectQuotaCounts(db,'p',rules));
 }finally{await db.close();}
});

test('delivery project counters use four queries and match approved unique participants only',async()=>{
 const {listDeliveryProjects}=await import('../src/lib/deliveryStore.mjs');const db=new Database();try{await db.exec(`CREATE TABLE projects(id TEXT,name TEXT,status TEXT,created_at TEXT);CREATE TABLE responses(id TEXT,project_id TEXT,respondent_phone TEXT,review_status TEXT);CREATE TABLE participant_history(response_id TEXT,participant_id TEXT);CREATE TABLE project_members(project_id TEXT,participant_id TEXT,review_status TEXT);CREATE TABLE participants(id TEXT);CREATE TABLE sample_deliveries(project_id TEXT,participant_id TEXT,delivered INTEGER);
 INSERT INTO projects VALUES('p','A','active','2026-09-01'),('q','B','active','2026-09-01');
 INSERT INTO responses VALUES('r','p','0901234567','approved'),('r2','p','+84901234567','approved'),('r3','p','0901234568','rejected');
 INSERT INTO participants VALUES('phone:0901234567'),('excel'),('no');INSERT INTO project_members VALUES('p','phone:0901234567','approved'),('p','excel','approved'),('p','no','pending');
 INSERT INTO sample_deliveries VALUES('p','phone:0901234567',1),('p','excel',0),('p','no',1);`);let queries=0;const result=await listDeliveryProjects({prepare(sql){queries++;return db.prepare(sql);}});assert.equal(queries,4);assert.equal(result.find(p=>p.id==='p').total,2);assert.equal(result.find(p=>p.id==='p').delivered,1);assert.equal(result.find(p=>p.id==='q').total,0);
 }finally{await db.close();}
});
