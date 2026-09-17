import { RESPONDENT_FIELDS } from './respondent.mjs';

export function normalizePhone(value = '') {
  const phone = String(value).trim().replace(/[\s().-]/g, '');
  return /^(?:\+84|0084)\d{9}$/.test(phone) ? `0${phone.replace(/^(?:\+84|0084)/, '')}` : phone;
}

export async function recordParticipant(db, response) {
  // One durable participation per submitted response. Re-importing cannot overwrite newer data.
  if (await db.prepare('SELECT 1 FROM participant_history WHERE response_id = ?').get(response.id)) return;
  const phone = normalizePhone(response.respondent_phone);
  const participantId = phone ? `phone:${phone}` : `response:${response.id}`;
  const profile = Object.fromEntries(RESPONDENT_FIELDS.map(({ key }) => [key, response[key] ?? null]));
  profile.respondent_phone = phone || null;
  profile.respondent_email = response.respondent_email || null;
  const existing=await db.prepare('SELECT profile_overrides_json FROM participants WHERE id = ?').get(participantId);
  if(existing)Object.assign(profile,JSON.parse(existing.profile_overrides_json||'{}'));
  const submittedAt = response.created_at || new Date().toISOString();
  await db.prepare(`INSERT INTO participants (id, phone, name, profile_json, first_seen, last_seen)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = CASE WHEN excluded.last_seen >= participants.last_seen THEN excluded.name ELSE participants.name END,
      profile_json = CASE WHEN excluded.last_seen >= participants.last_seen THEN excluded.profile_json ELSE participants.profile_json END,
      first_seen = MIN(participants.first_seen, excluded.first_seen),
      last_seen = MAX(participants.last_seen, excluded.last_seen)`).
  run(participantId, phone || null, profile.respondent_name || '', JSON.stringify(profile), submittedAt, submittedAt);
  await db.prepare(`INSERT INTO participant_history
    (response_id, participant_id, project_id, project_name, survey_id, survey_title, inviter, submitted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).
  run(response.id, participantId, response.project_id || null, response.project_name || 'Dự án đã xóa',
  response.survey_id || null, response.survey_title || 'Khảo sát đã xóa', response.respondent_inviter || null, submittedAt);
}

export async function initializeParticipantStore(db) {
  await db.exec(`CREATE TABLE IF NOT EXISTS participants (
    id TEXT PRIMARY KEY, phone TEXT, name TEXT NOT NULL, profile_json TEXT NOT NULL,
    first_seen TEXT NOT NULL, last_seen TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS participant_history (
    response_id TEXT PRIMARY KEY, participant_id TEXT NOT NULL, project_id TEXT, project_name TEXT NOT NULL,
    survey_id TEXT, survey_title TEXT NOT NULL, inviter TEXT, submitted_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS participant_history_person ON participant_history(participant_id);
  CREATE INDEX IF NOT EXISTS participant_history_project ON participant_history(project_id);
  CREATE INDEX IF NOT EXISTS participants_last_seen ON participants(last_seen);`);
  await db.transaction(async () => {
  const historyColumns=new Set((await db.prepare('PRAGMA table_info(participant_history)').all()).map(c=>c.name));
  if(!historyColumns.has('removed_from_profile'))await db.exec('ALTER TABLE participant_history ADD COLUMN removed_from_profile INTEGER NOT NULL DEFAULT 0');
  const columns=new Set((await db.prepare('PRAGMA table_info(participants)').all()).map(c=>c.name));
  if(!columns.has('profile_overrides_json'))await db.exec("ALTER TABLE participants ADD COLUMN profile_overrides_json TEXT NOT NULL DEFAULT '{}'");
    const oldResponses = await db.prepare(`SELECT r.*, p.name AS project_name, s.title AS survey_title
      FROM responses r LEFT JOIN projects p ON p.id = r.project_id LEFT JOIN surveys s ON s.id = r.survey_id
      WHERE NOT EXISTS (SELECT 1 FROM participant_history h WHERE h.response_id = r.id)
      ORDER BY r.created_at, r.id`).all();
    for (const response of oldResponses) await recordParticipant(db, response);
  })();
}

export async function listParticipants(db, { search = '', projectId = '', inviter = '', page = 1, exportAll = false } = {}) {
  const conditions = [];
  const args = [];
  if (search.trim()) {
    const escape = (value) => value.replace(/[\\%_]/g, '\\$&');
    conditions.push("(p.name LIKE ? ESCAPE '\\' OR p.phone LIKE ? ESCAPE '\\')");
    args.push(`%${escape(search.trim())}%`, `%${escape(normalizePhone(search) || search.trim())}%`);
  }
  if (projectId || inviter) {
    const historyConditions = ['h.participant_id = p.id','h.removed_from_profile = 0'];
    if (projectId) {historyConditions.push('h.project_id = ?');args.push(projectId);}
    if (inviter && projectId) {historyConditions.push('h.inviter = ?');args.push(inviter);}
    if(projectId)conditions.push(`EXISTS (SELECT 1 FROM participant_history h WHERE ${historyConditions.join(' AND ')})`);
    if(inviter&&!projectId){conditions.push("(json_extract(p.profile_json, '$.respondent_inviter') = ? OR EXISTS (SELECT 1 FROM participant_history h WHERE h.participant_id = p.id AND h.removed_from_profile = 0 AND h.inviter = ?))");args.push(inviter,inviter);}
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const total = (await db.prepare(`SELECT COUNT(*) AS total FROM participants p ${where}`).get(...args)).total;
  const limit = 20;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.min(Math.max(1, Number.parseInt(page, 10) || 1), totalPages);
  const rows = await db.prepare(`SELECT p.* FROM participants p ${where} ORDER BY p.last_seen DESC, p.id ${exportAll ? '' : 'LIMIT ? OFFSET ?'}`).
  all(...args, ...(exportAll ? [] : [limit, (currentPage - 1) * limit]));
  const histories=new Map();
  // Fetch one page's histories in a single round trip; chunk large CSV exports.
  for(let offset=0;offset<rows.length;offset+=500){
    const ids=rows.slice(offset,offset+500).map(row=>row.id);
    const batch=await db.prepare(`SELECT * FROM participant_history WHERE participant_id IN (${ids.map(()=>'?').join(',')}) AND removed_from_profile = 0 ORDER BY submitted_at DESC, response_id`).all(...ids);
    for(const item of batch){if(!histories.has(item.participant_id))histories.set(item.participant_id,[]);histories.get(item.participant_id).push(item);}
  }
  const participants = rows.map(row => {
    const history=histories.get(row.id)||[];
    const projects=[...new Map(history.map(item=>[JSON.stringify([item.project_id||null,item.project_id?null:item.project_name]),{id:item.project_id,name:item.project_name}])).values()];
    return {id:row.id,...JSON.parse(row.profile_json),first_seen:row.first_seen,last_seen:row.last_seen,projects,history};
  });
  const projects = await db.prepare('SELECT project_id AS id, MAX(project_name) AS name FROM participant_history WHERE project_id IS NOT NULL AND removed_from_profile = 0 GROUP BY project_id ORDER BY name').all();
  return { participants, projects, pagination: { total, page: currentPage, limit, totalPages } };
}
