import {randomUUID} from 'node:crypto';
export class ProjectCopyError extends Error {constructor(message,status=400){super(message);this.status=status;}}
function date(value){if(value==='')return value;if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new ProjectCopyError('Ngày dự án không hợp lệ.');const parsed=new Date(value+'T00:00:00Z');if(!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==value)throw new ProjectCopyError('Ngày dự án không tồn tại.');return value;}
export async function copyProject(db,sourceId,input,userId){
 if(!input||typeof input.name!=='string'||!input.name.trim()||input.name.trim().length>200)throw new ProjectCopyError('Tên dự án mới cần từ 1 đến 200 ký tự.');
 return db.transaction(async()=>{
  const source=await db.prepare('SELECT * FROM projects WHERE id = ?').get(sourceId);if(!source)throw new ProjectCopyError('Không tìm thấy dự án gốc.',404);
  const start=date(input.start_date??source.start_date),end=date(input.end_date??source.end_date);if(start&&end&&start>end)throw new ProjectCopyError('Ngày kết thúc phải từ ngày bắt đầu trở đi.');
  const surveys=await db.prepare('SELECT * FROM surveys WHERE project_id = ? ORDER BY created_at,id').all(sourceId);
  const mapping=new Map(surveys.map(s=>[s.id,randomUUID()]));let summary=null,omitted=0;
  if(source.summary_template_json){const template=JSON.parse(source.summary_template_json);template.rows=template.rows.flatMap(row=>{
   if(!row.source.startsWith('['))return [row];
   const [surveyId,questionId]=JSON.parse(row.source);if(!mapping.has(surveyId)){omitted++;return [];}
   return [{...row,source:JSON.stringify([mapping.get(surveyId),questionId])}];
  });summary=template.rows.length?JSON.stringify(template):null;}
  const id=randomUUID();
  await db.prepare('INSERT INTO projects (id,name,description,start_date,end_date,max_responses,status,created_by,rules_json,summary_template_json) VALUES (?,?,?,?,?,?,?,?,?,?)').run(id,input.name.trim(),source.description,start,end,source.max_responses,'inactive',userId,source.rules_json,summary);
  for(const survey of surveys)await db.prepare('INSERT INTO surveys (id,project_id,title,description,fields_json,share_token,is_published) VALUES (?,?,?,?,?,?,0)').run(mapping.get(survey.id),id,survey.title,survey.description,survey.fields_json,randomUUID());
  return {id,name:input.name.trim(),survey_count:surveys.length,omitted_summary_fields:omitted};
 })();
}
