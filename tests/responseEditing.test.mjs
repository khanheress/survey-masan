import test from 'node:test';
import assert from 'node:assert/strict';
import Database from './support/database.mjs';
import { migrateResponseProfile } from '../src/lib/responseMigration.mjs';
import { editResponseProfile } from '../src/lib/responseEditing.mjs';

async function setup() {
  const db = new Database();
  await db.exec(`CREATE TABLE responses (id TEXT PRIMARY KEY, survey_id TEXT, respondent_name TEXT,
    respondent_phone TEXT, respondent_email TEXT, data_json TEXT, created_at TEXT);
    INSERT INTO responses VALUES ('a','survey','An','0901234567',NULL,'{"answer":"kept"}','2025-12-31 18:00:00');
    INSERT INTO responses VALUES ('b','survey','Bình','0901234568',NULL,'{}','2026-01-02 00:00:00');
    INSERT INTO responses VALUES ('c','other-survey','Chi','0901234569',NULL,'{}','2026-01-02 00:00:00');`);
  await migrateResponseProfile(db);
  return db;
}

test('editing a legacy response updates only profile fields and age at submission in Vietnam', async () => {
  const db = await setup();
  try {
    const result = await editResponseProfile(db, 'a', {
      respondent_name: ' An đã sửa ', respondent_birth_year: '1990', respondent_gender: 'Nữ',
      respondent_inviter: 'Ngọc', respondent_phone: '+84 901 234 569', respondent_email: ' an@example.test ',
    });
    assert.equal(result.status, 200);
    const row = await db.prepare('SELECT * FROM responses WHERE id = ?').get('a');
    assert.equal(row.respondent_phone, '0901234569'); // Another survey can use the same phone.
    assert.equal(row.respondent_phone_normalized, '0901234569');
    assert.equal(row.respondent_name, 'An đã sửa');
    assert.equal(row.respondent_inviter, 'Ngọc');
    assert.equal(row.respondent_age, 36);
    assert.equal(row.respondent_email, 'an@example.test');
    assert.equal(row.respondent_address, null); // Old responses need not fill missing fields.
    assert.equal(row.review_status, 'pending');
    assert.equal(row.data_json, '{"answer":"kept"}');
    assert.equal(row.created_at, '2025-12-31 18:00:00');
    assert.equal((await editResponseProfile(db, 'a', { respondent_email: '' })).status, 200);
    assert.equal((await db.prepare('SELECT respondent_email FROM responses WHERE id = ?').get('a')).respondent_email, null);
  } finally { await db.close(); }
});

test('invalid edits and normalized duplicate phones do not partially update a response', async () => {
  const db = await setup();
  try {
    const original = await db.prepare('SELECT * FROM responses WHERE id = ?').get('a');
    for (const body of [null, [], {}, { data_json: '{}' }, { review_status: 'approved' },
      { respondent_name: '' }, { respondent_name: {} }, { respondent_phone: '' }, { respondent_phone: 'abc' },
      { respondent_birth_year: '1899' }, { respondent_birth_year: '1990.5' },
      { respondent_inviter: 'Unknown' }, { respondent_email: 42 }, { respondent_email: 'not-email' }]) {
      assert.equal((await editResponseProfile(db, 'a', body)).status, 400);
    }
    for (const phone of ['0901234568', '+84 901 234 568', '0084901234568', '(090) 123-4568']) {
      assert.equal((await editResponseProfile(db, 'a', { respondent_name: 'Do not save', respondent_phone: phone })).status, 409);
    }
    assert.deepEqual(await db.prepare('SELECT * FROM responses WHERE id = ?').get('a'), original);
    assert.equal((await editResponseProfile(db, 'missing', { respondent_name: 'Test' })).status, 404);
    assert.equal((await editResponseProfile(db, 'a', { respondent_phone: '+84 901 234 567' })).status, 200);
    const concurrent = await Promise.all(['a', 'b'].map(id => editResponseProfile(db, id, { respondent_phone: '0909999999' })));
    assert.deepEqual(concurrent.map(result => result.status).sort(), [200, 409]);
  } finally { await db.close(); }
});
