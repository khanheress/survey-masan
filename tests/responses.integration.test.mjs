import * as participantBlacklist from '../src/lib/participantBlacklist.mjs';
import * as responseReview from '../src/lib/responseReview.mjs';
import * as participantEditing from '../src/lib/participantEditing.mjs';
import ExcelJS from 'exceljs';
import * as projectExport from '../src/lib/projectExport.mjs';
import * as projectRules from '../src/lib/projectRules.mjs';
import { formatAnswer, validateAdvancedAnswer, pipeText } from '../src/lib/surveyAdvanced.mjs';
import * as surveyFlow from '../src/lib/surveyFlow.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { randomUUID } from 'node:crypto';
import Database from './support/database.mjs';
import Papa from 'papaparse';
import { validateRespondent, RESPONDENT_FIELDS, INVITERS } from '../src/lib/respondent.mjs';
import { migrateResponseProfile } from '../src/lib/responseMigration.mjs';
import { initializeParticipantStore, recordParticipant, listParticipants } from '../src/lib/participantStore.mjs';
import { getSurveyAvailability } from '../src/lib/surveyAvailability.mjs';
const require = createRequire(import.meta.url);
const { NextResponse } = require('next/server');

test('submission, listing and CSV retain all profile fields and answers', async () => {
  const db = new Database(':memory:');
  try {
    await db.exec(`CREATE TABLE projects (id TEXT, name TEXT, status TEXT, start_date TEXT, end_date TEXT, max_responses INTEGER);
      CREATE TABLE surveys (id TEXT, project_id TEXT, title TEXT, is_published INTEGER, fields_json TEXT);
      CREATE TABLE responses (id TEXT, survey_id TEXT, project_id TEXT, respondent_phone TEXT, respondent_name TEXT,
        respondent_email TEXT, data_json TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
      INSERT INTO projects VALUES ('p', 'Dự án thử', 'active', '', '', 10);
      INSERT INTO surveys VALUES ('s', 'p', 'Khảo sát thử', 1, '[]');`);
    await db.prepare('UPDATE surveys SET fields_json = ?').run(JSON.stringify([
      {id:'q1',type:'checkbox',label:'Choices',options:['A','B']}, {id:'q2',type:'short_text',label:'Text'}
    ]));
    await migrateResponseProfile(db);
    await initializeParticipantStore(db);
    const context = vm.createContext({ URL, console, Buffer, Response, process:{env:{}} });
    let signedIn = true;
    let role = 'admin';
    const imports = {
      'next/server': { NextResponse },
      'next-auth/next': { getServerSession: async () => signedIn ? { user: { role,id:'admin-test' } } : null },
      '@/lib/participantBlacklist.mjs':participantBlacklist,
      '@/lib/authOptions': { authOptions: {} },
      '@/lib/db': { getDb: () => db },
      '@/lib/surveyFlow.mjs': surveyFlow,
      '@/lib/projectRules.mjs': projectRules,
      '@/lib/projectExport.mjs': projectExport,
      '@/lib/responseReview.mjs': responseReview,
      '@/lib/participantEditing.mjs': participantEditing,
      exceljs: {default:ExcelJS},
      '@/lib/surveyAdvanced.mjs': { formatAnswer, validateAdvancedAnswer, pipeText },
      '@/lib/respondent.mjs': { validateRespondent, RESPONDENT_FIELDS, INVITERS },
      '@/lib/participantStore.mjs': { recordParticipant, listParticipants },
      '@/lib/surveyAvailability.mjs': { getSurveyAvailability },
      uuid: { v4: randomUUID },
      papaparse: { default: Papa }
    };
    async function loadRoute(path) {
      const source = await readFile(new URL(path, import.meta.url), 'utf8');
      const routeModule = new vm.SourceTextModule(source, { context });
      await routeModule.link((specifier) => {
        const exports = imports[specifier];
        assert.ok(exports, specifier);
        return new vm.SyntheticModule(Object.keys(exports), function () {
          for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
        }, { context });
      });
      await routeModule.evaluate();
      return routeModule.namespace;
    }
    const route = await loadRoute('../src/app/api/responses/route.js');
    const payload = {
      survey_id: 's', respondent_gender: 'Nam', respondent_name: 'Nguyễn An', respondent_birth_year: '1990', respondent_phone: '0900000000',
      respondent_address: '12 đường A, phường B', respondent_occupation: 'Nhân viên "văn phòng"',
      respondent_marital_status: 'Đã kết hôn - có con', respondent_inviter: 'Tế', answers_json: { q1: ['A', 'B'], q2: 'Câu trả lời' }
    };
    const request = (body) => new Request('http://localhost/api/responses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    assert.equal((await route.POST(request({ ...payload, respondent_address: '' }))).status, 400);
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM responses').get()).n, 0);
    assert.equal((await route.POST(request(payload))).status, 201);
    assert.equal((await route.POST(request(payload))).status, 409);
    const blacklistRoute=await loadRoute('../src/app/api/participants/[id]/blacklist/route.js');
    const blacklistContext={params:Promise.resolve({id:'phone:0900000000'})};
    signedIn=false;assert.equal((await blacklistRoute.PATCH(request({blacklisted:true}),blacklistContext)).status,401);
    signedIn=true;role='moderator';assert.equal((await blacklistRoute.PATCH(request({blacklisted:true}),blacklistContext)).status,403);role='admin';
    assert.equal((await blacklistRoute.PATCH(request({blacklisted:true}),blacklistContext)).status,200);
    for(const phone of ['0900000000','+84 900000000','0084900000000'])assert.equal((await route.POST(request({...payload,respondent_phone:phone}))).status,403);
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM responses').get()).n,1);
    assert.equal((await blacklistRoute.PATCH(request({blacklisted:false}),blacklistContext)).status,200);
    assert.equal((await route.POST(request(payload))).status,409);
    const saved = await db.prepare('SELECT * FROM responses').get();
    for (const key of ['respondent_name', 'respondent_phone', 'respondent_address', 'respondent_occupation', 'respondent_marital_status', 'respondent_inviter']) assert.equal(saved[key], payload[key]);
    assert.equal(saved.respondent_birth_year, 1990);
    const people = (await listParticipants(db)).participants;
    assert.equal(people.length, 1);
    assert.equal(people[0].projects[0].name, 'Dự án thử');
    assert.equal(people[0].respondent_inviter, 'Tế');
    assert.deepEqual(JSON.parse(saved.data_json), payload.answers_json);
    const listing = await (await route.GET(new Request('http://localhost/api/responses?project_id=p'))).json();
    assert.equal(listing.responses[0].respondent_marital_status, payload.respondent_marital_status);
    assert.deepEqual(listing.responses[0].answers_json, payload.answers_json);
    const participantRoute = await loadRoute('../src/app/api/participants/route.js');
    const participantList = await (await participantRoute.GET(new Request('http://localhost/api/participants'))).json();
    assert.equal(participantList.participants[0].respondent_name, payload.respondent_name);
    const participantCsv = await (await participantRoute.GET(new Request('http://localhost/api/participants?format=csv'))).text();
    assert.equal(Papa.parse(participantCsv, { header: true }).data[0]['Dự án đã tham gia'], 'Dự án thử');
    signedIn = false;
    assert.equal((await participantRoute.GET(new Request('http://localhost/api/participants'))).status, 401);
    assert.equal((await participantRoute.GET(new Request('http://localhost/api/participants?format=csv'))).status, 401);
    signedIn = true;
    const exportRoute = await loadRoute('../src/app/api/responses/export/route.js');
    const exported = await exportRoute.GET(new Request('http://localhost/api/responses/export?project_id=p'));
    assert.equal(exported.status, 200);
    const rows = Papa.parse(await exported.text(), { header: true }).data;
    assert.equal(rows[0]['Người mời'], 'Tế');
    assert.equal(rows[0]['Năm sinh'], '1990');
    assert.equal(rows[0]['Địa chỉ'], payload.respondent_address);
    assert.equal(rows[0]['Nghề nghiệp hiện tại'], payload.respondent_occupation);
    assert.equal(rows[0]['Tình trạng hôn nhân'], payload.respondent_marital_status);
    // The server independently enforces branches; hidden answers never enter storage.
    const definition = [
      {id:'gate',type:'multiple_choice',label:'Điều kiện',options:['Có','Không'],rules:[{value:'Không',target:'screenout'},{value:'Có',target:'shown'}]},
      {id:'hidden',type:'short_text',label:'Ẩn',required:true},
      {id:'shown',type:'short_text',label:'Hiện',required:true}
    ];
    await db.prepare('UPDATE surveys SET fields_json = ?').run(JSON.stringify(definition));
    const before = (await db.prepare('SELECT COUNT(*) AS n FROM responses').get()).n;
    const screened = await route.POST(request({...payload,respondent_phone:'0900000001',answers_json:{gate:'Không',shown:'bypass'}}));
    assert.equal(screened.status,422);
    assert.equal((await screened.json()).reason,'screenout');
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM responses').get()).n,before);
    assert.equal((await route.POST(request({...payload,respondent_phone:'0900000001',answers_json:{gate:'Có'}}))).status,400);
    assert.equal((await route.POST(request({...payload,respondent_phone:'0900000001',answers_json:{gate:'Có',shown:'ok',hidden:'discard'}}))).status,201);
    const branched=await db.prepare('SELECT data_json FROM responses WHERE respondent_phone = ?').get('0900000001');
    assert.deepEqual(JSON.parse(branched.data_json),{gate:'Có',shown:'ok'});
    const adminRoute=await loadRoute('../src/app/api/surveys/[id]/route.js');
    const invalid=[...definition];invalid[0]={...definition[0],rules:[{value:'Có',target:'missing'}]};
    const invalidSave=await adminRoute.PUT(new Request('http://localhost/api/surveys/s',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({fields_json:invalid})}),{params:Promise.resolve({id:'s'})});
    assert.equal(invalidSave.status,400);
    assert.deepEqual(JSON.parse((await db.prepare('SELECT fields_json FROM surveys').get()).fields_json),definition);
    const validSave=await adminRoute.PUT(new Request('http://localhost/api/surveys/s',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({fields_json:definition})}),{params:Promise.resolve({id:'s'})});
    assert.equal(validSave.status,200);
    const deleteRoute = await loadRoute('../src/app/api/responses/[id]/route.js');
    const deleteRequest = new Request('http://localhost/api/responses/' + saved.id, { method: 'DELETE' });
    const deleteContext = { params: Promise.resolve({ id: saved.id }) };
    const countBeforeDelete = (await db.prepare('SELECT COUNT(*) AS n FROM responses').get()).n;
    signedIn = false;
    assert.equal((await deleteRoute.DELETE(deleteRequest, deleteContext)).status, 401);
    signedIn = true; role = 'moderator';
    assert.equal((await deleteRoute.DELETE(deleteRequest, deleteContext)).status, 403);
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM responses').get()).n, countBeforeDelete);
    role = 'admin';
    const reviewRequest=status=>new Request('http://localhost/review',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({review_status:status})});
    signedIn=false;assert.equal((await deleteRoute.PATCH(reviewRequest('approved'),deleteContext)).status,401);signedIn=true;role='moderator';assert.equal((await deleteRoute.PATCH(reviewRequest('approved'),deleteContext)).status,403);role='admin';
    assert.equal((await deleteRoute.PATCH(reviewRequest('unknown'),deleteContext)).status,400);
    assert.equal((await deleteRoute.PATCH(reviewRequest('rejected'),deleteContext)).status,200);
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM responses').get()).n,countBeforeDelete);
    const reviewed=await(await route.GET(new Request('http://localhost/api/responses?review_status=rejected'))).json();assert.equal(reviewed.responses.length,1);assert.equal(reviewed.responses[0].review_status,'rejected');
    assert.equal((await deleteRoute.PATCH(reviewRequest('approved'),deleteContext)).status,200);
    const archiveBefore = await listParticipants(db);
    assert.equal((await deleteRoute.DELETE(deleteRequest, deleteContext)).status, 200);
    assert.equal(await db.prepare('SELECT * FROM responses WHERE id = ?').get(saved.id), undefined);
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM responses').get()).n, countBeforeDelete - 1);
    assert.deepEqual(await listParticipants(db), archiveBefore);
    assert.equal((await deleteRoute.DELETE(deleteRequest, deleteContext)).status, 404);
    assert.equal((await deleteRoute.DELETE(deleteRequest, { params: Promise.resolve({id: "' OR 1=1 --"}) })).status, 404);
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM responses').get()).n, countBeforeDelete - 1);
    const afterDelete = await (await route.GET(new Request('http://localhost/api/responses'))).json();
    assert.equal(afterDelete.responses.some(item => item.id === saved.id), false);
    // Deletion frees the previous phone only in this survey, allowing a fresh valid submission.
    assert.equal((await route.POST(request({...payload,answers_json:{gate:'Có',shown:'new submission'}}))).status, 201);
    const fileBytes = Buffer.from('%PDF-1.4\nExample');
    const file = {kind:'file',name:'test.pdf',mime:'application/pdf',size:fileBytes.length,data:fileBytes.toString('base64')};
    await db.prepare('UPDATE surveys SET fields_json = ?').run(JSON.stringify([{id:'file',type:'file',label:'Tệp',required:true}]));
    const uploaded = await route.POST(request({...payload,respondent_phone:'0900000002',answers_json:{file}}));
    assert.equal(uploaded.status,201);
    const uploadId = (await uploaded.json()).id;
    const publicMetadata = await (await route.GET(new Request('http://localhost/api/responses'))).json();
    const listedFile = publicMetadata.responses.find(r=>r.id===uploadId);
    assert.equal(listedFile.answers_json.file.data,undefined);
    assert.ok(!listedFile.data_json.includes(file.data));
    const downloadRoute = await loadRoute('../src/app/api/responses/[id]/files/[fieldId]/route.js');
    const fileContext = {params:Promise.resolve({id:uploadId,fieldId:'file'})};
    signedIn = false;
    assert.equal((await downloadRoute.GET(new Request('http://localhost/file'),fileContext)).status,401);
    signedIn = true;
    const download = await downloadRoute.GET(new Request('http://localhost/file'),fileContext);
    assert.equal(download.status,200);
    assert.equal(download.headers.get('Cache-Control'),'private, no-store');
    assert.deepEqual(Buffer.from(await download.arrayBuffer()),fileBytes);
    assert.equal((await downloadRoute.GET(new Request('http://localhost/file'),{params:Promise.resolve({id:uploadId,fieldId:'missing'})})).status,404);
    // Configure project quotas, then compete for the final slot across concurrent submissions.
    await projectRules.migrateProjectRules(db);
    await db.exec("ALTER TABLE projects ADD COLUMN created_at TEXT; ALTER TABLE surveys ADD COLUMN created_at TEXT;");
    await db.prepare('DELETE FROM responses').run();
    const rules=projectRules.emptyProjectRules();rules.gender={enabled:true,quotas:{Nam:1,'Nữ':2}};
    rules.age={enabled:true,bands:[{min:18,max:45,quota:3}]};rules.bumo={enabled:true,products:[{name:'Sting',quota:3}]};
    await db.prepare('UPDATE projects SET rules_json = ?, max_responses = 0').run(JSON.stringify(rules));
    await db.prepare('UPDATE surveys SET fields_json = ?').run(JSON.stringify([{id:'brand',type:'multiple_choice',purpose:'bumo',label:'Thương hiệu dùng thường xuyên nhất?',options:['Sting','Khác'],required:true},{id:'why',type:'short_text',label:'Vì sao chọn {{q:brand}}?'}]));
    const contestant={...payload,respondent_birth_year:new Date().getFullYear()-25,answers_json:{brand:'Sting',why:'=1+1'}};
    const concurrent=await Promise.all(['0911111111','0922222222'].map(phone=>route.POST(request({...contestant,respondent_phone:phone}))));
    assert.deepEqual(concurrent.map(r=>r.status).sort(),[201,422]);
    const rejection=await concurrent.find(r=>r.status===422).json();assert.match(rejection.error,/liên hệ lại.*Tế/);
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM responses').get()).n,1);
    assert.equal((await route.POST(request({...contestant,respondent_phone:'0933333333',respondent_gender:'Nữ',answers_json:{brand:'Khác'}}))).status,422);
    assert.equal((await route.POST(request({...contestant,respondent_phone:'0933333333',respondent_gender:'Nữ',respondent_birth_year:1950}))).status,422);
    assert.equal((await route.POST(request({...contestant,respondent_phone:'0933333333',respondent_gender:'Nữ',respondent_inviter:'Khánh'}))).status,201);
    const first=await db.prepare("SELECT * FROM responses WHERE respondent_gender = 'Nam'").get();
    await db.prepare('UPDATE surveys SET fields_json = ?').run(JSON.stringify([{id:'brand',type:'multiple_choice',purpose:'bumo',label:'Tên đã đổi',options:['Sting'],required:true}]));
    const filtered=await(await route.GET(new Request('http://localhost/api/responses?inviter=Khánh&sort=inviter_asc'))).json();assert.equal(filtered.pagination.total,1);assert.equal(filtered.responses[0].question_labels.brand,'Thương hiệu dùng thường xuyên nhất?');assert.equal(filtered.responses[0].question_labels.why,'Vì sao chọn Sting?');
    const sorted=await(await route.GET(new Request('http://localhost/api/responses?sort=inviter_asc'))).json();assert.deepEqual(sorted.responses.map(r=>r.respondent_inviter),['Khánh','Tế']);
    const counts=await projectRules.projectQuotaCounts(db,'p',rules);assert.equal(counts.gender.Nam,1);assert.equal(counts.gender['Nữ'],1);assert.equal(counts.bumo.Sting,2);
    await deleteRoute.DELETE(new Request('http://localhost/delete',{method:'DELETE'}),{params:Promise.resolve({id:first.id})});
    assert.equal((await route.POST(request({...contestant,respondent_phone:'0944444444',answers_json:{brand:'Sting'}}))).status,201);
    // All rows exported, even beyond the response page size; selected columns only, safe string cells.
    for(let i=0;i<12;i++)await db.prepare('INSERT INTO responses (id,project_id,survey_id,respondent_name,respondent_inviter,data_json,created_at) VALUES (?,?,?,?,?,?,?)').run('extra'+i,'p','s','Người '+i,'Khánh','{"why":"=1+1"}','2026-08-31 17:00:00');
    const xlsx=await loadRoute('../src/app/api/projects/[id]/export/route.js'),projectContext={params:Promise.resolve({id:'p'})};
    const metadata=await(await xlsx.GET(new Request('http://localhost/export'),projectContext)).json();assert.equal(metadata.total,14);
    const why=metadata.columns.find(c=>c.questionId==='why');assert.ok(why);assert.ok(metadata.columns.some(c=>c.key==='respondent_gender'));
    const fileResponse=await xlsx.POST(request({columns:['respondent_name',why.key]}),projectContext);assert.equal(fileResponse.status,200);
    const book=new ExcelJS.Workbook();await book.xlsx.load(Buffer.from(await fileResponse.arrayBuffer()));const sheet=book.worksheets[0];assert.equal(sheet.columnCount,2);assert.equal(sheet.rowCount,15);assert.equal(sheet.getCell('A1').value,'Tên');assert.equal(sheet.getCell('B2').type,ExcelJS.ValueType.String);assert.equal(sheet.getCell('B2').value,'=1+1');
    assert.equal((await xlsx.POST(request({columns:['bad']}),projectContext)).status,400);
    const googleData=await(await xlsx.POST(request({format:'google',columns:['respondent_name',why.key]}),projectContext)).json();assert.equal(googleData.values.length,15);assert.deepEqual(googleData.values[0],['Tên',why.label]);assert.equal(googleData.values[1][1],'=1+1');
    signedIn=false;assert.equal((await xlsx.GET(new Request('http://localhost/export'),projectContext)).status,401);assert.equal((await xlsx.POST(request({columns:['respondent_name']}),projectContext)).status,401);signedIn=true;
    await db.prepare("UPDATE responses SET created_at='2026-08-31 16:59:59' WHERE id='extra0'").run();
    await db.prepare("UPDATE responses SET created_at='2026-09-15 01:00:00' WHERE id NOT LIKE 'extra%'").run();
    const stats=await loadRoute('../src/app/api/stats/route.js');const september=await(await stats.GET(new Request('http://localhost/api/stats?month=2026-09'))).json();
    assert.ok(september.stats);assert.equal(september.monthly_inviters.find(i=>i.inviter==='Khánh').count,12); // 11 boundary fixtures + one real response in September 2026.
    const august=await(await stats.GET(new Request('http://localhost/api/stats?month=2026-08'))).json();assert.equal(august.monthly_inviters.find(i=>i.inviter==='Khánh').count,1);
    assert.equal((await stats.GET(new Request('http://localhost/api/stats?month=2026-99'))).status,400);
    const editRoute=await loadRoute('../src/app/api/participants/[id]/route.js');const editContext={params:Promise.resolve({id:'phone:0933333333'})};const editRequest=body=>new Request('http://localhost/edit',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    signedIn=false;assert.equal((await editRoute.PATCH(editRequest({respondent_name:'Tên mới'}),editContext)).status,401);signedIn=true;role='moderator';assert.equal((await editRoute.PATCH(editRequest({respondent_name:'Tên mới'}),editContext)).status,403);role='admin';
    assert.equal((await editRoute.PATCH(editRequest({respondent_gender:'invalid'}),editContext)).status,400);
    assert.equal((await editRoute.PATCH(editRequest({respondent_name:'Tên đã sửa',respondent_phone:'0998887777'}),editContext)).status,200);
    const renamed=await db.prepare("SELECT * FROM participants WHERE id='phone:0998887777'").get();assert.equal(JSON.parse(renamed.profile_json).respondent_name,'Tên đã sửa');assert.ok((await db.prepare("SELECT COUNT(*) AS n FROM participant_history WHERE participant_id='phone:0998887777'").get()).n>0);
    assert.equal((await db.prepare("SELECT respondent_name FROM responses WHERE respondent_phone='0933333333'").get()).respondent_name,payload.respondent_name);
    await recordParticipant(db,{id:'later',project_id:'p',survey_id:'s',respondent_phone:'0998887777',respondent_name:'Tên nhập lại',created_at:'2030-01-01 00:00:00'});
    assert.equal(JSON.parse((await db.prepare("SELECT profile_json FROM participants WHERE id='phone:0998887777'").get()).profile_json).respondent_name,'Tên đã sửa');
    assert.equal((await editRoute.PATCH(editRequest({respondent_phone:'0998887777'}),{params:Promise.resolve({id:'phone:0944444444'})})).status,409);
  } finally {await db.close();}
});
