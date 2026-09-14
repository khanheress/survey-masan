import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { getDb } from '@/lib/db';
import bcryptjs from 'bcryptjs';

export async function PUT(request, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { id } = await context.params;
    const body = await request.json();
    const db = getDb();
    
    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    
    const fields = [];
    const values = [];
    const allowed = ['username', 'email', 'role'];
    for (const [key, value] of Object.entries(body)) {
      if (allowed.includes(key)) {
        fields.push(`${key} = ?`);
        values.push(value);
      } else if (key === 'password' && value) {
        fields.push('password_hash = ?');
        values.push(bcryptjs.hashSync(value, 10));
      }
    }
    
    if (fields.length === 0) return NextResponse.json({ message: 'No changes' }, { status: 200 });
    
    values.push(id);
    db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    
    const updated = db.prepare('SELECT id, username, email, role, created_at FROM users WHERE id = ?').get(id);
    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { id } = await context.params;
    
    if (session.user.id === id) return NextResponse.json({ error: 'Cannot delete self' }, { status: 400 });
    
    const db = getDb();
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    return NextResponse.json({ message: 'Deleted successfully' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
