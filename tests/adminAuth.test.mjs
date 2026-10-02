import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import vm from 'node:vm';
import bcryptjs from 'bcryptjs';
import Database from './support/database.mjs';
import { databaseDiagnostic } from '../src/lib/databaseDiagnostic.mjs';

const require = createRequire(import.meta.url);
const { AuthHandler } = require(path.join(path.dirname(require.resolve('next-auth')), 'core/index.js'));
const { encode } = require('next-auth/jwt');

async function setup() {
  const db = new Database();
  await db.exec('CREATE TABLE users(id TEXT PRIMARY KEY, username TEXT, email TEXT, role TEXT, password_hash TEXT)');
  const hash = await bcryptjs.hash('test-password', 4);
  for (const role of ['admin', 'user', 'moderator']) {
    await db.prepare('INSERT INTO users VALUES(?,?,?,?,?)').run(role, role, `${role}@example.test`, role, hash);
  }
  const context = vm.createContext({ console, process: { env: { NEXTAUTH_SECRET: 'test-only-auth-secret' } } });
  const imports = {
    'next-auth/providers/credentials': { default: options => ({ ...options, type: 'credentials', id: 'credentials' }) },
    './db': { getDb: async () => db },
    bcryptjs: { default: bcryptjs },
    './databaseDiagnostic.mjs': { databaseDiagnostic },
  };
  const source = await readFile(new URL('../src/lib/authOptions.js', import.meta.url), 'utf8');
  const authModule = new vm.SourceTextModule(source, { context });
  await authModule.link(specifier => new vm.SyntheticModule(Object.keys(imports[specifier]), function () {
    for (const [name, value] of Object.entries(imports[specifier])) this.setExport(name, value);
  }, { context }));
  await authModule.evaluate();
  return { db, options: authModule.namespace.authOptions };
}

test('credentials allow admins only and retain the distinction between wrong passwords and roles', async () => {
  const { db, options } = await setup();
  try {
    const authorize = options.providers[0].authorize;
    assert.equal((await authorize({ username: ' admin ', password: 'test-password' })).role, 'admin');
    for (const username of ['user', 'moderator']) {
      await assert.rejects(() => authorize({ username, password: 'test-password' }), /AUTH_ADMIN_REQUIRED/);
    }
    assert.equal(await authorize({ username: 'admin', password: 'wrong' }), null);
    assert.equal(await authorize({ username: 'user', password: 'wrong' }), null);
    assert.equal(await authorize({ username: 'missing', password: 'test-password' }), null);
    assert.equal(await authorize({ username: {}, password: 'test-password' }), null);
  } finally { await db.close(); }
});

test('real NextAuth session restores admin cookies, renews 30-day expiry and rejects revoked or legacy roles', async () => {
  const { db, options } = await setup();
  try {
    const session = async token => AuthHandler({
      options,
      req: {
        action: 'session', method: 'GET', headers: {},
        cookies: { 'next-auth.session-token': await encode({ secret: options.secret, token, maxAge: options.jwt.maxAge }) },
      },
    });
    const validToken = { id: 'admin', role: 'admin', username: 'admin' };
    const restored = await session(validToken);
    assert.equal(restored.body.user.role, 'admin');
    assert.equal(restored.body.user.id, 'admin');
    const cookie = restored.cookies.find(item => item.name === 'next-auth.session-token');
    assert.equal(cookie.options.httpOnly, true);
    const days = (new Date(cookie.options.expires).getTime() - Date.now()) / 86400000;
    assert.ok(days > 29 && days <= 30);
    for (const role of ['user', 'moderator']) {
      assert.equal(Object.keys((await session({ id: role, role })).body).length, 0);
      assert.equal(Object.keys((await session({ id: role, role: 'admin' })).body).length, 0);
    }
    await db.prepare("UPDATE users SET role = 'user' WHERE id = 'admin'").run();
    assert.equal(Object.keys((await session(validToken)).body).length, 0);
    await db.prepare("DELETE FROM users WHERE id = 'admin'").run();
    assert.equal(Object.keys((await session(validToken)).body).length, 0);
  } finally { await db.close(); }
});
