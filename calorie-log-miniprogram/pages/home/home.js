const authGuard = require('../../utils/authGuard');
const storage = require('../../utils/storage');
const dateUtil = require('../../utils/date');
const fmt = require('../../utils/format');
const recordApi = require('../../services/record');
const socialApi = require('../../services/social');
const authApi = require('../../services/auth');

function buildView(daily) {
  const target = Number(daily && daily.targetCalories ? daily.targetCalories : 0);
  const total = Number(daily && daily.totalCalories ? daily.totalCalories : 0);
  const caloriesPct = fmt.ratioPct(total, target);
  return {
    daily,
    caloriesPct,
    caloriesText: daily ? `${fmt.num(total)}/${fmt.num(target)}` : '-',
    macroStats: [
      { label: '蛋白质', value: fmt.num(daily && daily.totalProtein, 1), unit: 'g' },
      { label: '碳水', value: fmt.num(daily && daily.totalCarb, 1), unit: 'g' },
      { label: '脂肪', value: fmt.num(daily && daily.totalFat, 1), unit: 'g' }
    ],
    netStats: [
      { label: 'TDEE', value: fmt.num(daily && daily.tdee), unit: 'kcal' },
      { label: '运动消耗', value: fmt.num(daily && daily.exerciseCalories), unit: 'kcal' },
      { label: '净赤字', value: fmt.num(daily && daily.netDeficit), unit: 'kcal' }
    ],
    meals: fmt.normalizeMeals(daily)
  };
}

Page({
  data: {
    date: dateUtil.today(),
    displayDate: dateUtil.displayDate(dateUtil.today()),
    loading: false,
    daily: null,
    meals: fmt.normalizeMeals(null),
    macroStats: [],
    netStats: [],
    caloriesPct: 0,
    caloriesText: '-',
    experience: null,
    expPct: 0,
    showBindPhoneTip: false
  },

  onLoad() {
    authGuard.ensureToken();
  },

  onShow() {
    if (!authGuard.ensureToken()) return;
    this.checkProfile();
    this.loadAll();
    this.setData({ showBindPhoneTip: storage.get(storage.NEED_BIND_PHONE_KEY) === '1' });
  },

  async checkProfile() {
    try {
      const p = await authApi.getProfile();
      if (p && !p.profileComplete) wx.navigateTo({ url: '/pages/profile-setup/profile-setup' });
    } catch (e) {}
  },

  async loadAll() {
    const date = this.data.date;
    this.setData({ loading: true, displayDate: dateUtil.displayDate(date) });
    try {
      const [daily, experience] = await Promise.all([
        recordApi.getDailyRecords(date),
        socialApi.getExperience().catch(() => null)
      ]);
      const view = buildView(daily);
      const expPct = experience ? Math.round(Number(experience.levelProgress || 0) * 100) : 0;
      this.setData({ ...view, experience, expPct });
    } catch (e) {
      fmt.showError(e, '加载今日记录失败');
    } finally {
      this.setData({ loading: false });
    }
  },

  onPrevDay() {
    this.setDate(dateUtil.addDays(this.data.date, -1));
  },

  onNextDay() {
    this.setDate(dateUtil.addDays(this.data.date, 1));
  },

  onDateChange(e) {
    this.setDate(e.detail.value);
  },

  setDate(date) {
    this.setData({ date, displayDate: dateUtil.displayDate(date) });
    this.loadAll();
  },

  onCloseBindTip() {
    storage.remove(storage.NEED_BIND_PHONE_KEY);
    this.setData({ showBindPhoneTip: false });
  },

  onAddFood(e) {
    const mealType = Number(e.currentTarget.dataset.meal || 1);
    wx.navigateTo({ url: `/pages/add-food/add-food?date=${this.data.date}&mealType=${mealType}` });
  },

  onEditRecord(e) {
    const mealIndex = Number(e.currentTarget.dataset.mealIndex);
    const recordIndex = Number(e.currentTarget.dataset.recordIndex);
    const r = this.data.meals[mealIndex].list[recordIndex];
    wx.setStorageSync('clog_edit_record', r);
    wx.navigateTo({ url: '/pages/record-edit/record-edit' });
  },

  onDeleteRecord(e) {
    const mealIndex = Number(e.currentTarget.dataset.mealIndex);
    const recordIndex = Number(e.currentTarget.dataset.recordIndex);
    const r = this.data.meals[mealIndex].list[recordIndex];
    wx.showModal({
      title: '删除记录？',
      content: `${fmt.mealLabel(r.mealType)} · ${r.foodName}`,
      confirmText: '删除',
      confirmColor: '#B0413E',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await recordApi.deleteRecord(r.id);
          fmt.toast('已删除', 'success');
          this.loadAll();
        } catch (err) {
          fmt.showError(err, '删除失败');
        }
      }
    });
  },

  goGoal() { wx.navigateTo({ url: '/pages/goal/goal' }); },
  goStats() { wx.navigateTo({ url: `/pages/statistics/statistics?date=${this.data.date}` }); },
  goBody() { wx.navigateTo({ url: '/pages/body/body' }); }
});
