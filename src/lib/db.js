import {initializeDeliveryStore} from './deliveryStore.mjs';
import { migrateProjectRules } from './projectRules.mjs';
import path from 'path';
import { withDatabaseStage } from './databaseDiagnostic.mjs';
import { initializeRecallStore } from './recallStore.mjs';
import { initializeParticipantStore } from './participantStore.mjs';
import { migrateResponseProfile } from './responseMigration.mjs';
import fs from 'fs';
import { createClient as createRemoteClient } from '@libsql/client/web';
import { createDatabaseAdapter } from './databaseAdapter.mjs';
import { bootstrapAdmin } from './bootstrapAdmin.mjs';

let databasePromise = null;

async function initializeDb(dbInstance) {
  await withDatabaseStage('schema', () => dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'moderator',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      max_responses INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS surveys (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      fields_json TEXT NOT NULL DEFAULT '[]',
      share_token TEXT UNIQUE NOT NULL,
      is_published INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS responses (
      id TEXT PRIMARY KEY,
      survey_id TEXT,
      project_id TEXT,
      respondent_phone TEXT,
      respondent_name TEXT,
      respondent_email TEXT,
      data_json TEXT NOT NULL DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `));

  await migrateProjectRules(dbInstance);
  await withDatabaseStage('response_migration', () => migrateResponseProfile(dbInstance));
  await withDatabaseStage('participant_migration', () => initializeParticipantStore(dbInstance));
  await withDatabaseStage('recall_schema', () => initializeRecallStore(dbInstance));
  await withDatabaseStage('delivery_schema', () => initializeDeliveryStore(dbInstance));

  await withDatabaseStage('admin_bootstrap', () => bootstrapAdmin(dbInstance));
}

export async function getDb() {
  if (!databasePromise) {
    databasePromise = withDatabaseStage('configuration', openDatabase).catch(error => {
      databasePromise = null;
      throw error;
    });
  }
  return databasePromise;
}

async function openDatabase() {
  let url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  let client;
  if (url) {
    if (!/^(libsql|https):\/\//.test(url) || !authToken) {
      throw new Error('Configure TURSO_DATABASE_URL and TURSO_AUTH_TOKEN for the remote database.');
    }
    client = createRemoteClient({ url, authToken, intMode: 'number' });
  } else {
    if (process.env.VERCEL) throw new Error('Vercel requires a remote database. Configure TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.');
    const filename = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'survey.db');
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    url = `file:${path.resolve(/* turbopackIgnore: true */ filename)}`;
    const { createClient } = await import('@libsql/client');
    client = createClient({ url, intMode: 'number' });
  }
  const db = createDatabaseAdapter(client);
  try {
    await withDatabaseStage('connection', () => db.prepare('SELECT 1 AS connected').get());
    await initializeDb(db);
    return db;
  } catch (error) {
    try { await db.close(); } catch { /* Preserve the failure being diagnosed. */ }
    throw error;
  }
}
