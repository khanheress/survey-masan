export const MARITAL_STATUSES = ['Độc thân', 'Đã kết hôn - chưa con', 'Đã kết hôn - có con'];

export const INVITERS = ['Khánh', 'Tế'];

export const RESPONDENT_FIELDS = [
  { key: 'respondent_name', label: 'Tên', type: 'text', placeholder: 'Nhập họ và tên', autoComplete: 'name', maxLength: 200 },
  { key: 'respondent_birth_year', label: 'Năm sinh', type: 'number', placeholder: 'Ví dụ: 1990', autoComplete: 'bday-year' },
  { key: 'respondent_phone', label: 'Số điện thoại', type: 'tel', placeholder: 'Nhập số điện thoại', autoComplete: 'tel', maxLength: 30 },
  { key: 'respondent_address', label: 'Địa chỉ', type: 'text', placeholder: 'Nhập địa chỉ hiện tại', autoComplete: 'street-address', maxLength: 1000 },
  { key: 'respondent_occupation', label: 'Nghề nghiệp hiện tại', type: 'text', placeholder: 'Nhập nghề nghiệp hiện tại', maxLength: 200 },
  { key: 'respondent_marital_status', label: 'Tình trạng hôn nhân', type: 'select', options: MARITAL_STATUSES },
  { key: 'respondent_inviter', label: 'Người mời', type: 'select', options: INVITERS },
];

export function validateRespondent(input, currentYear = new Date().getFullYear()) {
  const values = {};
  for (const field of RESPONDENT_FIELDS) {
    const raw = input[field.key];
    const value = typeof raw === 'string' ? raw.trim() : typeof raw === 'number' ? String(raw) : '';
    if (!value) return { error: `Vui lòng nhập ${field.label.toLowerCase()}.` };
    if (field.maxLength && value.length > field.maxLength) return { error: `${field.label} quá dài.` };
    if (field.key === 'respondent_birth_year') {
      if (!/^\d{4}$/.test(value) || Number(value) < 1900 || Number(value) > currentYear) {
        return { error: `Năm sinh phải từ 1900 đến ${currentYear}.` };
      }
      values[field.key] = Number(value);
    } else if (field.options && !field.options.includes(value)) {
      return { error: `Vui lòng chọn ${field.label.toLowerCase()} hợp lệ.` };
    } else {
      values[field.key] = value;
    }
  }
  return { values };
}
