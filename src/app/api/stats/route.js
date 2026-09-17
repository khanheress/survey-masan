import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth/next';
import {authOptions} from '@/lib/authOptions';
import {getDb} from '@/lib/db';
import {INVITERS} from '@/lib/respondent.mjs';
import {parseProjectRules,countProjectQuotaRows} from '@/lib/projectRules.mjs';
import {getSurveyAvailability} from '@/lib/surveyAvailability.mjs';
export async function GET(request){
 try{
  if(!await getServerSession(authOptions))return NextResponse.json({error:'Unauthorized'},{status:401});
  const month=new URL(request.url).searchParams.get('month')||new Date(Date.now()+7*3600000).toISOString().slice(0,7);
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))return NextResponse.json({error:'Tháng không hợp lệ'},{status:400});
  const db=await getDb();
  const projects=await db.prepare(`SELECT p.*, (SELECT COUNT(*) FROM responses WHERE project_id=p.id) AS response_count,(SELECT COUNT(*) FROM surveys WHERE project_id=p.id) AS survey_count FROM projects p ORDER BY p.created_at DESC`).all();
  const running=projects.filter(p=>p.status==='active');
  const quotaRows=running.length?await db.prepare("SELECT r.project_id,r.respondent_gender,r.respondent_birth_year,r.respondent_age,r.respondent_bumo,r.created_at FROM responses r JOIN projects p ON p.id=r.project_id WHERE p.status='active'").all():[];
  const grouped=new Map();for(const row of quotaRows){if(!grouped.has(row.project_id))grouped.set(row.project_id,[]);grouped.get(row.project_id).push(row);}
  const active_projects=running.map(p=>{const rules=parseProjectRules(p.rules_json);return {...p,rules,quota_counts:countProjectQuotaRows(grouped.get(p.id)||[],rules),availability:getSurveyAvailability(p,p.response_count)};});
  const inviterRows=await db.prepare("SELECT respondent_inviter AS inviter,COUNT(*) AS count FROM responses WHERE strftime('%Y-%m',datetime(created_at,'+7 hours'))=? GROUP BY respondent_inviter").all(month);
  const monthly_inviters=INVITERS.map(inviter=>({inviter,count:inviterRows.find(r=>r.inviter===inviter)?.count||0}));
  const unknown=inviterRows.filter(r=>!INVITERS.includes(r.inviter)).reduce((sum,r)=>sum+r.count,0);if(unknown)monthly_inviters.push({inviter:'Chưa rõ người mời',count:unknown});
  const recent_responses=await db.prepare(`SELECT r.id,r.respondent_name,r.respondent_inviter,r.created_at,s.title AS survey_title,p.name AS project_name FROM responses r LEFT JOIN surveys s ON s.id=r.survey_id LEFT JOIN projects p ON p.id=r.project_id ORDER BY r.created_at DESC LIMIT 10`).all();
  return NextResponse.json({stats:{total_projects:projects.length,total_surveys:(await db.prepare('SELECT COUNT(*) AS n FROM surveys').get()).n,total_responses:(await db.prepare('SELECT COUNT(*) AS n FROM responses').get()).n,active_projects:active_projects.filter(p=>p.availability.isOpen).length},month,monthly_inviters,active_projects,recent_projects:projects.slice(0,5),recent_responses});
 }catch{return NextResponse.json({error:'Không thể tải thống kê.'},{status:500});}
}
