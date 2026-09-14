import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { getDb } from '@/lib/db';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const db = getDb();
    
    const stats = {
      total_projects: db.prepare('SELECT COUNT(*) as count FROM projects').get().count,
      total_surveys: db.prepare('SELECT COUNT(*) as count FROM surveys').get().count,
      total_responses: db.prepare('SELECT COUNT(*) as count FROM responses').get().count,
      active_projects: db.prepare('SELECT COUNT(*) as count FROM projects WHERE status = "active"').get().count,
    };
    
    const recent_projects = db.prepare(`
      SELECT p.*,
      (SELECT COUNT(*) FROM responses WHERE project_id = p.id) as response_count
      FROM projects p
      ORDER BY created_at DESC LIMIT 5
    `).all();
    
    const recent_responses = db.prepare(`
      SELECT r.*, s.title as survey_title 
      FROM responses r 
      LEFT JOIN surveys s ON r.survey_id = s.id 
      ORDER BY r.created_at DESC LIMIT 10
    `).all();

    return NextResponse.json({ stats, recent_projects, recent_responses }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
