export function migrateResponseProfile(db) {
  const columns = new Set(db.prepare('PRAGMA table_info(responses)').all().map(column => column.name));
  const additions = {
    respondent_birth_year: 'INTEGER',
    respondent_address: 'TEXT',
    respondent_occupation: 'TEXT',
    respondent_marital_status: 'TEXT',
    respondent_inviter: 'TEXT',
  };
  db.transaction(() => {
    for (const [name, type] of Object.entries(additions)) {
      if (!columns.has(name)) db.exec(`ALTER TABLE responses ADD COLUMN ${name} ${type}`);
    }
  })();
}
