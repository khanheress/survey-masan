import path from 'path';
import { initializeParticipantStore } from './participantStore.mjs';
import { migrateResponseProfile } from './responseMigration.mjs';
import fs from 'fs';
import bcryptjs from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const DB_PATH = path.join(process.cwd(), 'data', 'survey.db');
let db = null;

function initializeDb(dbInstance) {
  dbInstance.exec(`
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
  `);

  migrateResponseProfile(dbInstance);
  initializeParticipantStore(dbInstance);

  const userCount = dbInstance.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count === 0) {
    const insertUser = dbInstance.prepare('INSERT INTO users (id, username, email, password_hash, role) VALUES (?, ?, ?, ?, ?)');
    insertUser.run(uuidv4(), 'admin', 'admin@survey.com', bcryptjs.hashSync('admin123', 10), 'admin');
    insertUser.run(uuidv4(), 'mod', 'mod@survey.com', bcryptjs.hashSync('mod123', 10), 'moderator');
  }
}

export function getDb() {
  if (db) return db;
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  initializeDb(db);
  return db;
}
