import {parseProjectRules,projectQuotaCounts} from '@/lib/projectRules.mjs';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSurveyAvailability } from '@/lib/surveyAvailability.mjs';

export async function GET(request, context) {
  try {
    const { token } = await context.params;
    const db = await getDb();

    const survey = await db.prepare('SELECT * FROM surveys WHERE share_token = ?').get(token);
    if (!survey) return NextResponse.json({ error: 'Khảo sát không tồn tại' }, { status: 404 });
    if (!survey.is_published) return NextResponse.json({ error: 'Khảo sát chưa được công khai' }, { status: 404 });

    const project = await db.prepare('SELECT * FROM projects WHERE id = ?').get(survey.project_id);
    if (!project) return NextResponse.json({ error: 'Dự án không tồn tại' }, { status: 404 });

    const responseCount = project.max_responses > 0 ?
    (await db.prepare('SELECT COUNT(*) as count FROM responses WHERE project_id = ?').get(project.id)).count :
    0;
    const availability = getSurveyAvailability(project, responseCount);
    const { isActive, hasCapacity: has_capacity, capacityRemaining: capacity_remaining } = availability;

    // Parse fields_json
    let fieldsJson = [];
    if (typeof survey.fields_json === 'string') {
      try {
        fieldsJson = JSON.parse(survey.fields_json);
      } catch (e) {
        fieldsJson = [];
      }
    } else {
      fieldsJson = survey.fields_json || [];
    }

    // Check if form is open
    if (!availability.isOpen) {
      return NextResponse.json({
        error: 'Khảo sát đã đóng',
        reason: availability.reason,
        message: availability.message,
        project_name: project.name,
        survey_title: survey.title,
        project_status: project.status,
        is_active: isActive,
        has_capacity
      }, { status: 410 });
    }

    return NextResponse.json({
      id: survey.id,
      project_id: project.id,
      project_rules:parseProjectRules(project.rules_json),
      quota_counts:await projectQuotaCounts(db,project.id,parseProjectRules(project.rules_json)),
      title: survey.title,
      description: survey.description,
      fields_json: fieldsJson,
      is_published: survey.is_published,
      project_name: project.name,
      project_status: project.status,
      is_active: isActive,
      has_capacity,
      capacity_remaining
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
