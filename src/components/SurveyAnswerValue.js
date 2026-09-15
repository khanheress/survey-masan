'use client';
import { formatAnswer } from '@/lib/surveyAdvanced.mjs';
export default function SurveyAnswerValue({value}) {
 if(value?.kind==='file')return <a className="btn btn-secondary" href={value.downloadUrl} download>Tải {value.name} ({Math.ceil(value.size/1024)} KB)</a>;

 return <span style={{whiteSpace:'pre-wrap'}}>{formatAnswer(value)||'—'}</span>;
}
