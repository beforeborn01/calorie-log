const authGuard = require('../../utils/authGuard');
const dateUtil = require('../../utils/date');
const fmt = require('../../utils/format');
const recordApi = require('../../services/record');

function view(daily) {
  return { daily, meals: fmt.normalizeMeals(daily) };
}

Page({
  data: {
    date: dateUtil.today(),
    displayDate: dateUtil.displayDate(dateUtil.today()),
    loading: false,
    daily: null,
    meals: fmt.normalizeMeals(null),
    summary: []
  },
  onLoad() { authGuard.ensureToken(); },
  onShow() { if (authGuard.ensureToken()) this.load(); },
  async load() {
    this.setData({ loading: true, displayDate: dateUtil.displayDate(this.data.date) });
    try {
      const daily = await recordApi.getDailyRecords(this.data.date);
      const summary = [
        { label: '热量', value: fmt.num(daily.totalCalories), unit: 'kcal' },
        { label: '蛋白', value: fmt.num(daily.totalProtein, 1), unit: 'g' },
        { label: '碳水', value: fmt.num(daily.totalCarb, 1), unit: 'g' },
        { label: '脂肪', value: fmt.num(daily.totalFat, 1), unit: 'g' }
      ];
      this.setData({ ...view(daily), summary });
    } catch (e) { fmt.showError(e, '加载历史失败'); }
    finally { this.setData({ loading: false }); }
  },
  onPrevDay() { this.setData({ date: dateUtil.addDays(this.data.date, -1) }); this.load(); },
  onNextDay() { this.setData({ date: dateUtil.addDays(this.data.date, 1) }); this.load(); },
  onDateChange(e) { this.setData({ date: e.detail.value }); this.load(); },
  onAddFood(e) { wx.navigateTo({ url: `/pages/add-food/add-food?date=${this.data.date}&mealType=${e.currentTarget.dataset.meal || 1}` }); },
  onEdit(e) {
    const mealIndex = Number(e.currentTarget.dataset.mealIndex);
    const recordIndex = Number(e.currentTarget.dataset.recordIndex);
    wx.setStorageSync('clog_edit_record', this.data.meals[mealIndex].list[recordIndex]);
    wx.navigateTo({ url: '/pages/record-edit/record-edit' });
  },
  onDelete(e) {
    const mealIndex = Number(e.currentTarget.dataset.mealIndex);
    const recordIndex = Number(e.currentTarget.dataset.recordIndex);
    const r = this.data.meals[mealIndex].list[recordIndex];
    wx.showModal({ title: '删除记录？', content: r.foodName, confirmColor: '#B0413E', success: async (res) => {
      if (!res.confirm) return;
      try { await recordApi.deleteRecord(r.id); fmt.toast('已删除', 'success'); this.load(); }
      catch (err) { fmt.showError(err, '删除失败'); }
    }});
  }
});
