'use client';
import { BRANCH_TYPES, branchValues } from '@/lib/surveyFlow.mjs';

export default function SurveyLogicEditor({ field, fields, index, onChange }) {
  const section = field.type === 'section';
  if (!section && !BRANCH_TYPES.includes(field.type)) return null;
  const destinations = fields.filter((item, i) => i > index && (!section || item.type === 'section'));
  const options = (screenout = true) => <>
    <option value="next">Tiếp tục theo thứ tự</option>
    {destinations.map(item => <option key={item.id} value={item.id}>{item.type === 'section' ? 'Phần' : 'Câu hỏi'}: {item.label}</option>)}
    <option value="complete">Hoàn tất và cho gửi phản hồi</option>
    {screenout && <option value="screenout">Kết thúc ngay — không đạt điều kiện</option>}
  </>;
  if (section) return <div className="form-group">
    <label className="form-label" htmlFor={`after-${field.id}`}>Sau phần này</label>
    <select id={`after-${field.id}`} className="form-select" value={field.after || 'next'} onChange={e => onChange({ after: e.target.value })}>
      {options(false)}
      {field.after && !['next', 'complete'].includes(field.after) && !destinations.some(d => d.id === field.after) && <option value={field.after}>Điểm đến không hợp lệ — hãy chọn lại</option>}
    </select>
  </div>;
  const rules = field.rules || [];
  const updateRule = (value, changes) => {
    const updated = { value, target: 'next', ...rules.find(r => r.value === value), ...changes };
    onChange({ rules: [...rules.filter(r => r.value !== value), updated].filter(r => r.target !== 'next') });
  };
  return <details className="survey-logic-editor">
    <summary>Logic theo câu trả lời {rules.length ? `(${rules.length} quy tắc)` : ''}</summary>
    <p className="survey-flow-note">Chọn điểm đến cho từng đáp án. Câu hỏi có quy tắc sẽ bắt buộc trả lời. Thay đổi đáp án của câu có quy tắc sẽ xóa câu trả lời phía sau.</p>
    {branchValues(field).map((value, i) => {
      const rule = rules.find(r => r.value === value);
      return <div className="survey-rule" key={i}>
        <label className="form-label" htmlFor={`rule-${field.id}-${i}`}>Nếu chọn “{value}”</label>
        <select id={`rule-${field.id}-${i}`} className="form-select" value={rule?.target || 'next'} onChange={e => updateRule(value, { target: e.target.value })}>
          {options()}
          {rule && !['complete', 'screenout', 'next'].includes(rule.target) && !destinations.some(d => d.id === rule.target) && <option value={rule.target}>Điểm đến không hợp lệ — hãy chọn lại</option>}
        </select>
        {rule?.target === 'screenout' && <label className="form-label">Thông báo khi kết thúc
          <textarea className="form-textarea" maxLength={1000} value={rule.message || ''} onChange={e => updateRule(value, { message: e.target.value })} placeholder="Cảm ơn bạn. Bạn chưa phù hợp với điều kiện tham gia khảo sát này." />
        </label>}
      </div>;
    })}
    {rules.some(rule => !branchValues(field).includes(rule.value)) && <button type="button" className="btn btn-secondary" onClick={() => onChange({ rules: rules.filter(r => branchValues(field).includes(r.value)) })}>Xóa quy tắc của đáp án không còn tồn tại</button>}
  </details>;
}
