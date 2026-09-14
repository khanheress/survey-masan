import { randomUUID } from 'node:crypto';
import bcryptjs from 'bcryptjs';

// Only initialize a brand-new database. Never reset an existing account during a deployment.
export async function bootstrapAdmin(db, env = process.env) {
  await db.transaction(async () => {
    if ((await db.prepare('SELECT COUNT(*) AS count FROM users').get()).count > 0) return;
    const password = env.BOOTSTRAP_ADMIN_PASSWORD;
    if (!password || password.length < 8) throw new Error('BOOTSTRAP_ADMIN_PASSWORD must contain at least 8 characters for a new database.');
    await db.prepare('INSERT INTO users (id, username, email, password_hash, role) VALUES (?, ?, ?, ?, ?)')
      .run(randomUUID(), 'admin', 'admin@survey.com', await bcryptjs.hash(password, 12), 'admin');
  })();
}
