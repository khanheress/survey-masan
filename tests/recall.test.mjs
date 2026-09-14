import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Worker } from 'node:worker_threads';
import { createRequire } from 'node:module';
import { initializeRecallStore, saveRecallForm, publicRecallForm, bookRecall, getRecallForm } from '../src/lib/recallStore.mjs';
const require = createRequire(import.meta.url);
const user = { id: 'owner', role: 'moderator' };
const settings = { title: 'Form thử', description: 'Lịch hẹn', allow_overlap: false, is_open: true, slots: ['2030-10-01T09:00', '2030-10-01T10:00'] };
const now = new Date('2030-09-30T00:00:00Z');
const booking = { name: 'Nguyễn An', phone: '0901234567', starts_at: settings.slots[0] };
const setup = () => { const db = new Database(':memory:'); initializeRecallStore(db); return db; };

test('unique token, dates and public payload; no attendee personal data exposed', () => {
  const db = setup();
  try {
    const form = saveRecallForm(db, settings, user);
    const second = saveRecallForm(db, settings, user);
    assert.notEqual(form.share_token, second.share_token);
    bookRecall(db, form.share_token, booking, now);
    const publicForm = publicRecallForm(db, form.share_token, now);
    assert.equal(publicForm.slots[0].available, false);
    assert.equal(publicForm.slots[1].available, true);
    assert.equal(JSON.stringify(publicForm).includes(booking.phone), false);
    assert.equal(JSON.stringify(publicForm).includes(booking.name), false);
  } finally { db.close(); }
});

test('exclusive mode rejects a second person in the same slot but accepts a different slot', () => {
  const db = setup();
  try {
    const form = saveRecallForm(db, settings, user);
    bookRecall(db, form.share_token, booking, now);
    assert.throws(() => bookRecall(db, form.share_token, { ...booking, phone: '0900000001' }, now), error => error.status === 409);
    bookRecall(db, form.share_token, { ...booking, phone: '0900000001', starts_at: settings.slots[1] }, now);
    assert.equal(getRecallForm(db, form.id).booking_count, 2);
  } finally { db.close(); }
});

test('shared mode accepts two people; duplicate phone and slot remain rejected', () => {
  const db = setup();
  try {
    const form = saveRecallForm(db, { ...settings, allow_overlap: true }, user);
    bookRecall(db, form.share_token, booking, now);
    bookRecall(db, form.share_token, { ...booking, phone: '0900000001' }, now);
    assert.equal(publicRecallForm(db, form.share_token, now).slots[0].available, true);
    assert.throws(() => bookRecall(db, form.share_token, { ...booking, phone: '+84 901 234 567' }, now), error => error.status === 409);
    assert.throws(() => saveRecallForm(db, settings, user, form.id), error => error.status === 409);
  } finally { db.close(); }
});

test('validates configured dates and protects booked slots when editing', () => {
  const db = setup();
  try {
    for (const slots of [[], ['2030-02-30T09:00'], ['2030-10-01T24:00'], [settings.slots[0], settings.slots[0]]]) {
      assert.throws(() => saveRecallForm(db, { ...settings, slots }, user));
    }
    const form = saveRecallForm(db, settings, user);
    bookRecall(db, form.share_token, booking, now);
    assert.throws(() => saveRecallForm(db, { ...settings, slots: [settings.slots[1]] }, user, form.id), error => error.status === 409);
    const updated = saveRecallForm(db, { ...settings, title: 'Tên mới', slots: [settings.slots[0], '2030-10-02T14:00'] }, user, form.id);
    assert.equal(updated.share_token, form.share_token);
    assert.equal(updated.booking_count, 1);
  } finally { db.close(); }
});

test('closed forms, past times, unconfigured times, and invalid attendee details are rejected', () => {
  const db = setup();
  try {
    const form = saveRecallForm(db, settings, user);
    for (const input of [{ ...booking, name: '   ' }, { ...booking, phone: 'abc' }, { ...booking, starts_at: '2030-10-01T11:00' }]) assert.throws(() => bookRecall(db, form.share_token, input, now));
    assert.throws(() => bookRecall(db, form.share_token, booking, new Date('2030-10-01T02:00:00Z')), error => error.status === 409);
    saveRecallForm(db, { ...settings, is_open: false }, user, form.id);
    assert.throws(() => publicRecallForm(db, form.share_token, now), error => error.status === 410);
    assert.throws(() => bookRecall(db, form.share_token, booking, now), error => error.status === 410);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM recall_bookings').get().n, 0);
  } finally { db.close(); }
});

test('only the owner or an admin can edit a form', () => {
  const db = setup();
  try {
    const form = saveRecallForm(db, settings, user);
    assert.throws(() => saveRecallForm(db, settings, { id: 'other', role: 'moderator' }, form.id), error => error.status === 403);
    assert.equal(saveRecallForm(db, settings, { id: 'admin', role: 'admin' }, form.id).id, form.id);
  } finally { db.close(); }
});

test('two simultaneous connections cannot double-book an exclusive slot', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'recall-race-'));
  const dbPath = path.join(dir, 'test.db');
  const db = new Database(dbPath);
  initializeRecallStore(db);
  const form = saveRecallForm(db, settings, user);
  db.close();
  const workers = [];
  try {
    const results = await Promise.all(['0900000001', '0900000002'].map(async phone => {
      const worker = new Worker(`const { parentPort, workerData } = require('node:worker_threads');
        (async () => {
          const { bookRecall } = await import(workerData.moduleUrl);
          const Database = require(workerData.databaseModule);
          const db = new Database(workerData.dbPath, { timeout: 5000 });
          parentPort.postMessage('ready');
          parentPort.once('message', () => {
            try { bookRecall(db, workerData.token, workerData.booking, new Date(workerData.now)); parentPort.postMessage(201); }
            catch (error) { parentPort.postMessage(error.status || 500); }
            finally { db.close(); }
          });
        })();`, { eval: true, workerData: { moduleUrl: new URL('../src/lib/recallStore.mjs', import.meta.url).href, databaseModule: require.resolve('better-sqlite3'), dbPath, token: form.share_token, booking: { ...booking, phone }, now: now.toISOString() } });
      workers.push(worker);
      return new Promise((resolve, reject) => {
        worker.on('error', reject);
        worker.on('message', message => {
          if (message === 'ready') {
            worker.isReady = true;
            if (workers.length === 2 && workers.every(item => item.isReady)) workers.forEach(item => item.postMessage('book'));
          } else resolve(message);
        });
      });
    }));
    assert.deepEqual(results.sort(), [201, 409]);
    const verify = new Database(dbPath);
    assert.equal(verify.prepare('SELECT COUNT(*) AS n FROM recall_bookings').get().n, 1);
    verify.close();
  } finally {
    await Promise.all(workers.map(worker => worker.terminate()));
    await rm(dir, { recursive: true, force: true });
  }
});
