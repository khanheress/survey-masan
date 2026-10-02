import CredentialsProvider from 'next-auth/providers/credentials';
import { getDb } from './db';
import bcryptjs from 'bcryptjs';
import { databaseDiagnostic } from './databaseDiagnostic.mjs';

export const authOptions = {
  providers: [
  CredentialsProvider({
    name: 'Credentials',
    credentials: {
      username: { label: 'Username', type: 'text' },
      password: { label: 'Password', type: 'password' }
    },
    async authorize(credentials) {
      if (typeof credentials?.username !== 'string' || typeof credentials?.password !== 'string') return null;
      try {
        const db = await getDb();
        const user = await db.prepare('SELECT * FROM users WHERE username = ?').get(credentials.username.trim());
        if (!user || !bcryptjs.compareSync(credentials.password, user.password_hash)) return null;
        if (user.role !== 'admin') throw new Error('AUTH_ADMIN_REQUIRED');
        return { id: user.id, name: user.username, email: user.email, role: user.role, username: user.username };
      } catch (error) {
        if (error.message === 'AUTH_ADMIN_REQUIRED') throw error;
        console.error('[auth] Account database unavailable:', JSON.stringify(databaseDiagnostic(error)));
        throw new Error('AUTH_DATABASE_UNAVAILABLE');
      }
    }
  })],

  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  jwt: { maxAge: 30 * 24 * 60 * 60 },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {token.role = user.role;token.id = user.id;token.username = user.username;}
      return token;
    },
    async session({ session, token }) {
      // Every protected API uses this callback; never trust a stale role in a cookie.
      if (token?.role !== 'admin' || typeof token.id !== 'string') return {};
      try {
        const db = await getDb();
        const user = await db.prepare('SELECT id, username, email, role FROM users WHERE id = ?').get(token.id);
        if (!user || user.role !== 'admin') return {};
        session.user = { id: user.id, name: user.username, username: user.username, email: user.email, role: user.role };
        return session;
      } catch (error) {
        console.error('[auth] Session database unavailable:', JSON.stringify(databaseDiagnostic(error)));
        return {};
      }
    }
  },
  pages: { signIn: '/login' },
  secret: process.env.NEXTAUTH_SECRET || (process.env.NODE_ENV !== 'production' ? 'survey-platform-development-only-secret' : undefined)
};
