import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { getDb } from '@/lib/db';

export async function GET(request, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await context.params;
    const db = getDb();
    const survey = db.prepare(`
      SELECT s.*, p.name as project_name 
      FROM surveys s 
      LEFT JOIN projects p ON s.project_id = p.id 
      WHERE s.id = ?
    `).get(id);
    if (!survey) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    
    // Parse fields_json from string to array
    let parsedSurvey = { ...survey };
    if (typeof survey.fields_json === 'string') {
      try {
        parsedSurvey.fields_json = JSON.parse(survey.fields_json);
      } catch (e) {
        parsedSurvey.fields_json = [];
      }
    }
    
    return NextResponse.json(parsedSurvey, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await context.params;
    const body = await request.json();
    const db = getDb();
    
    const existing = db.prepare('SELECT * FROM surveys WHERE id = ?').get(id);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    
    const fields = [];
    const values = [];
    const allowedFields = ['title', 'description', 'fields_json', 'is_published'];
    for (const [key, value] of Object.entries(body)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        // Stringify fields_json if it's an object/array
        if (key === 'fields_json' && typeof value !== 'string') {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
      }
    }
    if (fields.length === 0) return NextResponse.json(existing, { status: 200 });
    
    values.push(id);
    db.prepare(`UPDATE surveys SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    
    const updated = db.prepare('SELECT * FROM surveys WHERE id = ?').get(id);
    let parsedUpdated = { ...updated };
    if (typeof updated.fields_json === 'string') {
      try {
        parsedUpdated.fields_json = JSON.parse(updated.fields_json);
      } catch (e) {
        parsedUpdated.fields_json = [];
      }
    }
    return NextResponse.json(parsedUpdated, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { id } = await context.params;
    const db = getDb();
    
    const transaction = db.transaction(() => {
      db.prepare('DELETE FROM responses WHERE survey_id = ?').run(id);
      db.prepare('DELETE FROM surveys WHERE id = ?').run(id);
    });
    transaction();
    
    return NextResponse.json({ message: 'Deleted successfully' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
