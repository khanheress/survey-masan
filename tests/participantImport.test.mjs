import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import Database from './support/database.mjs';
import {initializeParticipantStore,listParticipants} from '../src/lib/participantStore.mjs';
import {IMPORT_HEADERS,parseParticipantWorkbook,importParticipants} from '../src/lib/participantImport.mjs';
const LEGACY_HEADERS=['Tên','Số điện thoại','Nghề nghiệp','Người mời','Dự án tham gia','Năm sinh','Địa chỉ','Tình trạng hôn nhân'];
async function workbook(rows,headers=LEGACY_HEADERS){const w=new ExcelJS.Workbook();const s=w.addWorksheet('Data');s.addRow(headers);rows.forEach(r=>s.addRow(r));return w.xlsx.writeBuffer();}
async function fixture(){const db=new Database();await db.exec('CREATE TABLE projects (id TEXT,name TEXT); CREATE TABLE surveys (id TEXT,title TEXT); CREATE TABLE responses (id TEXT,project_id TEXT,survey_id TEXT,created_at TEXT); INSERT INTO projects VALUES (\'p\',\'Dự án A\');');await initializeParticipantStore(db);return db;}
test('Excel parser accepts reordered columns, preserves phone and validates required fields/formulas',async()=>{
 const rows=await parseParticipantWorkbook(await workbook([['An','+84 901234567','Kế toán','khanh','Dự án A'],['B',901234568,'NV','Tế'],['C','0901234569','NV','Sai'],['D','0901234570',{formula:'1+1'},'Tế']]));
 assert.equal(rows[0].phone,'0901234567');assert.equal(rows[0].inviter,'Khánh');assert.ok(rows.slice(1).every(r=>r.error));
 const reordered=await parseParticipantWorkbook(await workbook([['Tế','0901234567','An','NV']],['Người mời','Số điện thoại','Tên','Nghề nghiệp']));assert.equal(reordered[0].project,'');assert.equal(reordered[0].name,'An');
 await assert.rejects(()=>parseParticipantWorkbook(workbook),/file Excel/);
 await assert.rejects(async()=>parseParticipantWorkbook(await workbook([],['Tên'])),/Thiếu cột/);
 await assert.rejects(async()=>parseParticipantWorkbook(await workbook(Array.from({length:1001},()=>['An','0901234567','NV','Tế']))),/1.000/);
});
test('preview is read only; commits valid rows, deduplicates repeat imports and supports profiles without projects',async()=>{
 const db=await fixture();try{
 const rows=await parseParticipantWorkbook(await workbook([['An','0901234567','NV','Khánh','Dự án A'],['Trùng','+84901234567','NV','Khánh'],['B','0901234568','NV','Tế'],['C','0901234569','NV','Khánh','Dự án cũ'],['Lỗi','','NV','Khánh']]));
 const preview=await importParticipants(db,rows);assert.equal(preview.valid,3);assert.equal(preview.skipped,1);assert.equal(preview.errors,1);assert.equal((await listParticipants(db)).pagination.total,0);
 const result=await importParticipants(db,rows,true);assert.equal(result.added,3);assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM responses').get()).n,0);
 assert.equal((await listParticipants(db,{inviter:'Tế'})).pagination.total,1);assert.equal((await listParticipants(db,{projectId:'p',inviter:'Khánh'})).pagination.total,1);
 assert.equal((await listParticipants(db,{search:'0901234569'})).participants[0].projects[0].name,'Dự án cũ');
 const repeated=await importParticipants(db,rows,true);assert.equal(repeated.added,0);assert.equal(repeated.skipped,4);assert.equal((await listParticipants(db,{search:'0901234567'})).participants[0].respondent_name,'An');
 }finally{await db.close();}
});
test('ambiguous projects are rejected and database errors roll back the entire import',async()=>{
 const db=await fixture();try{
 await db.exec("INSERT INTO projects VALUES ('p2','Dự án A');");const rows=await parseParticipantWorkbook(await workbook([['An','0901234567','NV','Tế','Dự án A']]));assert.equal((await importParticipants(db,rows,true)).errors,1);
 await db.exec("CREATE TRIGGER fail_import BEFORE INSERT ON participant_history BEGIN SELECT RAISE(ABORT,'test failure'); END;");const valid=await parseParticipantWorkbook(await workbook([['An','0901234567','NV','Tế'],['B','0901234568','NV','Tế','Cũ']]));await assert.rejects(()=>importParticipants(db,valid,true));assert.equal((await listParticipants(db)).pagination.total,0);
 }finally{await db.close();}
});

test('optional profile columns are saved; old templates and empty optional cells remain supported',async()=>{
 const db=await fixture();try{
 const rows=await parseParticipantWorkbook(await workbook([
 ['An','0901234501','NV','Khánh','',1995,'12 Đường A','Đã kết hôn - có con'],
 ['B','0901234502','NV','Tế','','','',''],
 ]));
 assert.equal(rows[0].birthYear,1995);assert.equal(rows[0].address,'12 Đường A');assert.equal(rows[0].maritalStatus,'Đã kết hôn - có con');
 assert.equal(rows[1].birthYear,null);assert.equal(rows[1].maritalStatus,null);
 await importParticipants(db,rows,true);
 const person=(await listParticipants(db,{search:'0901234501'})).participants[0];assert.equal(person.respondent_birth_year,1995);assert.equal(person.respondent_address,'12 Đường A');assert.equal(person.respondent_marital_status,'Đã kết hôn - có con');
 const legacy=await parseParticipantWorkbook(await workbook([['C','0901234503','NV','Tế','']],LEGACY_HEADERS.slice(0,5)));assert.equal(legacy[0].birthYear,null);assert.equal(legacy[0].address,null);assert.equal(legacy[0].maritalStatus,null);assert.equal((await importParticipants(db,legacy,true)).added,1);
 }finally{await db.close();}
});
test('optional fields validate nonempty values and accept reordered headers',async()=>{
 const input=(year,address='',marital='')=>['An','0901234501','NV','Khánh','',year,address,marital];
 const rows=await parseParticipantWorkbook(await workbook([input('1899'),input(String(new Date().getFullYear()+1)),input('1995.5'),input('abc'),input('', 'a'.repeat(1001)),input('','','Không rõ'),input(1900,'','Độc thân'),input(new Date().getFullYear(),'','Đã kết hôn - chưa con')]));
 assert.ok(rows.slice(0,6).every(r=>r.error));assert.ok(rows.slice(6).every(r=>!r.error));
 const reordered=await parseParticipantWorkbook(await workbook([['An',1990,'0901234501','Địa chỉ mới','NV','Độc thân','','Tế']],IMPORT_HEADERS));assert.equal(reordered[0].birthYear,1990);assert.equal(reordered[0].address,'Địa chỉ mới');
});
