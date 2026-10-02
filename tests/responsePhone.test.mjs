import test from 'node:test';
import assert from 'node:assert/strict';
import Database from './support/database.mjs';
import { migrateResponseProfile } from '../src/lib/responseMigration.mjs';
import { normalizePhone } from '../src/lib/phone.mjs';

test('phone migration preserves historical duplicates, normalizes aliases and is repeatable', async () => {
  const db = new Database();
  try {
    await db.exec('CREATE TABLE responses(id TEXT PRIMARY KEY, survey_id TEXT, respondent_phone TEXT, data_json TEXT)');
    const aliases = ['0901234567', '+84 901 234 567', '0084901234567', '(090) 123-4567', null];
    for (const [index, value] of aliases.entries()) {
      await db.prepare('INSERT INTO responses VALUES(?,?,?,?)').run(String(index), 'survey', value, '{"answer":"kept"}');
    }
    await migrateResponseProfile(db);
    await migrateResponseProfile(db);
    const rows = await db.prepare('SELECT * FROM responses ORDER BY id').all();
    assert.equal(rows.length, 5);
    for (const [index, row] of rows.entries()) {
      assert.equal(row.respondent_phone, aliases[index]);
      assert.equal(row.respondent_phone_normalized, index === 4 ? '' : '0901234567');
      assert.equal(row.data_json, '{"answer":"kept"}');
    }
    const plan = await db.prepare("EXPLAIN QUERY PLAN SELECT 1 FROM responses WHERE survey_id = 'survey' AND respondent_phone_normalized = '0901234567'").all();
    assert.ok(plan.some(row => row.detail.includes('responses_survey_normalized_phone')));
    assert.equal(normalizePhone('+84 901 234 567'), '0901234567');
  } finally { await db.close(); }
});
