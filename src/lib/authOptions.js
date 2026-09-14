import CredentialsProvider from 'next-auth/providers/credentials';
import { getDb } from './db';
import bcryptjs from 'bcryptjs';

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const db = getDb();
        const user = db.prepare('SELECT * FROM users WHERE username = ?').get(credentials.username);
        if (!user) return null;
        const isValid = bcryptjs.compareSync(credentials.password, user.password_hash);
        if (!isValid) return null;
        return { id: user.id, name: user.username, email: user.email, role: user.role, username: user.username };
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) { token.role = user.role; token.id = user.id; token.username = user.username; }
      return token;
    },
    async session({ session, token }) {
      session.user.role = token.role;
      session.user.id = token.id;
      session.user.username = token.username;
      return session;
    },
  },
  pages: { signIn: '/login' },
  secret: 'survey-platform-secret-key-change-in-production',
};
