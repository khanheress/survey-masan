import { parseProjectRules, validateProjectRules, projectQuotaCounts } from '@/lib/projectRules.mjs';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { getDb } from '@/lib/db';

export async function GET(request, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await context.params;
    const db = await getDb();
    const project = await db.prepare(`
      SELECT p.*,
      (SELECT COUNT(*) FROM responses WHERE project_id = p.id) as response_count,
      (SELECT COUNT(*) FROM surveys WHERE project_id = p.id) as survey_count
      FROM projects p
      WHERE p.id = ?
    `).get(id);
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({...project,quota_counts:await projectQuotaCounts(db,id,parseProjectRules(project.rules_json))}, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { id } = await context.params;
    const body = await request.json();
    const db = await getDb();

    const existing = await db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if(body.rules_json!==undefined){let rules;try{rules=parseProjectRules(body.rules_json);}catch{return NextResponse.json({error:'Điều kiện không hợp lệ'},{status:400});}const ruleError=validateProjectRules(rules);if(ruleError)return NextResponse.json({error:ruleError},{status:400});body.rules_json=JSON.stringify(rules);}
    const fields = [];
    const values = [];
    const allowedFields = ['name', 'description', 'start_date', 'end_date', 'max_responses', 'status', 'rules_json'];
    for (const [key, value] of Object.entries(body)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    if (fields.length === 0) return NextResponse.json(existing, { status: 200 });

    values.push(id);
    await db.prepare(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    const updated = await db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
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
    const db = await getDb();

    const existing = await db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy dự án' }, { status: 404 });

    const transaction = db.transaction(async () => {
      await db.prepare('DELETE FROM responses WHERE project_id = ?').run(id);
      await db.prepare('DELETE FROM surveys WHERE project_id = ?').run(id);
      await db.prepare('DELETE FROM projects WHERE id = ?').run(id);
    });
    await transaction();

    return NextResponse.json({ message: 'Deleted successfully' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
