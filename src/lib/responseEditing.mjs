import { RESPONDENT_FIELDS } from './respondent.mjs';
import { validateProfileEdit } from './participantEditing.mjs';
import { normalizePhone } from './phone.mjs';
import { vietnamYear } from './projectRules.mjs';

export async function editResponseProfile(db, id, input) {
  const allowed = new Set([...RESPONDENT_FIELDS.map(field => field.key), 'respondent_email']);
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      !Object.keys(input).length || Object.keys(input).some(key => !allowed.has(key))) {
    return { status: 400, error: 'Chỉ được chỉnh sửa thông tin người trả lời.' };
  }
  const profileInput = Object.fromEntries(Object.entries(input).filter(([key]) => key !== 'respondent_email'));
  const checked = Object.keys(profileInput).length ? validateProfileEdit(profileInput) : { values: {} };
  if (checked.error) return { status: 400, error: checked.error };
  const values = checked.values;
  for (const key of ['respondent_name', 'respondent_phone']) {
    if (Object.hasOwn(values, key) && !values[key]) return { status: 400, error: 'Tên và số điện thoại không được để trống.' };
  }
  if (values.respondent_phone && !/^\+?\d{8,15}$/.test(values.respondent_phone)) {
    return { status: 400, error: 'Số điện thoại không hợp lệ.' };
  }
  if (Object.hasOwn(input, 'respondent_email')) {
    if (input.respondent_email !== null && typeof input.respondent_email !== 'string') return { status: 400, error: 'Email không hợp lệ.' };
    const email = (input.respondent_email || '').trim();
    if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return { status: 400, error: 'Email không hợp lệ.' };
    values.respondent_email = email || null;
  }
  return db.transaction(async () => {
    const response = await db.prepare('SELECT * FROM responses WHERE id = ?').get(id);
    if (!response) return { status: 404, error: 'Không tìm thấy phản hồi.' };
    if (Object.hasOwn(values, 'respondent_phone')) {
      const phone = values.respondent_phone;
      if (phone !== normalizePhone(response.respondent_phone || '') &&
          await db.prepare('SELECT 1 FROM responses WHERE survey_id = ? AND respondent_phone_normalized = ? AND id != ?').get(response.survey_id, phone, id)) {
        return { status: 409, error: 'Số điện thoại này đã có phản hồi trong cùng khảo sát.' };
      }
      values.respondent_phone_normalized = phone;
    }
    if (Object.hasOwn(values, 'respondent_birth_year')) {
      const timestamp = String(response.created_at || '');
      const submittedAt = new Date(timestamp.includes('T') ? timestamp : timestamp.replace(' ', 'T') + 'Z');
      const year = Number.isNaN(submittedAt.getTime()) ? null : vietnamYear(submittedAt);
      if (values.respondent_birth_year && year && values.respondent_birth_year > year) return { status: 400, error: 'Năm sinh không được sau năm gửi phản hồi.' };
      values.respondent_age = values.respondent_birth_year && year ? year - values.respondent_birth_year : null;
    }
    const keys = Object.keys(values);
    await db.prepare(`UPDATE responses SET ${keys.map(key => `${key} = ?`).join(', ')} WHERE id = ?`).run(...keys.map(key => values[key]), id);
    return { status: 200, id, profile: values };
  })();
}
