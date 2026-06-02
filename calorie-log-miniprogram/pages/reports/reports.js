const authGuard = require('../../utils/authGuard');
const dateUtil = require('../../utils/date');
const fmt = require('../../utils/format');
const reportsApi = require('../../services/reports');

function summaryCards(r) {
  if (!r) return [];
  return [
    { label: '记录天数', value: fmt.num(r.daysWithRecords), unit: '天' },
    { label: '平均热量', value: fmt.num(r.avgCalories), unit: 'kcal' },
    { label: '平均评分', value: fmt.num(r.avgDietScore), unit: '分' },
    { label: '体重变化', value: fmt.num(r.weightChange, 1), unit: 'kg' },
    { label: '运动天数', value: fmt.num(r.strengthTrainingDays), unit: '天' },
    { label: '训练容量', value: fmt.num(r.strengthTotalVolume), unit: 'kg' }
  ];
}

Page({
  data: {
    periodOptions: ['周报', '月报'],
    periodIndex: 0,
    date: dateUtil.today(),
    yearMonth: dateUtil.formatMonth(),
    report: null,
    cards: [],
    calorieBars: [],
    loading: false
  },
  onLoad() { authGuard.ensureToken(); this.load(); },
  onPeriodChange(e) { this.setData({ periodIndex: Number(e.detail.value) }); this.load(); },
  onDateChange(e) { this.setData({ date: e.detail.value }); this.load(); },
  onMonthChange(e) { this.setData({ yearMonth: e.detail.value }); this.load(); },
  async load() {
    this.setData({ loading: true });
    try {
      const report = this.data.periodIndex === 0
        ? await reportsApi.getWeekly(dateUtil.startOfWeek(this.data.date))
        : await reportsApi.getMonthly(this.data.yearMonth);
      const points = report.dailyPoints || [];
      const values = points.map((p) => Number(p.calories)).filter((v) => !Number.isNaN(v) && v > 0);
      const max = values.length ? Math.max(...values) : 0;
      const calorieBars = points.map((p) => {
        const v = Number(p.calories || 0);
        return { date: String(p.date).slice(5), value: p.calories || '-', score: p.dietScore || '-', height: max ? Math.max(16, Math.round((v / max) * 120)) : 16 };
      });
      this.setData({ report, cards: summaryCards(report), calorieBars });
    } catch (e) { fmt.showError(e, '加载报告失败'); }
    finally { this.setData({ loading: false }); }
  }
});
