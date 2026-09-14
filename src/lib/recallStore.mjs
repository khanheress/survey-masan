import { randomUUID } from 'node:crypto';
import { normalizePhone } from './participantStore.mjs';

export class RecallError extends Error {
  constructor(message, status = 400) {super(message);this.status = status;}
}

export async function initializeRecallStore(db) {
  await db.exec(`CREATE TABLE IF NOT EXISTS recall_forms (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
    share_token TEXT UNIQUE NOT NULL, allow_overlap INTEGER NOT NULL DEFAULT 0,
    is_open INTEGER NOT NULL DEFAULT 1, created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS recall_slots (
    form_id TEXT NOT NULL, starts_at TEXT NOT NULL, PRIMARY KEY(form_id, starts_at)
  );
  CREATE TABLE IF NOT EXISTS recall_bookings (
    id TEXT PRIMARY KEY, form_id TEXT NOT NULL, starts_at TEXT NOT NULL,
    name TEXT NOT NULL, phone TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(form_id, starts_at, phone)
  );
  CREATE INDEX IF NOT EXISTS recall_bookings_slot ON recall_bookings(form_id, starts_at);`);
}

function validateForm(input) {
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  const description = typeof input.description === 'string' ? input.description.trim() : '';
  if (!title || title.length > 200) throw new RecallError('Tên form phải có từ 1 đến 200 ký tự.');
  if (description.length > 5000) throw new RecallError('Mô tả tối đa 5.000 ký tự.');
  if (typeof input.allow_overlap !== 'boolean' || typeof input.is_open !== 'boolean') throw new RecallError('Cài đặt form không hợp lệ.');
  if (!Array.isArray(input.slots) || input.slots.length === 0 || input.slots.length > 500) throw new RecallError('Vui lòng nhập từ 1 đến 500 khung giờ.');
  const slots = input.slots.map((slot) => {
    if (typeof slot !== 'string' || !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/.test(slot)) throw new RecallError('Ngày hoặc giờ đăng ký không hợp lệ.');
    const date = new Date(`${slot}:00Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 16) !== slot) throw new RecallError('Ngày đăng ký không tồn tại.');
    return slot;
  });
  if (new Set(slots).size !== slots.length) throw new RecallError('Có khung giờ bị nhập trùng. Vui lòng kiểm tra lại.');
  return { title, description, slots: slots.sort(), allow_overlap: Number(input.allow_overlap), is_open: Number(input.is_open) };
}

export function canManageRecall(form, user) {return user?.role === 'admin' || form.created_by === user?.id;}

export async function getRecallForm(db, id) {
  const form = await db.prepare('SELECT * FROM recall_forms WHERE id = ?').get(id);
  if (!form) throw new RecallError('Không tìm thấy Form Recall.', 404);
  const slots = await db.prepare(`SELECT s.starts_at, COUNT(b.id) AS booked_count FROM recall_slots s
    LEFT JOIN recall_bookings b ON b.form_id = s.form_id AND b.starts_at = s.starts_at
    WHERE s.form_id = ? GROUP BY s.starts_at ORDER BY s.starts_at`).all(id);
  return { ...form, slots, booking_count: slots.reduce((sum, slot) => sum + slot.booked_count, 0) };
}

export async function saveRecallForm(db, input, user, id = null) {
  const settings = validateForm(input);
  return await db.transaction(async () => {
    if (id) {
      const existing = await getRecallForm(db, id);
      if (!canManageRecall(existing, user)) throw new RecallError('Bạn không có quyền sửa form này.', 403);
      const bookedSlots = existing.slots.filter((slot) => slot.booked_count > 0);
      if (bookedSlots.some((slot) => !settings.slots.includes(slot.starts_at))) throw new RecallError('Không thể xóa hoặc đổi giờ đã có người đăng ký.', 409);
      if (!settings.allow_overlap && bookedSlots.some((slot) => slot.booked_count > 1)) throw new RecallError('Form đã có nhiều người cùng giờ; chưa thể đổi sang mỗi giờ một người.', 409);
      await db.prepare('UPDATE recall_forms SET title = ?, description = ?, allow_overlap = ?, is_open = ? WHERE id = ?').
      run(settings.title, settings.description, settings.allow_overlap, settings.is_open, id);
      await db.prepare('DELETE FROM recall_slots WHERE form_id = ?').run(id);
    } else {
      id = randomUUID();
      await db.prepare('INSERT INTO recall_forms (id, title, description, share_token, allow_overlap, is_open, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)').
      run(id, settings.title, settings.description, randomUUID(), settings.allow_overlap, settings.is_open, user.id);
    }
    const insert = db.prepare('INSERT INTO recall_slots (form_id, starts_at) VALUES (?, ?)');
    for (const slot of settings.slots) await insert.run(id, slot);
    return await getRecallForm(db, id);
  }).immediate();
}

export async function publicRecallForm(db, token, now = new Date()) {
  const found = await db.prepare('SELECT id FROM recall_forms WHERE share_token = ?').get(token);
  if (!found) throw new RecallError('Link Form Recall không tồn tại.', 404);
  const form = await getRecallForm(db, found.id);
  if (!form.is_open) throw new RecallError('Form Recall hiện đã đóng đăng ký.', 410);
  return {
    title: form.title, description: form.description, allow_overlap: Boolean(form.allow_overlap),
    slots: form.slots.map((slot) => ({ starts_at: slot.starts_at,
      available: new Date(`${slot.starts_at}:00+07:00`) > now && (Boolean(form.allow_overlap) || slot.booked_count === 0)
    }))
  };
}

export async function bookRecall(db, token, input, now = new Date()) {
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const phone = typeof input.phone === 'string' ? normalizePhone(input.phone) : '';
  if (!name || name.length > 200) throw new RecallError('Vui lòng nhập tên, tối đa 200 ký tự.');
  if (!/^\+?\d{8,15}$/.test(phone)) throw new RecallError('Vui lòng nhập số điện thoại hợp lệ.');
  if (typeof input.starts_at !== 'string') throw new RecallError('Vui lòng chọn ngày và giờ đăng ký.');
  // Lock before reading capacity: two simultaneous requests cannot reserve the same exclusive slot.
  return await db.transaction(async () => {
    const form = await db.prepare('SELECT * FROM recall_forms WHERE share_token = ?').get(token);
    if (!form) throw new RecallError('Link Form Recall không tồn tại.', 404);
    if (!form.is_open) throw new RecallError('Form Recall hiện đã đóng đăng ký.', 410);
    const slot = await db.prepare('SELECT starts_at FROM recall_slots WHERE form_id = ? AND starts_at = ?').get(form.id, input.starts_at);
    if (!slot) throw new RecallError('Khung giờ này không thuộc form.', 400);
    if (new Date(`${slot.starts_at}:00+07:00`) <= now) throw new RecallError('Khung giờ này đã qua. Vui lòng chọn giờ khác.', 409);
    if (await db.prepare('SELECT 1 FROM recall_bookings WHERE form_id = ? AND starts_at = ? AND phone = ?').get(form.id, slot.starts_at, phone)) {
      throw new RecallError('Số điện thoại này đã đăng ký khung giờ đã chọn.', 409);
    }
    if (!form.allow_overlap && (await db.prepare('SELECT 1 FROM recall_bookings WHERE form_id = ? AND starts_at = ?').get(form.id, slot.starts_at))) {
      throw new RecallError('Khung giờ vừa có người đăng ký. Vui lòng chọn giờ khác.', 409);
    }
    await db.prepare('INSERT INTO recall_bookings (id, form_id, starts_at, name, phone) VALUES (?, ?, ?, ?, ?)').
    run(randomUUID(), form.id, slot.starts_at, name, phone);
    return { title: form.title, starts_at: slot.starts_at, message: 'Đăng ký thành công' };
  }).immediate();
}
