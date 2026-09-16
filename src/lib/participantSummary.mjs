import {RESPONDENT_FIELDS} from './respondent.mjs';
import {formatAnswer,pipeText} from './surveyAdvanced.mjs';
export class SummaryError extends Error {constructor(message,status=400){super(message);this.status=status;}}
export async function initializeSummaryStore(db){
 await db.transaction(async()=>{const columns=await db.prepare('PRAGMA table_info(projects)').all();if(!columns.some(c=>c.name==='summary_template_json'))await db.exec('ALTER TABLE projects ADD COLUMN summary_template_json TEXT');})();
}
export const defaultSummaryTemplate=()=>({intro:'Thông tin người khảo sát',outro:'',rows:[{label:'Tên',source:'respondent_name'},{label:'Năm sinh',source:'respondent_birth_year'},{label:'Số điện thoại',source:'respondent_phone'},{label:'Nghề nghiệp',source:'respondent_occupation'},{label:'BUMO',source:'respondent_bumo'}]});
const parse=(value,fallback)=>{try{return JSON.parse(value)||fallback;}catch{return fallback;}};
const questionSource=(surveyId,questionId)=>JSON.stringify([surveyId,questionId]);
export async function summaryConfig(db,projectId){
 const project=await db.prepare('SELECT id,name,summary_template_json FROM projects WHERE id = ?').get(projectId);if(!project)throw new SummaryError('Không tìm thấy dự án.',404);
 const sources=[{id:'project_name',label:'Tên dự án'},...RESPONDENT_FIELDS.map(f=>({id:f.key,label:f.label})),{id:'respondent_bumo',label:'BUMO đã ghi nhận'},{id:'respondent_age',label:'Tuổi khi tham gia'}];const seen=new Set(sources.map(s=>s.id));
 const add=(surveyId,id,label,title)=>{const source=questionSource(surveyId,id);if(seen.has(source))return;seen.add(source);sources.push({id:source,label:`${title} — ${String(label).replace(/\{\{q:[^{}]+\}\}/g,'…')}`});};
 const surveys=await db.prepare('SELECT id,title,fields_json FROM surveys WHERE project_id = ?').all(projectId);
 for(const survey of surveys){const fields=parse(survey.fields_json,[]);if(Array.isArray(fields))for(const f of fields)if(f.type!=='section')add(survey.id,f.id,f.label||'Câu hỏi',survey.title);}
 const old=await db.prepare('SELECT survey_id,question_labels_json FROM responses WHERE project_id = ?').all(projectId);
 for(const row of old)for(const [id,label] of Object.entries(parse(row.question_labels_json,{})))add(row.survey_id,id,label,'Câu hỏi đã lưu');
 return {project:{id:project.id,name:project.name},template:parse(project.summary_template_json,null)||defaultSummaryTemplate(),sources};
}
export function validateSummaryTemplate(template,sources){
 if(!template||typeof template.intro!=='string'||typeof template.outro!=='string'||template.intro.length>2000||template.outro.length>2000||!Array.isArray(template.rows)||!template.rows.length||template.rows.length>50)throw new SummaryError('Mẫu cần 1–50 dòng; lời mở đầu và kết thúc tối đa 2.000 ký tự.');
 const allowed=new Set(sources.map(s=>s.id));
 for(const row of template.rows)if(!row||typeof row.label!=='string'||!row.label.trim()||row.label.length>200||typeof row.source!=='string'||!allowed.has(row.source))throw new SummaryError('Mỗi dòng cần tên mục (tối đa 200 ký tự) và trường thông tin hợp lệ.');
 return {intro:template.intro.trim(),outro:template.outro.trim(),rows:template.rows.map(r=>({label:r.label.trim(),source:r.source}))};
}
export async function saveSummaryTemplate(db,projectId,template){return db.transaction(async()=>{const config=await summaryConfig(db,projectId);const valid=validateSummaryTemplate(template,config.sources);await db.prepare('UPDATE projects SET summary_template_json = ? WHERE id = ?').run(JSON.stringify(valid),projectId);return valid;})();}
export function renderParticipantSummary(template,response,project){
 const answers=parse(response.data_json,{});
 const value=source=>{
  if(source==='project_name')return project.name;
  if(source==='respondent_bumo')return formatAnswer(parse(response.respondent_bumo,[]));
  if(RESPONDENT_FIELDS.some(f=>f.key===source)||source==='respondent_age')return formatAnswer(response[source]);
  const question=parse(source,[]);if(!Array.isArray(question)||question.length!==2||question[0]!==response.survey_id)return '';
  return formatAnswer(Object.hasOwn(answers,question[1])?answers[question[1]]:null);
 };
 return [template.intro,...template.rows.map(row=>`${pipeText(row.label,answers)}: ${value(row.source)||'Chưa có thông tin'}`),template.outro].filter(Boolean).join('\n');
}
export async function getParticipantSummary(db,projectId,{responseId,participantId}={}){
 const config=await summaryConfig(db,projectId);let person;
 if(responseId)person=await db.prepare('SELECT * FROM responses WHERE id = ? AND project_id = ?').get(responseId,projectId);
 else if(participantId){
  const member=await db.prepare('SELECT p.profile_json FROM project_members m JOIN participants p ON p.id=m.participant_id WHERE m.project_id = ? AND m.participant_id = ?').get(projectId,participantId);
  if(member)person=JSON.parse(member.profile_json);
 }
 if(!person)throw new SummaryError('Không tìm thấy người khảo sát trong dự án.',404);
 return {text:renderParticipantSummary(config.template,person,config.project),name:person.respondent_name||'',projectName:config.project.name};
}
