import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const db = getDb();
    const projects = db.prepare(`
      SELECT p.*,
      (SELECT COUNT(*) FROM responses WHERE project_id = p.id) as response_count,
      (SELECT COUNT(*) FROM surveys WHERE project_id = p.id) as survey_count
      FROM projects p
      ORDER BY p.created_at DESC
    `).all();
    return NextResponse.json(projects, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json();
    const { name, description, start_date, end_date, max_responses, status } = body;
    const db = getDb();
    const id = uuidv4();
    const created_by = session.user.id;
    const insert = db.prepare('INSERT INTO projects (id, name, description, start_date, end_date, max_responses, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    insert.run(id, name, description || null, start_date, end_date, max_responses || 0, status || 'active', created_by);
    const newProject = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    return NextResponse.json(newProject, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
