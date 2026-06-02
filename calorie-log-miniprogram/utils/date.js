function pad(n) {
  return n < 10 ? `0${n}` : `${n}`;
}

function parseDate(dateStr) {
  if (dateStr instanceof Date) return new Date(dateStr.getTime());
  if (!dateStr) return new Date();
  const parts = String(dateStr).split('-').map(Number);
  if (parts.length >= 3 && parts.every((n) => !Number.isNaN(n))) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  return new Date(dateStr);
}

function formatDate(date = new Date()) {
  const d = parseDate(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function today() {
  return formatDate(new Date());
}

function addDays(dateStr, days) {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + Number(days || 0));
  return formatDate(d);
}

function addMonths(yearMonth, months) {
  const [y, m] = String(yearMonth || formatMonth()).split('-').map(Number);
  const d = new Date(y, (m || 1) - 1 + Number(months || 0), 1);
  return formatMonth(d);
}

function formatMonth(date = new Date()) {
  const d = parseDate(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

function startOfWeek(dateStr) {
  const d = parseDate(dateStr);
  const day = d.getDay() || 7; // Monday=1, Sunday=7
  d.setDate(d.getDate() - day + 1);
  return formatDate(d);
}

function addHoursToDate(dateStr, hour = 12) {
  const d = parseDate(dateStr);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function toIsoNoMs(date) {
  return new Date(date).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function displayDate(dateStr) {
  const d = parseDate(dateStr);
  const week = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
  return `${d.getMonth() + 1}月${d.getDate()}日 周${week}`;
}

module.exports = {
  pad,
  parseDate,
  formatDate,
  today,
  addDays,
  addMonths,
  formatMonth,
  startOfWeek,
  addHoursToDate,
  toIsoNoMs,
  displayDate
};
