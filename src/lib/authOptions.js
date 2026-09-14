import CredentialsProvider from 'next-auth/providers/credentials';
import { getDb } from './db';
import bcryptjs from 'bcryptjs';

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
        return { id: user.id, name: user.username, email: user.email, role: user.role, username: user.username };
      } catch (error) {
        console.error('[auth] Account database unavailable:', error.code || error.name);
        throw new Error('AUTH_DATABASE_UNAVAILABLE');
      }
    }
  })],

  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {token.role = user.role;token.id = user.id;token.username = user.username;}
      return token;
    },
    async session({ session, token }) {
      session.user.role = token.role;
      session.user.id = token.id;
      session.user.username = token.username;
      return session;
    }
  },
  pages: { signIn: '/login' },
  secret: process.env.NEXTAUTH_SECRET || (process.env.NODE_ENV !== 'production' ? 'survey-platform-development-only-secret' : undefined)
};
