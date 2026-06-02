const MEAL_LABELS = { 1: '早餐', 2: '午餐', 3: '晚餐', 4: '加餐' };
const BODY_PARTS = ['腿部', '胸部', '背部', '手臂', '肩部', '核心'];
const ACTIVITY_LABELS = ['久坐', '轻度活动', '中度活动', '高强度活动'];
const env = require('../config/env');

function num(v, digits = 0, fallback = '-') {
  if (v === null || v === undefined || v === '' || Number.isNaN(Number(v))) return fallback;
  return Number(v).toFixed(digits);
}

function pct(v, digits = 0) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return 0;
  return Math.max(0, Math.min(100, Number(v))).toFixed(digits);
}

function ratioPct(part, total) {
  if (!total || Number(total) <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((Number(part || 0) / Number(total)) * 100)));
}

function mealLabel(type) {
  return MEAL_LABELS[Number(type)] || '未知';
}

function normalizeMeals(daily) {
  const d = daily || {};
  return [
    { type: 1, label: '早餐', list: d.breakfast || [] },
    { type: 2, label: '午餐', list: d.lunch || [] },
    { type: 3, label: '晚餐', list: d.dinner || [] },
    { type: 4, label: '加餐', list: d.snacks || [] }
  ];
}

function toast(title, icon = 'none') {
  wx.showToast({ title: String(title || ''), icon });
}

function showError(err, fallback = '操作失败') {
  const msg = err && err.message ? err.message : fallback;
  toast(msg, 'none');
}

function shortTime(value) {
  if (!value) return '';
  const s = String(value);
  const hit = s.match(/T(\d{2}:\d{2})/);
  return hit ? hit[1] : s.slice(11, 16);
}

function assetUrl(url) {
  if (!url) return '';
  const s = String(url);
  if (/^(https?:)?\/\//.test(s) || s.startsWith('wxfile://') || s.startsWith('http://tmp/') || s.startsWith('data:')) return s;
  if (s.startsWith('/')) return `${env.baseUrl}${s}`;
  return s;
}

function sessionStatusLabel(status) {
  const map = {
    planned: '计划中',
    in_progress: '进行中',
    active: '进行中',
    paused: '暂停',
    completed: '已完成',
    abandoned: '已放弃',
    aborted: '已放弃'
  };
  return map[status] || status || '-';
}

module.exports = {
  MEAL_LABELS,
  BODY_PARTS,
  ACTIVITY_LABELS,
  num,
  pct,
  ratioPct,
  mealLabel,
  normalizeMeals,
  toast,
  showError,
  assetUrl,
  shortTime,
  sessionStatusLabel
};
