export function normalizePhone(value = '') {
  const phone = String(value).trim().replace(/[\s().-]/g, '');
  return /^(?:\+84|0084)\d{9}$/.test(phone) ? `0${phone.replace(/^(?:\+84|0084)/, '')}` : phone;
}
