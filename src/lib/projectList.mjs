function dateValue(value) {
  if (!value) return null;
  const text = String(value);
  const timestamp = Date.parse(text.includes(' ') ? text.replace(' ', 'T') + 'Z' : text);
  return Number.isNaN(timestamp) ? null : timestamp;
}

export function sortProjects(projects, { key = 'created_at', direction = 'desc' } = {}) {
  const multiplier = direction === 'asc' ? 1 : -1;
  return [...projects].sort((a, b) => {
    let order = 0;
    if (key === 'status') {
      order = Number(a.status !== 'active') - Number(b.status !== 'active');
    } else if (key === 'name') {
      order = (a.name || '').localeCompare(b.name || '', 'vi');
    } else {
      const first = dateValue(a[key]);
      const second = dateValue(b[key]);
      // Projects without a date stay at the bottom in either direction.
      if (first === null && second !== null) return 1;
      if (first !== null && second === null) return -1;
      if (first !== null && second !== null) order = first - second;
    }
    return order * multiplier || (a.name || '').localeCompare(b.name || '', 'vi') || String(a.id).localeCompare(String(b.id));
  });
}

export function formatProjectDate(value) {
  const timestamp = dateValue(value);
  return timestamp === null ? 'Không giới hạn' : new Date(timestamp).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}
