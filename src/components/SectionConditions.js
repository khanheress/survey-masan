'use client';
import Icon from './Icon';
import { CONDITION_OPERATORS } from '@/lib/surveyAdvanced.mjs';
export default function SectionConditions({ section, previousQuestions, onChange }) {
 const groups=section.visibility||[];
 const update=(gi,ci,patch)=>onChange(groups.map((g,i)=>i===gi?g.map((c,j)=>j===ci?{...c,...patch}:c):g));
 const condition=()=>({questionId:previousQuestions[0]?.id||'',operator:'eq',value:''});
 return <div className="section-conditions">
  <h3>Điều kiện hiển thị phần</h3><p>Chỉ hỏi phần này khi thỏa một nhóm điều kiện dưới đây. Điều kiện được xét trước logic chuyển câu hỏi.</p>
  {!groups.length&&<p className="muted">Không có điều kiện — luôn hiển thị.</p>}
  {groups.map((group,gi)=><div className="condition-group" key={gi}>
   <div className="flex-between"><strong>{gi?'HOẶC — ':''}Nhóm {gi+1}</strong><button type="button" className="btn-icon btn-ghost" aria-label={`Xóa nhóm ${gi+1}`} onClick={()=>onChange(groups.filter((_,i)=>i!==gi))}><Icon name="trash"/></button></div>
   {group.map((c,ci)=><div className="condition-row" key={ci}>
    <span>{ci?'VÀ':'Nếu'}</span>
    <select aria-label={`Câu hỏi điều kiện ${gi+1}.${ci+1}`} className="form-select" value={c.questionId} onChange={e=>update(gi,ci,{questionId:e.target.value})}><option value="">Chọn câu hỏi trước</option>{previousQuestions.map(q=><option key={q.id} value={q.id}>{q.label}</option>)}</select>
    <select aria-label="Phép so sánh" className="form-select" value={c.operator} onChange={e=>update(gi,ci,{operator:e.target.value})}>{Object.entries(CONDITION_OPERATORS).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
    {!['answered','not_answered'].includes(c.operator)&&<input aria-label="Giá trị điều kiện" className="form-input" value={c.value} onChange={e=>update(gi,ci,{value:e.target.value})} placeholder="Đáp án hoặc giá trị" list={`values-${section.id}-${gi}-${ci}`}/>}
    <datalist id={`values-${section.id}-${gi}-${ci}`}>{(previousQuestions.find(q=>q.id===c.questionId)?.options||[]).map((v,i)=><option key={i} value={v}/>)}</datalist>
    <button type="button" className="btn-icon btn-ghost" aria-label="Xóa điều kiện" onClick={()=>onChange(groups.map((g,i)=>i===gi?g.filter((_,j)=>j!==ci):g).filter(g=>g.length))}><Icon name="close"/></button>
   </div>)}
   <button type="button" className="btn btn-secondary btn-sm" onClick={()=>onChange(groups.map((g,i)=>i===gi?[...g,condition()]:g))}>+ Điều kiện (VÀ)</button>
  </div>)}
  <button type="button" className="btn btn-secondary condition-add" disabled={!previousQuestions.length} onClick={()=>onChange([...groups,[condition()]])}>+ Thêm nhóm điều kiện (HOẶC)</button>
  {!previousQuestions.length&&<p className="muted">Thêm câu hỏi ở phần trước để đặt điều kiện.</p>}
 </div>;
}
