export const ADVANCED_TYPES = ['matrix_single', 'matrix_multi', 'allocation', 'detail_followup', 'file'];
export const FILE_LIMIT = 512 * 1024;
export const TOTAL_FILE_LIMIT = 1024 * 1024;
export const FILE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
export const CONDITION_OPERATORS = { eq:'Bằng', neq:'Khác', includes:'Có chọn', excludes:'Không chọn', answered:'Đã trả lời', not_answered:'Chưa trả lời', gt:'Lớn hơn', gte:'Lớn hơn hoặc bằng', lt:'Nhỏ hơn', lte:'Nhỏ hơn hoặc bằng' };
const filled = v => v !== undefined && v !== null && (Array.isArray(v) ? v.length > 0 : typeof v === 'object' ? Object.values(v).some(filled) : String(v).trim() !== '');
const plain = v => v && typeof v === 'object' && !Array.isArray(v);
const list = values => Array.isArray(values) && values.length > 0 && values.length <= 100 && values.every(v => typeof v === 'string' && v.trim() && !['__proto__','constructor','prototype'].includes(v)) && new Set(values).size === values.length;
export function formatAnswer(value) {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) return value.map(formatAnswer).join(', ');
  if (typeof value === 'object') {
    if (value.kind === 'file') return value.name || 'Tệp đính kèm';
    return Object.entries(value).map(([key, val]) => `${key}: ${formatAnswer(val)}`).join('; ');
  }
  return String(value);
}
export function pipeText(text = '', answers = {}) {
  return text.replace(/\{\{q:([^{}]+)\}\}/g, (_, id) => formatAnswer(answers[id]) || '…');
}
export function selectedDetails(field, answers) {
  const value = answers[field.sourceId];
  return Array.isArray(value) ? value : filled(value) ? [String(value)] : [];
}
export function sectionVisible(groups, answers) {
  if (!groups?.length) return true;
  return groups.some(group => group.every(c => {
    const value = answers[c.questionId], exists = filled(value);
    if (c.operator === 'answered') return exists;
    if (c.operator === 'not_answered') return !exists;
    if (!exists) return false;
    if (c.operator === 'eq') return String(value) === c.value;
    if (c.operator === 'neq') return String(value) !== c.value;
    if (c.operator === 'includes') return Array.isArray(value) ? value.includes(c.value) : String(value) === c.value;
    if (c.operator === 'excludes') return Array.isArray(value) ? !value.includes(c.value) : String(value) !== c.value;
    const a=Number(value), b=Number(c.value);
    if (!Number.isFinite(a) || !Number.isFinite(b) || Array.isArray(value)) return false;
    return ({gt:a>b,gte:a>=b,lt:a<b,lte:a<=b})[c.operator] || false;
  }));
}
export function validateAdvancedDefinition(field, fields, index) {
  const prior = id => fields.slice(0,index).find(f => f.id === id && f.type !== 'section');
  for (const text of [field.label, field.description || '']) {
    if (typeof text !== 'string') return 'Mô tả phải là văn bản.';
    for (const match of text.matchAll(/\{\{q:([^{}]+)\}\}/g)) if (!prior(match[1])) return `“${field.label}”: chỉ được chèn câu trả lời của câu hỏi phía trước.`;
  }
  if (field.visibility !== undefined) {
    if (field.type !== 'section' || !Array.isArray(field.visibility) || field.visibility.length > 30) return 'Điều kiện hiển thị phần không hợp lệ.';
    for (const group of field.visibility) {
      if (!Array.isArray(group) || !group.length || group.length > 30) return 'Mỗi nhóm điều kiện cần ít nhất một điều kiện.';
      for (const c of group) if (!c || !prior(c.questionId) || !Object.hasOwn(CONDITION_OPERATORS,c.operator) || typeof c.value !== 'string') return `“${field.label}”: điều kiện phải tham chiếu câu hỏi phía trước và có phép so sánh hợp lệ.`;
    }
  }
  if (['matrix_single','matrix_multi'].includes(field.type) && (!list(field.rows) || !list(field.columns))) return `“${field.label}”: nhập các hàng, cột có nội dung và không trùng nhau.`;
  if (field.type === 'allocation' && (!list(field.options) || !Number.isInteger(field.total) || field.total < 1 || field.total > 100000)) return `“${field.label}”: nhập danh sách và tổng phân bổ từ 1 đến 100.000.`;
  if (field.type === 'detail_followup' && !['checkbox','multiple_choice','dropdown'].includes(prior(field.sourceId)?.type)) return `“${field.label}”: chọn câu hỏi một/nhiều lựa chọn phía trước làm nguồn.`;
  return null;
}
export function validateAdvancedAnswer(field, value, answers) {
  if (!ADVANCED_TYPES.includes(field.type)) return null;
  const bad = `Câu trả lời không hợp lệ: ${field.label}`;
  if (field.type === 'file') {
    if (value?.kind === 'uploading') return 'Tệp đang được xử lý. Vui lòng chờ trước khi gửi.';
    if (!plain(value) || value.kind !== 'file' || typeof value.name !== 'string' || !value.name.trim() || value.name.length > 200 || !FILE_MIMES.includes(value.mime) || !Number.isInteger(value.size) || value.size <= 0 || value.size > FILE_LIMIT || typeof value.data !== 'string') return bad;
    if (value.data.length > Math.ceil(FILE_LIMIT / 3) * 4 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value.data)) return bad;
    const size = value.data.length / 4 * 3 - (value.data.endsWith('==') ? 2 : value.data.endsWith('=') ? 1 : 0);
    if (size !== value.size) return bad;
    const signature = atob(value.data.slice(0, Math.min(64,value.data.length)));
    if ((value.mime === 'application/pdf' && !signature.startsWith('%PDF-')) ||
        (value.mime === 'image/png' && !signature.startsWith('\x89PNG\r\n\x1a\n')) ||
        (value.mime === 'image/jpeg' && !signature.startsWith('\xff\xd8\xff')) ||
        (value.mime === 'image/webp' && !(signature.startsWith('RIFF') && signature.slice(8,12)==='WEBP'))) return bad;
    return null;
  }
  if (!plain(value)) return bad;
  const keys = field.type === 'detail_followup' ? selectedDetails(field,answers) : field.type === 'allocation' ? field.options : field.rows;
  if (Object.keys(value).some(k => !keys.includes(k))) return bad;
  if (field.type === 'allocation') {
    if (Object.values(value).some(v => !Number.isInteger(v) || v < 0 || v > field.total) || Object.values(value).reduce((a,b)=>a+b,0) !== field.total) return `Tổng phân bổ của “${field.label}” phải bằng ${field.total}.`;
    return null;
  }
  for (const key of keys) {
    const v=value[key];
    if (field.required && !filled(v)) return `Vui lòng trả lời “${key}” trong câu “${field.label}”.`;
    if (!filled(v)) continue;
    if (field.type === 'matrix_single' && (typeof v !== 'string' || !field.columns.includes(v))) return bad;
    if (field.type === 'matrix_multi' && (!Array.isArray(v) || v.some(x=>!field.columns.includes(x)) || new Set(v).size !== v.length)) return bad;
    if (field.type === 'detail_followup' && (typeof v !== 'string' || v.length > 5000)) return bad;
  }
  return null;
}
