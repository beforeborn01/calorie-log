const authGuard = require('../../utils/authGuard');
const dateUtil = require('../../utils/date');
const fmt = require('../../utils/format');
const statApi = require('../../services/statistics');

function detailList(obj) {
  if (!obj) return [];
  return Object.keys(obj).map((k) => ({ key: k, value: obj[k] }));
}

Page({
  data: {
    date: dateUtil.today(),
    displayDate: dateUtil.displayDate(dateUtil.today()),
    loading: false,
    daily: null,
    score: null,
    suggestions: [],
    nutrientDetail: [],
    cards: []
  },
  onLoad(options) {
    authGuard.ensureToken();
    if (options && options.date) this.setData({ date: options.date });
    this.load();
  },
  async load() {
    const date = this.data.date;
    this.setData({ loading: true, displayDate: dateUtil.displayDate(date) });
    try {
      const [daily, score, suggestionsResp] = await Promise.all([
        statApi.getDailyStatistics(date).catch(() => null),
        statApi.getDietScore(date).catch(() => null),
        statApi.getDietSuggestions(date).catch(() => ({ suggestions: [] }))
      ]);
      const cards = daily ? [
        { label: '热量', value: fmt.num(daily.totalCalories), unit: 'kcal' },
        { label: '目标差', value: fmt.num(daily.calorieGap), unit: 'kcal' },
        { label: '食物种类', value: fmt.num(daily.foodVarietyCount), unit: '种' },
        { label: '饮食评分', value: fmt.num(daily.dietScore), unit: '分' }
      ] : [];
      this.setData({ daily, score, suggestions: suggestionsResp.suggestions || [], nutrientDetail: detailList(score && score.nutrientDetail), cards });
    } catch (e) { fmt.showError(e, '加载分析失败'); }
    finally { this.setData({ loading: false }); }
  },
  onPrevDay() { this.setData({ date: dateUtil.addDays(this.data.date, -1) }); this.load(); },
  onNextDay() { this.setData({ date: dateUtil.addDays(this.data.date, 1) }); this.load(); },
  onDateChange(e) { this.setData({ date: e.detail.value }); this.load(); }
});
