import test from 'node:test';
import assert from 'node:assert/strict';
import Database from './support/database.mjs';
import { validateRespondent, RESPONDENT_FIELDS, MARITAL_STATUSES, INVITERS } from '../src/lib/respondent.mjs';
import { migrateResponseProfile } from '../src/lib/responseMigration.mjs';

const valid = {
  respondent_gender: 'Nam', respondent_name: ' Nguyễn An ', respondent_birth_year: '1990', respondent_phone: '0900000000',
  respondent_address: 'Địa chỉ kiểm thử', respondent_occupation: 'Nhân viên văn phòng',
  respondent_marital_status: 'Độc thân', respondent_inviter: 'Khánh'
};

test('all profile fields are mandatory, including whitespace-only values', () => {
  for (const { key } of RESPONDENT_FIELDS) {
    for (const empty of ['', '   ', null, undefined]) {
      assert.ok(validateRespondent({ ...valid, [key]: empty }).error, key);
    }
  }
});
test('birth year rejects future, fractional, and implausible years', () => {
  for (const year of ['2027', '1990.5', '1899', 'abcd']) {
    assert.ok(validateRespondent({ ...valid, respondent_birth_year: year }, 2026).error);
  }
  assert.equal(validateRespondent(valid, 2026).values.respondent_birth_year, 1990);
});
test('accepts exactly the three marital statuses and trims name', () => {
  for (const status of MARITAL_STATUSES) {
    const result = validateRespondent({ ...valid, respondent_marital_status: status });
    assert.equal(result.values.respondent_marital_status, status);
    assert.equal(result.values.respondent_name, 'Nguyễn An');
  }
  assert.ok(validateRespondent({ ...valid, respondent_marital_status: 'unknown' }).error);
});
test('migration preserves legacy responses and can run twice', async () => {
  const db = new Database(':memory:');
  try {
    await db.exec("CREATE TABLE responses (id TEXT PRIMARY KEY, respondent_name TEXT, data_json TEXT)");
    await db.prepare('INSERT INTO responses VALUES (?, ?, ?)').run('old', 'Người cũ', '{"q1":"Đã lưu"}');
    await migrateResponseProfile(db);
    await migrateResponseProfile(db);
    const old = await db.prepare('SELECT * FROM responses WHERE id = ?').get('old');
    assert.equal(old.respondent_name, 'Người cũ');
    assert.equal(old.data_json, '{"q1":"Đã lưu"}');
    assert.equal(old.respondent_birth_year, null);
    const profile = validateRespondent(valid).values;
    await db.prepare('INSERT INTO responses (id, respondent_name, respondent_birth_year, respondent_address, respondent_occupation, respondent_marital_status, respondent_inviter) VALUES (?, ?, ?, ?, ?, ?, ?)').
    run('new', profile.respondent_name, profile.respondent_birth_year, profile.respondent_address, profile.respondent_occupation, profile.respondent_marital_status, profile.respondent_inviter);
    const saved = await db.prepare('SELECT * FROM responses WHERE id = ?').get('new');
    for (const key of ['respondent_birth_year', 'respondent_address', 'respondent_occupation', 'respondent_marital_status', 'respondent_inviter']) assert.equal(saved[key], profile[key]);
  } finally {await db.close();}
});

test('inviter accepts only Khánh or Tế', () => {
  for (const inviter of INVITERS) {
    assert.equal(validateRespondent({ ...valid, respondent_inviter: inviter }).values.respondent_inviter, inviter);
  }
  assert.ok(validateRespondent({ ...valid, respondent_inviter: 'Khác' }).error);
});

test('gender is required and accepts only Nam or Nữ',()=>{for(const gender of ['Nam','Nữ'])assert.equal(validateRespondent({...valid,respondent_gender:gender}).values.respondent_gender,gender);for(const gender of ['',null,'Khác'])assert.ok(validateRespondent({...valid,respondent_gender:gender}).error);});
