import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { getDb } from '@/lib/db';
import bcryptjs from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const db = await getDb();
    const users = await db.prepare('SELECT id, username, email, role, created_at FROM users').all();
    return NextResponse.json(users, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const body = await request.json();
    const { username, email, password, role } = body;
    if (!username || !email || !password) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const db = await getDb();
    const id = uuidv4();
    const hash = bcryptjs.hashSync(password, 10);

    const insert = db.prepare('INSERT INTO users (id, username, email, password_hash, role) VALUES (?, ?, ?, ?, ?)');
    await insert.run(id, username, email, hash, role || 'moderator');

    const newUser = await db.prepare('SELECT id, username, email, role, created_at FROM users WHERE id = ?').get(id);
    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
