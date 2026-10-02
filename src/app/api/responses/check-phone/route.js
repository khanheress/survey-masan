import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { normalizePhone } from '@/lib/phone.mjs';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') return NextResponse.json({ error: 'Vui lòng đăng nhập bằng tài khoản admin.' }, { status: 401 });
    const body = await request.json();
    const { phone } = body;
    if (typeof phone !== 'string' || !normalizePhone(phone)) return NextResponse.json({ error: 'Phone is required' }, { status: 400 });

    const db = await getDb();
    const projects = await db.prepare(`
      SELECT DISTINCT p.id, p.name 
      FROM responses r
      JOIN projects p ON r.project_id = p.id
      WHERE r.respondent_phone_normalized = ?
    `).all(normalizePhone(phone));

    return NextResponse.json(projects, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
