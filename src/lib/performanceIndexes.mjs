export async function initializePerformanceIndexes(db){
 await db.exec(`
 CREATE INDEX IF NOT EXISTS responses_project_created ON responses(project_id,created_at);
 CREATE INDEX IF NOT EXISTS responses_survey_phone ON responses(survey_id,respondent_phone);
 CREATE INDEX IF NOT EXISTS responses_created ON responses(created_at);
 CREATE INDEX IF NOT EXISTS responses_project_review ON responses(project_id,review_status);
 CREATE INDEX IF NOT EXISTS responses_inviter_created ON responses(respondent_inviter,created_at);
 CREATE INDEX IF NOT EXISTS responses_inviter_month ON responses(strftime('%Y-%m',datetime(created_at,'+7 hours')),respondent_inviter);
 CREATE INDEX IF NOT EXISTS surveys_project_created ON surveys(project_id,created_at);
 CREATE INDEX IF NOT EXISTS history_person_visible ON participant_history(participant_id,removed_from_profile,submitted_at);
 CREATE INDEX IF NOT EXISTS history_project_visible ON participant_history(project_id,removed_from_profile,participant_id);
 `);
}
