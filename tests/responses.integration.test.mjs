import * as surveyFlow from '../src/lib/surveyFlow.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { randomUUID } from 'node:crypto';
import Database from './support/database.mjs';
import Papa from 'papaparse';
import { validateRespondent, RESPONDENT_FIELDS } from '../src/lib/respondent.mjs';
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
    const context = vm.createContext({ URL, console });
    let signedIn = true;
    const imports = {
      'next/server': { NextResponse },
      'next-auth/next': { getServerSession: async () => signedIn ? { user: { role: 'admin' } } : null },
      '@/lib/authOptions': { authOptions: {} },
      '@/lib/db': { getDb: () => db },
      '@/lib/surveyFlow.mjs': surveyFlow,
      '@/lib/respondent.mjs': { validateRespondent, RESPONDENT_FIELDS },
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
      survey_id: 's', respondent_name: 'Nguyễn An', respondent_birth_year: '1990', respondent_phone: '0900000000',
      respondent_address: '12 đường A, phường B', respondent_occupation: 'Nhân viên "văn phòng"',
      respondent_marital_status: 'Đã kết hôn - có con', respondent_inviter: 'Tế', answers_json: { q1: ['A', 'B'], q2: 'Câu trả lời' }
    };
    const request = (body) => new Request('http://localhost/api/responses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    assert.equal((await route.POST(request({ ...payload, respondent_address: '' }))).status, 400);
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM responses').get()).n, 0);
    assert.equal((await route.POST(request(payload))).status, 201);
    assert.equal((await route.POST(request(payload))).status, 409);
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
  } finally {await db.close();}
});
