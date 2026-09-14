import test from 'node:test';
import assert from 'node:assert/strict';
import bcryptjs from 'bcryptjs';
import Database from './support/database.mjs';
import { bootstrapAdmin } from '../src/lib/bootstrapAdmin.mjs';

async function fixture() {
  const db = new Database();
  await db.exec('CREATE TABLE users (id TEXT PRIMARY KEY, username TEXT UNIQUE, email TEXT UNIQUE, password_hash TEXT, role TEXT)');
  return db;
}

test('creates admin with the explicitly configured password in a new database', async () => {
  const db = await fixture();
  try {
    await bootstrapAdmin(db, { BOOTSTRAP_ADMIN_PASSWORD: 'admin1234' });
    const user = await db.prepare('SELECT * FROM users').get();
    assert.equal(user.username, 'admin');
    assert.equal(user.role, 'admin');
    assert.ok(await bcryptjs.compare('admin1234', user.password_hash));
    assert.equal(await bcryptjs.compare('admin123', user.password_hash), false);
    assert.notEqual(user.password_hash, 'admin1234');
  } finally { await db.close(); }
});

test('redeployment never resets existing credentials', async () => {
  const db = await fixture();
  try {
    await bootstrapAdmin(db, { BOOTSTRAP_ADMIN_PASSWORD: 'first-password' });
    const before = await db.prepare('SELECT * FROM users').get();
    await bootstrapAdmin(db, { BOOTSTRAP_ADMIN_PASSWORD: 'changed-password' });
    await bootstrapAdmin(db, {});
    const after = await db.prepare('SELECT * FROM users').get();
    assert.equal(after.password_hash, before.password_hash);
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM users').get()).n, 1);
  } finally { await db.close(); }
});

test('missing bootstrap password fails without leaving a default account', async () => {
  const db = await fixture();
  try {
    await assert.rejects(() => bootstrapAdmin(db, {}), /BOOTSTRAP_ADMIN_PASSWORD/);
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM users').get()).n, 0);
  } finally { await db.close(); }
});
