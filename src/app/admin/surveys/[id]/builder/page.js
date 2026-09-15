'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/Icon';
import Modal from '@/components/Modal';
import QuestionEditor from '@/components/QuestionEditor';
import SectionConditions from '@/components/SectionConditions';
import SurveyLogicEditor from '@/components/SurveyLogicEditor';
import SurveyFlowPreview from '@/components/SurveyFlowPreview';
import { useToast } from '@/components/Toast';
import { validateSurveyFields } from '@/lib/surveyFlow.mjs';
import { QUESTION_TYPES, newQuestion, newSection, ensureSections, splitSections, duplicateItems, referencesAny } from '@/lib/surveyEditor.mjs';

export default function SurveyBuilderPage({params}) {
 const {id}=React.use(params),router=useRouter(),{addToast}=useToast();
 const [survey,setSurvey]=useState(null),[fields,setFields]=useState([]),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false);
 const [activeId,setActiveId]=useState(''),[expandedId,setExpandedId]=useState(''),[preview,setPreview]=useState(false),[deletion,setDeletion]=useState(null);
 useEffect(()=>{let cancelled=false;(async()=>{try{
  const res=await fetch(`/api/surveys/${id}`);if(!res.ok)throw Error('Không thể tải khảo sát.');const data=await res.json();
  if(!cancelled){const items=ensureSections(data.fields_json||[]);setSurvey(data);setFields(items);setActiveId(items[0].id);}
 }catch(e){if(!cancelled)addToast(e.message,'error');}finally{if(!cancelled)setLoading(false);}})();return()=>{cancelled=true;};},[id,addToast]);
 const sections=splitSections(fields),active=sections.find(s=>s.section.id===activeId)||sections[0];
 const activeIndex=active?fields.findIndex(f=>f.id===active.section.id):-1;
 const update=(fieldId,patch)=>setFields(previous=>previous.map(f=>f.id===fieldId?{...f,...patch}:f));
 const applyMove=items=>{const error=validateSurveyFields(items);if(error){addToast(error,'error');return false;}setFields(items);return true;};
 const save=async()=>{
  const error=validateSurveyFields(fields);if(error){addToast(error,'error');return false;}setSaving(true);
  try {const res=await fetch(`/api/surveys/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:survey.title,description:survey.description,fields_json:fields})});const data=await res.json();if(!res.ok)throw Error(data.error||'Không thể lưu.');setSurvey(data);addToast('Đã lưu khảo sát','success');return true;}catch(e){addToast(e.message,'error');return false;}finally{setSaving(false);}
 };
 const publish=async()=>{if(!survey.is_published&&!(await save()))return;setSaving(true);try{const res=await fetch(`/api/surveys/${id}/publish`,{method:'POST'});const data=await res.json();if(!res.ok)throw Error(data.error||'Không thể công khai.');setSurvey(previous=>({...previous,is_published:data.is_published}));addToast(data.is_published?'Đã công khai khảo sát':'Đã ngừng công khai','success');}catch(e){addToast(e.message,'error');}finally{setSaving(false);}};
 const addSection=()=>{const item=newSection();setFields([...fields,item]);setActiveId(item.id);setExpandedId('');};
 const addQuestion=type=>{const question=newQuestion(type);if(type==='detail_followup')question.sourceId=fields.filter((f,i)=>i<activeIndex+1+active.questions.length&&['checkbox','multiple_choice','dropdown'].includes(f.type)).at(-1)?.id||'';const index=activeIndex+1+active.questions.length;setFields([...fields.slice(0,index),question,...fields.slice(index)]);setExpandedId(question.id);};
 const moveSection=(position,direction)=>{const items=[...sections];if(position+direction<0||position+direction>=items.length)return;[items[position],items[position+direction]]=[items[position+direction],items[position]];applyMove(items.flatMap(s=>[s.section,...s.questions]));};
 const copySection=group=>{const copied=duplicateItems([group.section,...group.questions]);const end=fields.findIndex(f=>f.id===group.section.id)+1+group.questions.length;const items=[...fields.slice(0,end),...copied,...fields.slice(end)];if(applyMove(items))setActiveId(copied[0].id);};
 const moveQuestion=(question,direction)=>{const index=fields.findIndex(f=>f.id===question.id),neighbor=fields[index+direction];if(!neighbor||neighbor.type==='section')return;const items=[...fields];[items[index],items[index+direction]]=[items[index+direction],items[index]];applyMove(items);};
 const transfer=(question,targetId)=>{const items=fields.filter(f=>f.id!==question.id);const target=items.findIndex(f=>f.id===targetId);const next=items.findIndex((f,i)=>i>target&&f.type==='section');items.splice(next<0?items.length:next,0,question);if(applyMove(items)){setActiveId(targetId);setExpandedId(question.id);}};
 const copyQuestion=question=>{const index=fields.findIndex(f=>f.id===question.id),[copy]=duplicateItems([question]);copy.label+=' (bản sao)';if(applyMove([...fields.slice(0,index+1),copy,...fields.slice(index+1)]))setExpandedId(copy.id);};
 const remove=()=>{const ids=new Set(deletion.ids);if(referencesAny(fields,ids)){addToast('Mục này đang được dùng trong điều kiện, logic hoặc câu hỏi khác. Hãy sửa các tham chiếu trước khi xóa.','error');setDeletion(null);return;}const items=fields.filter(f=>!ids.has(f.id));const result=items.length?items:[newSection()];setFields(result);if(ids.has(activeId))setActiveId(result[0].id);setDeletion(null);};
 if(loading)return <div className="flex-center" style={{minHeight:400}}><div className="spinner"/></div>;
 if(!survey||!active)return <p>Không thể mở khảo sát.</p>;
 return <div className="section-builder animate-fadeIn">
  <header className="section-builder-toolbar"><div><button className="btn btn-ghost btn-sm" onClick={()=>router.push(`/admin/projects/${survey.project_id}`)}>← Dự án</button><h1>Tạo câu hỏi khảo sát</h1></div><div className="builder-toolbar-actions">
   <button className="btn btn-secondary" onClick={()=>setPreview(true)}><Icon name="eye"/> Xem trước</button>
   {Boolean(survey.is_published)&&<button className="btn btn-secondary" onClick={async()=>{try{await navigator.clipboard.writeText(`${location.origin}/s/${survey.share_token}`);addToast('Đã sao chép link','success');}catch{addToast('Không thể sao chép link','error');}}}><Icon name="link"/> Copy link</button>}
   <button className="btn btn-secondary" disabled={saving} onClick={publish}>{survey.is_published?'Ngừng công khai':'Công khai'}</button><button className="btn btn-primary" disabled={saving} onClick={save}><Icon name="save"/>{saving?'Đang lưu…':'Lưu'}</button>
  </div></header>
  <details className="survey-title-settings"><summary>{survey.title||'Thông tin khảo sát'} <Icon name="edit"/></summary><label className="form-label">Tiêu đề khảo sát<input className="form-input" value={survey.title||''} onChange={e=>setSurvey({...survey,title:e.target.value})}/></label><label className="form-label">Mô tả<textarea className="form-textarea" value={survey.description||''} onChange={e=>setSurvey({...survey,description:e.target.value})}/></label></details>
  <div className="section-builder-layout">
   <aside className="section-list" aria-label="Các phần khảo sát"><h2>CÁC PHẦN</h2>
    {sections.map((group,i)=><div className={`section-list-item ${active.section.id===group.section.id?'selected':''}`} key={group.section.id}>
     <button className="section-select" aria-current={active.section.id===group.section.id?'true':undefined} onClick={()=>{setActiveId(group.section.id);setExpandedId('');}}><strong>{i+1}. {group.section.label}</strong><span>{group.questions.length} câu hỏi</span></button>
     {active.section.id===group.section.id&&<div className="item-actions">
      <button className="item-action" aria-label="Đưa phần lên" disabled={i===0} onClick={()=>moveSection(i,-1)}>↑</button><button className="item-action" aria-label="Đưa phần xuống" disabled={i===sections.length-1} onClick={()=>moveSection(i,1)}>↓</button><button className="item-action" aria-label="Sao chép phần" onClick={()=>copySection(group)}><Icon name="copy"/></button><button className="item-action danger" aria-label="Xóa phần" onClick={()=>setDeletion({label:group.section.label,ids:[group.section.id,...group.questions.map(q=>q.id)]})}><Icon name="trash"/></button>
     </div>}
    </div>)}<button className="btn btn-secondary add-section" onClick={addSection}>+ Thêm phần</button>
   </aside>
   <div className="section-editor-main">
    <section className="section-settings">
     <label className="sr-only" htmlFor="section-name">Tên phần</label><input id="section-name" className="section-name" value={active.section.label} onChange={e=>update(active.section.id,{label:e.target.value})}/>
     <label className="sr-only" htmlFor="section-description">Mô tả phần</label><textarea id="section-description" className="section-description" placeholder="Mô tả phần (không bắt buộc)" value={active.section.description||''} onChange={e=>update(active.section.id,{description:e.target.value})}/>
     <SurveyLogicEditor field={active.section} fields={fields} index={activeIndex} onChange={patch=>update(active.section.id,patch)}/>
     <SectionConditions section={active.section} previousQuestions={fields.slice(0,activeIndex).filter(f=>f.type!=='section')} onChange={visibility=>update(active.section.id,{visibility})}/>
    </section>
    {active.questions.map((question,i)=><article className="section-question-card" key={question.id}>
     <div className="question-summary-row"><button className="question-summary" aria-expanded={expandedId===question.id} onClick={()=>setExpandedId(expandedId===question.id?'':question.id)}><span>Câu {i+1} · {QUESTION_TYPES.find(t=>t[0]===question.type)?.[1]}</span><h3>{question.label} {(question.required||question.rules?.length>0)&&<em>*</em>}</h3><p>{question.type==='file'?'Ảnh hoặc PDF · tối đa 512 KB':question.type==='detail_followup'?'Theo các đáp án đã chọn ở câu hỏi trước':(['matrix_single','matrix_multi'].includes(question.type)?question.rows||[]:['multiple_choice','checkbox','dropdown','allocation'].includes(question.type)?question.options||[]:[]).join(' · ')}</p></button>
      <div className="question-actions"><select aria-label={`Chuyển câu ${i+1} sang phần`} className="form-select" value="" onChange={e=>transfer(question,e.target.value)}><option value="" disabled>Chuyển sang…</option>{sections.filter(g=>g.section.id!==active.section.id).map(g=><option key={g.section.id} value={g.section.id}>{g.section.label}</option>)}</select><button className="item-action" aria-label={`Đưa câu ${i+1} lên`} disabled={i===0} onClick={()=>moveQuestion(question,-1)}>↑</button><button className="item-action" aria-label={`Đưa câu ${i+1} xuống`} disabled={i===active.questions.length-1} onClick={()=>moveQuestion(question,1)}>↓</button><button className="item-action" aria-label={`Sao chép câu ${i+1}`} onClick={()=>copyQuestion(question)}><Icon name="copy"/></button><button className="item-action danger" aria-label={`Xóa câu ${i+1}`} onClick={()=>setDeletion({label:question.label,ids:[question.id]})}><Icon name="trash"/></button></div>
     </div>
     {expandedId===question.id&&<QuestionEditor field={question} fields={fields} index={fields.findIndex(f=>f.id===question.id)} onChange={patch=>update(question.id,patch)}/>}
    </article>)}
    {!active.questions.length&&<div className="section-empty">Phần này chưa có câu hỏi. Chọn loại câu hỏi bên dưới để bắt đầu.</div>}
    <section className="question-palette"><h2>+ THÊM CÂU HỎI</h2><div>{QUESTION_TYPES.map(([type,label])=><button className="btn btn-secondary" key={type} onClick={()=>addQuestion(type)}>{label}</button>)}</div></section>
   </div>
  </div>
  <Modal isOpen={preview} onClose={()=>setPreview(false)} title="Xem trước khảo sát" size="lg"><h2>{survey.title}</h2><SurveyFlowPreview key={JSON.stringify(fields)} fields={fields}/></Modal>
  <Modal isOpen={!!deletion} onClose={()=>setDeletion(null)} title="Xóa mục này?" footer={<><button className="btn btn-secondary" onClick={()=>setDeletion(null)}>Hủy</button><button className="btn btn-danger" onClick={remove}>Xác nhận xóa</button></>}><p>“{deletion?.label}”{deletion?.ids.length>1?' và toàn bộ câu hỏi trong phần này':''} sẽ bị xóa khỏi bản đang chỉnh sửa.</p></Modal>
 </div>;
}
