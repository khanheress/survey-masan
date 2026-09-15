import {REVIEW_LABELS} from './responseReview.mjs';
import { RESPONDENT_FIELDS } from './respondent.mjs';
import { formatAnswer } from './surveyAdvanced.mjs';
export function exportColumns(surveys, responses) {
 const columns=[{key:'review_status',label:'Trạng thái tham gia'},{key:'project_name',label:'Dự án'},{key:'survey_title',label:'Khảo sát'},{key:'created_at',label:'Thời gian gửi (Việt Nam)'},...RESPONDENT_FIELDS.map(f=>({key:f.key,label:f.label})),{key:'respondent_age',label:'Tuổi khi tham gia'},{key:'respondent_bumo',label:'BUMO'}];
 const seen=new Set();
 const add=(surveyId,id,label,title)=>{const key=JSON.stringify([surveyId,id]);if(seen.has(key))return;seen.add(key);columns.push({key,label:`${title} — ${label||'Câu hỏi cũ'}`,surveyId,questionId:id});};
 for(const survey of surveys){let fields=[];try{fields=JSON.parse(survey.fields_json||'[]');}catch{}for(const f of fields)if(f.type!=='section')add(survey.id,f.id,f.label,survey.title);}
 for(const row of responses){let labels={},answers={};try{labels=JSON.parse(row.question_labels_json||'{}');answers=JSON.parse(row.data_json||'{}');}catch{}for(const id of Object.keys(answers))add(row.survey_id,id,labels[id],row.survey_title||'Khảo sát cũ');}
 return columns;
}
export function exportValue(row,column){
 if(column.key==='review_status')return REVIEW_LABELS[row.review_status||'pending']||'Chờ duyệt';
 if(column.questionId){if(row.survey_id!==column.surveyId)return '';let answers={};try{answers=JSON.parse(row.data_json||'{}');}catch{}return formatAnswer(answers[column.questionId]);}
 if(column.key==='respondent_bumo'){try{return JSON.parse(row.respondent_bumo||'[]').join(', ');}catch{return '';}}
 if(column.key==='created_at'){const raw=row.created_at;const date=new Date(/[zZ]|[+-]\d\d:\d\d$/.test(raw)?raw:raw.replace(' ','T')+'Z');return Number.isNaN(date.getTime())?'':date.toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'});}
 return row[column.key]??'';
}
