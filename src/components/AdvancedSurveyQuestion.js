'use client';
import {useId} from 'react';
import SurveyFileInput from './SurveyFileInput';
import { selectedDetails } from '@/lib/surveyAdvanced.mjs';
export default function AdvancedSurveyQuestion({field,value,answers,onChange}) {
 const groupId=useId();const values=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
 if(field.type==='file')return <SurveyFileInput value={value} onChange={onChange}/>;
 if(['matrix_single','matrix_multi'].includes(field.type))return <div className="survey-matrix"><table><thead><tr><th scope="col">Mục</th>{field.columns.map(c=><th scope="col" key={c}>{c}</th>)}</tr></thead><tbody>{field.rows.map(row=><tr key={row}><th scope="row">{row}</th>{field.columns.map(col=><td key={col}><input type={field.type==='matrix_single'?'radio':'checkbox'} name={`${groupId}-${row}`} aria-label={`${row}: ${col}`} checked={field.type==='matrix_single'?values[row]===col:Array.isArray(values[row])&&values[row].includes(col)} onChange={()=>{const selected=Array.isArray(values[row])?values[row]:[];onChange({...values,[row]:field.type==='matrix_single'?col:selected.includes(col)?selected.filter(x=>x!==col):[...selected,col]});}}/></td>)}</tr>)}</tbody></table></div>;
 if(field.type==='allocation')return <div>{field.options.map(option=><label className="structured-answer-row" key={option}><span>{option}</span><input aria-label={option} type="number" min={0} max={field.total} step={1} className="form-input" value={values[option]??''} onChange={e=>{const next={...values};if(e.target.value==='')delete next[option];else next[option]=Number(e.target.value);onChange(next);}}/></label>)}<p aria-live="polite">Đã phân bổ: {Object.values(values).reduce((a,b)=>a+(Number(b)||0),0)} / {field.total}</p></div>;
 if(field.type==='detail_followup')return <div>{selectedDetails(field,answers).map(option=><label className="structured-answer-row" key={option}><span>{option}</span><textarea className="form-textarea" aria-label={`Chi tiết ${option}`} maxLength={5000} required={field.required} value={values[option]||''} onChange={e=>onChange({...values,[option]:e.target.value})}/></label>)}</div>;
 return null;
}
