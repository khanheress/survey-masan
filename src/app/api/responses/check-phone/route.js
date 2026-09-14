import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(request) {
  try {
    const body = await request.json();
    const { phone } = body;
    if (!phone) return NextResponse.json({ error: 'Phone is required' }, { status: 400 });

    const db = await getDb();
    const projects = await db.prepare(`
      SELECT DISTINCT p.id, p.name 
      FROM responses r
      JOIN projects p ON r.project_id = p.id
      WHERE r.respondent_phone = ?
    `).all(phone);

    return NextResponse.json(projects, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
