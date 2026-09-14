// Date-only project settings follow the Vietnamese calendar, independent of the server timezone.
function dateBoundary(value, endOfDay) {
  if (value == null || value === '') return endOfDay ? Infinity : -Infinity;
  if (typeof value !== 'string') return NaN;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const day = new Date(`${value}T00:00:00Z`);
    if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== value) return NaN;
    return Date.parse(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}+07:00`);
  }
  return Date.parse(value);
}

export function getSurveyAvailability(project, responseCount = 0, now = new Date()) {
  const start = dateBoundary(project.start_date, false);
  const end = dateBoundary(project.end_date, true);
  const time = now.getTime();
  const capacityRemaining = project.max_responses > 0
    ? Math.max(0, project.max_responses - responseCount)
    : null;
  const hasCapacity = capacityRemaining === null || capacityRemaining > 0;
  let reason = null;
  let message = null;

  if (project.status !== 'active') {
    reason = 'inactive';
    message = 'Dự án hiện không hoạt động.';
  } else if (Number.isNaN(start) || Number.isNaN(end) || start > end || !Number.isFinite(time)) {
    reason = 'invalid_schedule';
    message = 'Thời gian khảo sát chưa được thiết lập hợp lệ. Vui lòng liên hệ người tạo khảo sát.';
  } else if (time < start) {
    reason = 'not_started';
    message = 'Khảo sát chưa đến thời gian bắt đầu.';
  } else if (time > end) {
    reason = 'ended';
    message = 'Khảo sát đã hết thời gian nhận phản hồi.';
  }

  const isActive = reason === null;
  if (isActive && !hasCapacity) {
    reason = 'capacity_reached';
    message = 'Khảo sát đã nhận đủ số lượng phản hồi.';
  }

  return { isOpen: reason === null, isActive, hasCapacity, capacityRemaining, reason, message };
}
