import { parseSurveyFields, validateSurveyFields } from '@/lib/surveyFlow.mjs';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const db = await getDb();

    let query = `
      SELECT s.*, p.name as project_name 
      FROM surveys s 
      LEFT JOIN projects p ON s.project_id = p.id
    `;
    const params = [];
    if (projectId) {
      query += ' WHERE s.project_id = ?';
      params.push(projectId);
    }
    query += ' ORDER BY s.created_at DESC';

    const surveys = await db.prepare(query).all(...params);
    return NextResponse.json(surveys, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json();
    const { project_id, title, description, fields_json } = body;
    let definition;
    try { definition = parseSurveyFields(fields_json ?? []); } catch { return NextResponse.json({ error: 'Danh sách câu hỏi không hợp lệ' }, { status: 400 }); }
    const definitionError = validateSurveyFields(definition);
    if (definitionError) return NextResponse.json({ error: definitionError }, { status: 400 });
    const db = await getDb();

    const id = uuidv4();
    const share_token = uuidv4().substring(0, 8);

    const insert = db.prepare('INSERT INTO surveys (id, project_id, title, description, fields_json, share_token) VALUES (?, ?, ?, ?, ?, ?)');
    await insert.run(id, project_id, title, description || null, JSON.stringify(definition), share_token);

    const newSurvey = await db.prepare('SELECT * FROM surveys WHERE id = ?').get(id);
    return NextResponse.json(newSurvey, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
