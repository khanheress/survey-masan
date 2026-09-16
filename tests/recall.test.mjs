import test from 'node:test';
import assert from 'node:assert/strict';
import Database from './support/database.mjs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Worker } from 'node:worker_threads';

import { initializeRecallStore, saveRecallForm, publicRecallForm, bookRecall, getRecallForm } from '../src/lib/recallStore.mjs';

const user = { id: 'owner', role: 'moderator' };
const settings = { project_id:'p', title: 'Form thử', description: 'Lịch hẹn', allow_overlap: false, is_open: true, slots: ['2030-10-01T09:00', '2030-10-01T10:00'] };
const now = new Date('2030-09-30T00:00:00Z');
const booking = { name: 'Nguyễn An', phone: '0901234567', starts_at: settings.slots[0] };
const setup = async () => {const db = new Database(':memory:');await db.exec("CREATE TABLE IF NOT EXISTS projects(id TEXT PRIMARY KEY,name TEXT); INSERT OR IGNORE INTO projects VALUES ('p','Dự án thử');");await initializeRecallStore(db);return db;};

test('unique token, dates and public payload; no attendee personal data exposed', async () => {
  const db = await setup();
  try {
    const form = await saveRecallForm(db, settings, user);
    const second = await saveRecallForm(db, settings, user);
    assert.notEqual(form.share_token, second.share_token);
    await bookRecall(db, form.share_token, booking, now);
    const publicForm = await publicRecallForm(db, form.share_token, now);
    assert.equal(publicForm.slots[0].available, false);
    assert.equal(publicForm.slots[1].available, true);
    assert.equal(JSON.stringify(publicForm).includes(booking.phone), false);
    assert.equal(JSON.stringify(publicForm).includes(booking.name), false);
  } finally {await db.close();}
});

test('exclusive mode rejects a second person in the same slot but accepts a different slot', async () => {
  const db = await setup();
  try {
    const form = await saveRecallForm(db, settings, user);
    await bookRecall(db, form.share_token, booking, now);
    await assert.rejects(async () => await bookRecall(db, form.share_token, { ...booking, phone: '0900000001' }, now), (error) => error.status === 409);
    await bookRecall(db, form.share_token, { ...booking, phone: '0900000001', starts_at: settings.slots[1] }, now);
    assert.equal((await getRecallForm(db, form.id)).booking_count, 2);
  } finally {await db.close();}
});

test('shared mode accepts two people; duplicate phone and slot remain rejected', async () => {
  const db = await setup();
  try {
    const form = await saveRecallForm(db, { ...settings, allow_overlap: true }, user);
    await bookRecall(db, form.share_token, booking, now);
    await bookRecall(db, form.share_token, { ...booking, phone: '0900000001' }, now);
    assert.equal((await publicRecallForm(db, form.share_token, now)).slots[0].available, true);
    await assert.rejects(async () => await bookRecall(db, form.share_token, { ...booking, phone: '+84 901 234 567' }, now), (error) => error.status === 409);
    await assert.rejects(async () => await saveRecallForm(db, settings, user, form.id), (error) => error.status === 409);
  } finally {await db.close();}
});

test('validates configured dates and protects booked slots when editing', async () => {
  const db = await setup();
  try {
    for (const slots of [[], ['2030-02-30T09:00'], ['2030-10-01T24:00'], [settings.slots[0], settings.slots[0]]]) {
      await assert.rejects(async () => await saveRecallForm(db, { ...settings, slots }, user));
    }
    const form = await saveRecallForm(db, settings, user);
    await bookRecall(db, form.share_token, booking, now);
    await assert.rejects(async () => await saveRecallForm(db, { ...settings, slots: [settings.slots[1]] }, user, form.id), (error) => error.status === 409);
    const updated = await saveRecallForm(db, { ...settings, title: 'Tên mới', slots: [settings.slots[0], '2030-10-02T14:00'] }, user, form.id);
    assert.equal(updated.share_token, form.share_token);
    assert.equal(updated.booking_count, 1);
  } finally {await db.close();}
});

test('closed forms, past times, unconfigured times, and invalid attendee details are rejected', async () => {
  const db = await setup();
  try {
    const form = await saveRecallForm(db, settings, user);
    for (const input of [{ ...booking, name: '   ' }, { ...booking, phone: 'abc' }, { ...booking, starts_at: '2030-10-01T11:00' }]) await assert.rejects(async () => await bookRecall(db, form.share_token, input, now));
    await assert.rejects(async () => await bookRecall(db, form.share_token, booking, new Date('2030-10-01T02:00:00Z')), (error) => error.status === 409);
    await saveRecallForm(db, { ...settings, is_open: false }, user, form.id);
    await assert.rejects(async () => await publicRecallForm(db, form.share_token, now), (error) => error.status === 410);
    await assert.rejects(async () => await bookRecall(db, form.share_token, booking, now), (error) => error.status === 410);
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM recall_bookings').get()).n, 0);
  } finally {await db.close();}
});

