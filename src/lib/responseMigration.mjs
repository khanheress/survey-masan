export async function migrateResponseProfile(db) {
  const additions = {
    respondent_gender: 'TEXT',
    respondent_age: 'INTEGER',
    respondent_bumo: "TEXT DEFAULT '[]'",
    question_labels_json: "TEXT DEFAULT '{}'",
    respondent_birth_year: 'INTEGER',
    respondent_address: 'TEXT',
    respondent_occupation: 'TEXT',
    respondent_marital_status: 'TEXT',
    respondent_inviter: 'TEXT'
  };
  await db.transaction(async () => {
  const columns = new Set((await db.prepare('PRAGMA table_info(responses)').all()).map((column) => column.name));
    for (const [name, type] of Object.entries(additions)) {
      if (!columns.has(name)) await db.exec(`ALTER TABLE responses ADD COLUMN ${name} ${type}`);
    }
  })();
}
