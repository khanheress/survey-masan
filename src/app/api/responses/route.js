import { parseProjectRules, checkEligibility, projectQuotaCounts } from '@/lib/projectRules.mjs';
import { pipeText } from '@/lib/surveyAdvanced.mjs';
import { parseSurveyFields, validateSurveyAnswers } from '@/lib/surveyFlow.mjs';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { getDb } from '@/lib/db';
import { getSurveyAvailability } from '@/lib/surveyAvailability.mjs';
import { v4 as uuidv4 } from 'uuid';
import { recordParticipant } from '@/lib/participantStore.mjs';
import { validateRespondent } from '@/lib/respondent.mjs';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const survey_id = searchParams.get('survey_id');
    const project_id = searchParams.get('project_id');
    const phone = searchParams.get('phone');
    const reviewStatus=searchParams.get('review_status');
    const inviter=searchParams.get('inviter');
    const sort=searchParams.get('sort');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const offset = (page - 1) * limit;

    const db = await getDb();
    let query = `
      SELECT r.*, s.title as survey_title, p.name as project_name, s.fields_json as survey_fields_json
      FROM responses r 
      LEFT JOIN surveys s ON r.survey_id = s.id 
      LEFT JOIN projects p ON r.project_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (survey_id) {query += ' AND r.survey_id = ?';params.push(survey_id);}
    if (project_id) {query += ' AND r.project_id = ?';params.push(project_id);}
    if (phone) {query += ' AND r.respondent_phone LIKE ?';params.push(`%${phone}%`);}
    if(reviewStatus){query+=' AND r.review_status = ?';params.push(reviewStatus);}
    if(inviter){query+=' AND r.respondent_inviter = ?';params.push(inviter);}

    const countQuery = `SELECT COUNT(*) as total FROM (${query})`;
    const totalResult = await db.prepare(countQuery).get(...params);
    const total = totalResult.total;

    query += sort==='inviter_asc'?" ORDER BY COALESCE(r.respondent_inviter, '') ASC, r.created_at DESC LIMIT ? OFFSET ?":sort==='inviter_desc'?" ORDER BY COALESCE(r.respondent_inviter, '') DESC, r.created_at DESC LIMIT ? OFFSET ?":' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const responses = (await db.prepare(query).all(...params)).map((row) => {
      let answers = {};
      try {answers = JSON.parse(row.data_json || '{}');} catch {}
      let labels={};try{labels=JSON.parse(row.question_labels_json||'{}');}catch{}
      let questions=[];try{questions=JSON.parse(row.survey_fields_json||'[]');}catch{}
      for(const field of questions)if(!labels[field.id])labels[field.id]=pipeText(field.label,answers);
      const safeAnswers = Object.fromEntries(Object.entries(answers).map(([key,value]) => [key, value?.kind === 'file'
        ? {kind:'file',name:value.name,mime:value.mime,size:value.size,downloadUrl:`/api/responses/${encodeURIComponent(row.id)}/files/${encodeURIComponent(key)}`} : value]));
      return { ...row, data_json: JSON.stringify(safeAnswers), answers_json: safeAnswers, question_labels: labels, projectName: row.project_name, surveyName: row.survey_title };
    });

    return NextResponse.json({
      data: responses,
      responses,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { survey_id, respondent_email } = body;
    const profile = validateRespondent(body);
    if (profile.error) return NextResponse.json({ error: profile.error }, { status: 400 });
    const { respondent_name, respondent_phone, respondent_birth_year, respondent_address, respondent_occupation, respondent_marital_status, respondent_inviter } = profile.values;
    const data = body.answers_json ?? body.data ?? {};
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return NextResponse.json({ error: 'Nội dung trả lời không hợp lệ' }, { status: 400 });
    }
    const db = await getDb();

    return await db.transaction(async () => {
    // 1. Survey exists and is_published=1
    const survey = await db.prepare('SELECT * FROM surveys WHERE id = ?').get(survey_id);
    if (!survey) return NextResponse.json({ error: 'Không tìm thấy khảo sát' }, { status: 404 });
    if (survey.is_published !== 1) return NextResponse.json({ error: 'Khảo sát chưa được phát hành' }, { status: 403 });

    // 2. Get project, check status='active'
    const project = await db.prepare('SELECT * FROM projects WHERE id = ?').get(survey.project_id);
    if (!project) return NextResponse.json({ error: 'Không tìm thấy dự án' }, { status: 404 });
    const responseCount = project.max_responses > 0 ?
    (await db.prepare('SELECT COUNT(*) as count FROM responses WHERE project_id = ?').get(project.id)).count :
    0;
    const availability = getSurveyAvailability(project, responseCount);
    if (!availability.isOpen) {
      return NextResponse.json({ error: availability.message, reason: availability.reason }, { status: 403 });
    }

    let definition;
    try { definition = parseSurveyFields(survey.fields_json); } catch { return NextResponse.json({ error: 'Cấu hình khảo sát không hợp lệ' }, { status: 400 }); }
    const checked = validateSurveyAnswers(definition, data);
    if (checked.error) return NextResponse.json({ error: checked.error, reason: checked.status === 'screenout' ? 'screenout' : 'invalid_answers' }, { status: checked.status === 'screenout' ? 422 : 400 });

    // 5. Check phone not already used for this survey
    if (respondent_phone) {
      const existing = await db.prepare('SELECT * FROM responses WHERE survey_id = ? AND respondent_phone = ?').get(survey_id, respondent_phone);
      if (existing) {
        return NextResponse.json({ error: 'Số điện thoại này đã tham gia khảo sát' }, { status: 409 });
      }
    }

    const rules=parseProjectRules(project.rules_json);
    const counts=await projectQuotaCounts(db,project.id,rules);
    const eligibility=checkEligibility(rules,profile.values,checked.answers,definition,counts);
    if(eligibility.eligible!==true)return NextResponse.json({error:eligibility.message||'Vui lòng trả lời câu BUMO.',reason:eligibility.eligible===false?'screenout':'invalid_answers'},{status:eligibility.eligible===false?422:400});
    const labels=Object.fromEntries(checked.visible.filter(f=>f.type!=='section').map(f=>[f.id,pipeText(f.label,checked.answers)]));
    const id = uuidv4();
    const insert = db.prepare('INSERT INTO responses (id, survey_id, project_id, respondent_phone, respondent_name, respondent_email, respondent_birth_year, respondent_address, respondent_occupation, respondent_marital_status, respondent_inviter, data_json, respondent_gender, respondent_age, respondent_bumo, question_labels_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    await db.transaction(async () => {
      await insert.run(id, survey_id, project.id, respondent_phone || null, respondent_name || null, respondent_email || null, respondent_birth_year, respondent_address, respondent_occupation, respondent_marital_status, respondent_inviter, JSON.stringify(checked.answers), profile.values.respondent_gender, eligibility.age, JSON.stringify(eligibility.bumo), JSON.stringify(labels));
      const saved = await db.prepare('SELECT * FROM responses WHERE id = ?').get(id);
      await recordParticipant(db, { ...saved, project_name: project.name, survey_title: survey.title });
    })();

    return NextResponse.json({ message: 'Gửi phản hồi thành công', id }, { status: 201 });
    })();
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
