export const END_MESSAGE = 'Cảm ơn bạn đã quan tâm. Câu trả lời của bạn chưa phù hợp với điều kiện tham gia khảo sát này.';
export const BRANCH_TYPES = ['multiple_choice', 'dropdown', 'rating', 'linear_scale'];
const TYPES = [...BRANCH_TYPES, 'short_text', 'long_text', 'checkbox', 'date', 'phone', 'email', 'section'];
const SPECIAL = ['next', 'complete', 'screenout'];
export const hasAnswer = value => value !== undefined && value !== null && (Array.isArray(value) ? value.length > 0 : String(value).trim() !== '');
export function branchValues(field) {
  if (['rating', 'linear_scale'].includes(field.type)) {
    const min = field.type === 'rating' ? 1 : (field.min ?? 1);
    const max = field.max ?? 5;
    if (!Number.isInteger(min) || !Number.isInteger(max) || max < min || max > 10 || min < 0) return [];
    return Array.from({ length: max - min + 1 }, (_, i) => String(min + i));
  }
  return field.options || [];
}
export function parseSurveyFields(value) {
  const fields = typeof value === 'string' ? JSON.parse(value) : value;
  if (!Array.isArray(fields)) throw new Error('Danh sách câu hỏi không hợp lệ.');
  return fields;
}
export function validateSurveyFields(fields) {
  if (!Array.isArray(fields) || fields.length > 500) return 'Khảo sát chỉ được có tối đa 500 câu hỏi và phần.';
  const ids = new Map();
  for (const [i, f] of fields.entries()) {
    if (!f || typeof f.id !== 'string' || !f.id || SPECIAL.includes(f.id) || ids.has(f.id) || !TYPES.includes(f.type)) return 'Câu hỏi hoặc mã câu hỏi không hợp lệ / bị trùng.';
    if (typeof f.label !== 'string' || !f.label.trim()) return 'Hãy nhập tiêu đề cho tất cả câu hỏi và phần.';
    ids.set(f.id, i);
    if (['multiple_choice', 'dropdown', 'checkbox'].includes(f.type) && (!Array.isArray(f.options) || !f.options.length || f.options.some(v => typeof v !== 'string' || !v.trim()) || new Set(f.options).size !== f.options.length)) return `“${f.label}”: các lựa chọn phải có nội dung và không trùng nhau.`;
    if (['rating', 'linear_scale'].includes(f.type) && !branchValues(f).length) return `“${f.label}”: thang điểm không hợp lệ.`;
    if (f.rules !== undefined && !Array.isArray(f.rules)) return `“${f.label}”: quy tắc không hợp lệ.`;
  }
  for (const [i, f] of fields.entries()) {
    const targetValid = (target, from = i) => SPECIAL.includes(target) || (ids.has(target) && ids.get(target) > from);
    if (f.type === 'section') {
      const nextSection = fields.findIndex((other, j) => j > i && other.type === 'section');
      if (f.after && (f.after === 'screenout' || !targetValid(f.after, nextSection < 0 ? fields.length - 1 : nextSection - 1))) return `“${f.label}”: sau phần này chỉ được đến phần phía sau hoặc hoàn tất.`;
      if (f.after && !SPECIAL.includes(f.after) && fields[ids.get(f.after)]?.type !== 'section') return `“${f.label}”: hãy chọn một phần làm điểm đến.`;
      if (f.rules?.length) return 'Hãy đặt quy tắc theo câu trả lời trên câu hỏi, không đặt trên tiêu đề phần.';
      continue;
    }
    if (f.rules?.length && !BRANCH_TYPES.includes(f.type)) return `“${f.label}”: loại câu hỏi này chưa hỗ trợ rẽ nhánh.`;
    const used = new Set();
    for (const rule of f.rules || []) {
      if (!rule || typeof rule.value !== 'string' || !branchValues(f).includes(rule.value) || used.has(rule.value) || !targetValid(rule.target)) return `“${f.label}”: quy tắc bị trùng, lựa chọn đã đổi hoặc điểm đến không còn nằm phía sau. Hãy sửa quy tắc trước khi lưu.`;
      if (rule.message !== undefined && (typeof rule.message !== 'string' || rule.message.length > 1000)) return 'Thông báo kết thúc tối đa 1.000 ký tự.';
      used.add(rule.value);
    }
  }
  return null;
}

