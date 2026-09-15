import { parseSurveyFields, validateSurveyFields } from '@/lib/surveyFlow.mjs';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { getDb } from '@/lib/db';

export async function POST(request, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await context.params;
    const db = await getDb();

    const survey = await db.prepare('SELECT * FROM surveys WHERE id = ?').get(id);
    if (!survey) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (survey.is_published !== 1) {
      let definition;
      try { definition = parseSurveyFields(survey.fields_json); } catch { return NextResponse.json({ error: 'Danh sách câu hỏi không hợp lệ' }, { status: 400 }); }
      const definitionError = validateSurveyFields(definition);
      if (definitionError) return NextResponse.json({ error: definitionError }, { status: 400 });
    }
    const newStatus = survey.is_published === 1 ? 0 : 1;
    await db.prepare('UPDATE surveys SET is_published = ? WHERE id = ?').run(newStatus, id);

    const updated = await db.prepare('SELECT * FROM surveys WHERE id = ?').get(id);
    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
