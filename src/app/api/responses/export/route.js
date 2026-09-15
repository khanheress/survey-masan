import { formatAnswer } from '@/lib/surveyAdvanced.mjs';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { getDb } from '@/lib/db';
import Papa from 'papaparse';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const survey_id = searchParams.get('survey_id');
    const project_id = searchParams.get('project_id');

    const phone = searchParams.get('phone');

    const db = await getDb();
    let query = `
      SELECT r.*, s.title as survey_title, p.name as project_name 
      FROM responses r 
      LEFT JOIN surveys s ON r.survey_id = s.id 
      LEFT JOIN projects p ON r.project_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (survey_id) {query += ' AND r.survey_id = ?';params.push(survey_id);}
    if (project_id) {query += ' AND r.project_id = ?';params.push(project_id);}

    if (phone) {query += ' AND r.respondent_phone LIKE ?';params.push(`%${phone}%`);}

    const responses = await db.prepare(query).all(...params);

    const flattened = responses.map((r) => {
      let data = {};
      try {data = JSON.parse(r.data_json);} catch (e) {}
      return {
        'Response ID': r.id,
        'Project Name': r.project_name,
        'Survey Title': r.survey_title,
        'Phone': r.respondent_phone,
        'Name': r.respondent_name,
        'Năm sinh': r.respondent_birth_year,
        'Địa chỉ': r.respondent_address,
        'Nghề nghiệp hiện tại': r.respondent_occupation,
        'Tình trạng hôn nhân': r.respondent_marital_status,
        'Người mời': r.respondent_inviter,
        'Email': r.respondent_email,
        'Submitted At': r.created_at,
        ...Object.fromEntries(Object.entries(data).map(([key,value])=>[key,formatAnswer(value)]))
      };
    });

    const csv = Papa.unparse(flattened, { escapeFormulae: true });

    return new NextResponse('\uFEFF' + csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="export.csv"'
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