// Forward-only traversal guarantees termination. Client and API use the same path.
export function evaluateSurvey(fields, answers = {}) {
  const configError = validateSurveyFields(fields);
  if (configError) return { status: 'invalid', error: configError, visible: [], answers: {} };
  const visible = [], clean = {};
  const indexOf = new Map(fields.map((f, i) => [f.id, i]));
  let index = 0, activeSection = null;
  const result = (status, extra = {}) => ({ status, visible, answers: clean, ...extra });
  while (index < fields.length) {
    const field = fields[index];
    if (field.type === 'section') { activeSection = field; visible.push(field); index++; }
    else {
      visible.push(field);
      const value = answers[field.id];
      if (hasAnswer(value)) clean[field.id] = value;
      if (field.rules?.length && !hasAnswer(value)) return result('pending');
      const rule = field.rules?.find(r => r.value === String(value));
      if (rule?.target === 'screenout') return result('screenout', { message: rule.message?.trim() || END_MESSAGE });
      if (rule?.target === 'complete') return result('complete');
      if (rule && rule.target !== 'next') {
        const target = indexOf.get(rule.target);
        // Enter the containing section even when a branch points directly to its question.
        const owner = fields.slice(0, target + 1).findLast(f => f.type === 'section');
        if (owner && owner.id !== activeSection?.id && fields[target].type !== 'section') visible.push(owner);
        activeSection = owner || null;
        index = target;
        continue;
      }
      index++;
    }
    if (index === fields.length || fields[index].type === 'section') {
      const after = activeSection?.after;
      if (after === 'complete') return result('complete');
      if (after && after !== 'next') index = indexOf.get(after);
      activeSection = null;
    }
  }
  return result('complete');
}

export function changeSurveyAnswer(fields, previous, id, value) {
  // Only a changed branching answer invalidates downstream answers. Ordinary edits preserve them.
  const index = fields.findIndex(f => f.id === id);
  if (index < 0) return previous;
  if (!fields[index].rules?.length || Object.is(previous[id], value)) return evaluateSurvey(fields, { ...previous, [id]: value }).answers;
  const retained = Object.fromEntries(fields.slice(0, index).filter(f => Object.hasOwn(previous, f.id)).map(f => [f.id, previous[f.id]]));
  const next = { ...retained, [id]: value };
  return evaluateSurvey(fields, next).answers;
}
export function validateSurveyAnswers(fields, answers) {
  const flow = evaluateSurvey(fields, answers);
  if (flow.status === 'invalid') return { ...flow, error: 'Cấu hình khảo sát không hợp lệ. Vui lòng liên hệ người tạo khảo sát.' };
  if (flow.status === 'screenout') return { ...flow, error: flow.message };
  for (const field of flow.visible) {
    if (field.type === 'section') continue;
    const value = flow.answers[field.id];
    if ((field.required || field.rules?.length) && !hasAnswer(value)) return { ...flow, error: `Vui lòng trả lời câu hỏi: ${field.label}` };
    if (!hasAnswer(value)) continue;
    const choice = ['multiple_choice', 'dropdown'].includes(field.type);
    if ((choice && (typeof value !== 'string' || !field.options.includes(value))) ||
        (field.type === 'checkbox' && (!Array.isArray(value) || value.some(v => !field.options.includes(v)))) ||
        (['rating', 'linear_scale'].includes(field.type) && (!['number', 'string'].includes(typeof value) || !branchValues(field).includes(String(value)))) ||
        (!choice && !['checkbox', 'rating', 'linear_scale'].includes(field.type) && typeof value !== 'string')) return { ...flow, error: `Câu trả lời không hợp lệ: ${field.label}` };
  }
  return flow;
}
