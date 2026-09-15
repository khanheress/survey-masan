'use client';
import SurveyLogicEditor from './SurveyLogicEditor';
export default function QuestionEditor({field,fields,index,onChange}) {
 const previous=fields.slice(0,index).filter(f=>f.type!=='section');
 const lines=(key,label)=> <label className="form-label">{label}<textarea className="form-textarea" value={(field[key]||[]).join('\n')} onChange={e=>onChange({[key]:e.target.value.split('\n')})}/><small>Mỗi dòng là một mục.</small></label>;
 return <div className="question-editor">
  <label className="form-label">Nội dung câu hỏi<textarea className="form-textarea" value={field.label} onChange={e=>onChange({label:e.target.value})}/></label>
  <label className="form-label">Chèn câu trả lời trước
   <select className="form-select" value="" onChange={e=>{if(e.target.value)onChange({label:field.label+` {{q:${e.target.value}}}`});}}><option value="">Chọn câu hỏi để chèn vào nội dung…</option>{previous.filter(q=>q.type!=='file').map(q=><option key={q.id} value={q.id}>{q.label}</option>)}</select>
  </label>
  {['multiple_choice','checkbox','dropdown','allocation'].includes(field.type)&&lines('options','Các lựa chọn')}
  {['matrix_single','matrix_multi'].includes(field.type)&&<div className="editor-grid">{lines('rows','Hàng')}{lines('columns','Cột')}</div>}
  {field.type==='allocation'&&<label className="form-label">Tổng số lần cần phân bổ<input type="number" min={1} max={100000} className="form-input" value={field.total??10} onChange={e=>onChange({total:Number(e.target.value)})}/></label>}
  {field.type==='detail_followup'&&<label className="form-label">Lấy đáp án đã chọn từ câu hỏi<select className="form-select" value={field.sourceId||''} onChange={e=>onChange({sourceId:e.target.value})}><option value="">Chọn câu hỏi nguồn…</option>{previous.filter(q=>['checkbox','multiple_choice','dropdown'].includes(q.type)).map(q=><option key={q.id} value={q.id}>{q.label}</option>)}</select></label>}
  {['short_text','long_text','phone','email'].includes(field.type)&&<label className="form-label">Gợi ý nhập<input className="form-input" value={field.placeholder||''} onChange={e=>onChange({placeholder:e.target.value})}/></label>}
  {['rating','linear_scale'].includes(field.type)&&<div className="editor-grid">
   {field.type==='linear_scale'&&<label className="form-label">Từ<select className="form-select" value={field.min??1} onChange={e=>onChange({min:Number(e.target.value)})}><option value={0}>0</option><option value={1}>1</option></select></label>}
   <label className="form-label">Đến<select className="form-select" value={field.max??5} onChange={e=>onChange({max:Number(e.target.value)})}>{[2,3,4,5,6,7,8,9,10].map(n=><option key={n}>{n}</option>)}</select></label>
   {field.type==='rating'?<label className="form-label">Biểu tượng<select className="form-select" value={field.ratingIcon||'star'} onChange={e=>onChange({ratingIcon:e.target.value})}><option value="star">Ngôi sao</option><option value="heart">Trái tim</option><option value="smile">Mặt cười</option></select></label>:<><label className="form-label">Nhãn đầu<input className="form-input" value={field.minLabel||''} onChange={e=>onChange({minLabel:e.target.value})}/></label><label className="form-label">Nhãn cuối<input className="form-input" value={field.maxLabel||''} onChange={e=>onChange({maxLabel:e.target.value})}/></label></>}
  </div>}
  {field.type==='file'&&<p className="survey-flow-note">Cho tải PNG, JPG, WebP hoặc PDF, tối đa 512 KB/tệp và tổng 1 MB/phiếu. Ảnh chụp được thu nhỏ tự động. Tệp được lưu cùng phản hồi và chỉ người quản lý đăng nhập mới xem được.</p>}
  {['multiple_choice','checkbox','dropdown'].includes(field.type)&&<label className="question-required"><input type="checkbox" checked={field.purpose==='bumo'} onChange={e=>onChange({purpose:e.target.checked?'bumo':undefined})}/> Dùng làm câu hỏi BUMO của dự án</label>}
  <label className="question-required"><input type="checkbox" checked={field.required||false} onChange={e=>onChange({required:e.target.checked})}/> Bắt buộc trả lời</label>
  <SurveyLogicEditor field={field} fields={fields} index={index} onChange={onChange}/>
 </div>;
}