test('only the owner or an admin can edit a form', async () => {
  const db = await setup();
  try {
    const form = await saveRecallForm(db, settings, user);
    await assert.rejects(async () => await saveRecallForm(db, settings, { id: 'other', role: 'moderator' }, form.id), (error) => error.status === 403);
    assert.equal((await saveRecallForm(db, settings, { id: 'admin', role: 'admin' }, form.id)).id, form.id);
  } finally {await db.close();}
});

test('two simultaneous connections cannot double-book an exclusive slot', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'recall-race-'));
  const dbPath = path.join(dir, 'test.db');
  const db = new Database(dbPath);
  await db.exec("CREATE TABLE IF NOT EXISTS projects(id TEXT PRIMARY KEY,name TEXT); INSERT OR IGNORE INTO projects VALUES ('p','Dự án thử');");await initializeRecallStore(db);
  const form = await saveRecallForm(db, settings, user);
  await db.close();
  const workers = [];
  try {
    const results = await Promise.all(['0900000001', '0900000002'].map(async (phone) => {
      const worker = new Worker(`const { parentPort, workerData } = require('node:worker_threads');
        (async () => {
          const { bookRecall } = await import(workerData.moduleUrl);
          const { default: Database } = await import(workerData.databaseModule);
          const db = new Database(workerData.dbPath, { timeout: 5000 });
          parentPort.postMessage('ready');
          parentPort.once('message', async () => {
            try { await bookRecall(db, workerData.token, workerData.booking, new Date(workerData.now)); parentPort.postMessage(201); }
            catch (error) { parentPort.postMessage(error.status || 500); }
            finally { await db.close(); }
          });
        })();`, { eval: true, workerData: { moduleUrl: new URL('../src/lib/recallStore.mjs', import.meta.url).href, databaseModule: new URL('./support/database.mjs', import.meta.url).href, dbPath, token: form.share_token, booking: { ...booking, phone }, now: now.toISOString() } });
      workers.push(worker);
      return new Promise((resolve, reject) => {
        worker.on('error', reject);
        worker.on('message', (message) => {
          if (message === 'ready') {
            worker.isReady = true;
            if (workers.length === 2 && workers.every((item) => item.isReady)) workers.forEach((item) => item.postMessage('book'));
          } else resolve(message);
        });
      });
    }));
    assert.deepEqual(results.sort(), [201, 409]);
    const verify = new Database(dbPath);
    assert.equal((await verify.prepare('SELECT COUNT(*) AS n FROM recall_bookings').get()).n, 1);
    await verify.close();
  } finally {
    await Promise.all(workers.map((worker) => worker.terminate()));
    await rm(dir, { recursive: true, force: true });
  }
});

test('project required for new forms, fixed once assigned, and legacy form migration preserves bookings and link',async()=>{
 const db=await setup();try{
  await assert.rejects(saveRecallForm(db,{...settings,project_id:undefined},user),e=>e.status===400);
  await assert.rejects(saveRecallForm(db,{...settings,project_id:'missing'},user),e=>e.status===404);
  const form=await saveRecallForm(db,settings,user);assert.equal(form.project_id,'p');assert.equal(form.project_name,'Dự án thử');
  await db.exec("INSERT INTO projects VALUES ('p2','Dự án khác')");await assert.rejects(saveRecallForm(db,{...settings,project_id:'p2'},user,form.id),e=>e.status===409);
  await bookRecall(db,form.share_token,booking,now);
  await db.prepare('UPDATE recall_forms SET project_id = NULL WHERE id = ?').run(form.id);
  await initializeRecallStore(db);const legacy=await getRecallForm(db,form.id);assert.equal(legacy.share_token,form.share_token);assert.equal(legacy.booking_count,1);
  const assigned=await saveRecallForm(db,settings,user,form.id);assert.equal(assigned.booking_count,1);assert.equal(assigned.share_token,form.share_token);assert.equal(assigned.project_id,'p');
 }finally{await db.close();}
});

test('quick schedule is generated on server, persists settings and retains existing bookings on regeneration',async()=>{
 const db=await setup();try{
  const schedule={dates:['2030-10-15','2030-10-16','2030-10-17'],start:'09:40',end:'20:00',interval:20,breaks:[{start:'12:10',end:'12:59'},{start:'18:00',end:'19:00'}]};
  const form=await saveRecallForm(db,{...settings,schedule,slots:['2030-10-15T18:20']},user);
  assert.equal(form.slots.length,81);assert.deepEqual(form.schedule,schedule);assert.ok(!form.slots.some(s=>s.starts_at==='2030-10-15T18:20'));
  await bookRecall(db,form.share_token,{...booking,starts_at:'2030-10-15T09:40'},now);
  const edited=await saveRecallForm(db,{...settings,schedule:{...schedule,dates:['2030-10-16']}},user,form.id);
  assert.equal(edited.slots.length,28);assert.equal(edited.booking_count,1);assert.equal(edited.share_token,form.share_token);
  await initializeRecallStore(db);assert.deepEqual((await getRecallForm(db,form.id)).schedule.dates,['2030-10-16']);
  await assert.rejects(saveRecallForm(db,{...settings,schedule:{...schedule,interval:0}},user,form.id),e=>e.status===400);
  assert.equal((await getRecallForm(db,form.id)).slots.length,28);
 }finally{await db.close();}
});
