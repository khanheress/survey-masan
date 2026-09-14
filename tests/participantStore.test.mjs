import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { migrateResponseProfile } from '../src/lib/responseMigration.mjs';
import { initializeParticipantStore, recordParticipant, listParticipants } from '../src/lib/participantStore.mjs';

function fixture() {
  const db = new Database(':memory:');
  db.exec(`CREATE TABLE projects (id TEXT, name TEXT); CREATE TABLE surveys (id TEXT, title TEXT);
    CREATE TABLE responses (id TEXT, project_id TEXT, survey_id TEXT, respondent_name TEXT, respondent_phone TEXT, respondent_email TEXT, created_at TEXT);
    INSERT INTO projects VALUES ('p1','Dự án Một'); INSERT INTO surveys VALUES ('s1','Khảo sát Một');`);
  migrateResponseProfile(db);
  initializeParticipantStore(db);
  return db;
}
const response = (overrides = {}) => ({
  id: 'r1', project_id: 'p1', project_name: 'Dự án Một', survey_id: 's1', survey_title: 'Khảo sát Một',
  respondent_name: 'Nguyễn An', respondent_phone: '0901234567', respondent_birth_year: 1990,
  respondent_address: 'Địa chỉ cũ', respondent_occupation: 'Văn phòng', respondent_marital_status: 'Độc thân',
  respondent_inviter: 'Khánh', created_at: '2026-09-15 01:00:00', ...overrides,
});

test('groups equivalent phone numbers, keeps latest profile and every project', () => {
  const db = fixture();
  try {
    recordParticipant(db, response());
    recordParticipant(db, response({ id: 'r2', project_id: 'p2', project_name: 'Dự án Hai', respondent_phone: '+84 901 234 567', respondent_address: 'Địa chỉ mới', respondent_inviter: 'Tế', created_at: '2026-09-16 01:00:00' }));
    recordParticipant(db, response());
    const result = listParticipants(db);
    assert.equal(result.pagination.total, 1);
    assert.equal(result.participants[0].respondent_address, 'Địa chỉ mới');
    assert.equal(result.participants[0].history.length, 2);
    assert.equal(result.participants[0].projects.length, 2);
    assert.equal(listParticipants(db, { search: '+84 901234567' }).pagination.total, 1);
    assert.equal(listParticipants(db, { projectId: 'p1', inviter: 'Tế' }).pagination.total, 0);
    assert.equal(listParticipants(db, { projectId: 'p2', inviter: 'Tế' }).pagination.total, 1);
  } finally { db.close(); }
});

test('backfills existing responses once and retains data after source project deletion', () => {
  const db = fixture();
  try {
    db.prepare('INSERT INTO responses (id, project_id, survey_id, respondent_name, respondent_phone, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run('legacy', 'p1', 's1', 'Người cũ', '0900000000', '2026-09-01 00:00:00');
    initializeParticipantStore(db);
    initializeParticipantStore(db);
    db.exec('DELETE FROM responses; DELETE FROM surveys; DELETE FROM projects;');
    const result = listParticipants(db);
    assert.equal(result.pagination.total, 1);
    assert.equal(result.participants[0].projects[0].name, 'Dự án Một');
    assert.equal(result.participants[0].history.length, 1);
    assert.equal(result.participants[0].respondent_birth_year, null);
  } finally { db.close(); }
});

test('does not merge legacy records without phone numbers', () => {
  const db = fixture();
  try {
    recordParticipant(db, response({ respondent_phone: null }));
    recordParticipant(db, response({ id: 'r2', respondent_phone: '' }));
    assert.equal(listParticipants(db).pagination.total, 2);
  } finally { db.close(); }
});

test('paginates people rather than responses and exports all matching people', () => {
  const db = fixture();
  try {
    for (let i = 0; i < 25; i++) recordParticipant(db, response({ id: `r${i}`, respondent_phone: `090000${String(i).padStart(4, '0')}` }));
    assert.equal(listParticipants(db).participants.length, 20);
    assert.equal(listParticipants(db, { page: 2 }).participants.length, 5);
    assert.equal(listParticipants(db, { page: -5 }).pagination.page, 1);
    assert.equal(listParticipants(db, { exportAll: true }).participants.length, 25);
    assert.equal(listParticipants(db, { search: '%' }).pagination.total, 0);
  } finally { db.close(); }
});
