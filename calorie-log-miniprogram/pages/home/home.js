const authGuard = require('../../utils/authGuard');
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
      { label: '基础代谢', value: fmt.num(daily && daily.tdee), unit: 'kcal' },
      { label: '运动消耗', value: fmt.num(daily && daily.exerciseCalories), unit: 'kcal' },
      { label: '当前缺口', value: fmt.num(daily && daily.netDeficit), unit: 'kcal' }
    ],
    meals: fmt.normalizeMeals(daily).map((m) => ({
      ...m,
      kcal: fmt.num(m.list.reduce((sum, r) => sum + Number(r.calories || 0), 0))
    }))
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
    expPct: 0
  },

  onLoad() {
    authGuard.ensureToken();
  },

  onShow() {
    if (!authGuard.ensureToken()) return;
    this.checkProfile();
    this.loadAll();
  },

  async checkProfile() {
    try {
      const p = await authApi.getProfile();
      if (p && !p.profileComplete) wx.navigateTo({ url: '/pages/profile-setup/profile-setup' });
    } catch (e) {}
  },

  async loadAll() {
    // 首页只关注今天，每次进入都锁定为当天（避免跨天后日期滞留）
    const date = dateUtil.today();
    this.setData({ loading: true, date, displayDate: dateUtil.displayDate(date) });
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

  onShowNetHelp() {
    wx.showModal({
      title: '热量收支',
      content: '基础代谢：按你的基础代谢和日常活动水平估算，不包含你记录的运动。\n' +
        '运动消耗：你记录的运动额外燃烧的热量。\n' +
        '当前缺口 = 基础代谢 + 运动消耗 − 饮食摄入。\n正数表示消耗大于摄入；负数表示摄入超过消耗。',
      showCancel: false,
      confirmText: '知道了'
    });
  },

  onAddFood(e) {
    const mealType = Number(e.currentTarget.dataset.meal || 1);
    wx.navigateTo({ url: `/pages/add-food/add-food?date=${this.data.date}&mealType=${mealType}` });
  },

  // 悬浮快捷录入：按当前时段智能选默认餐次，避免写死早餐导致误录入
  onQuickAdd() {
    const h = new Date().getHours();
    let mealType = 4; // 加餐
    if (h < 10) mealType = 1;        // 早餐
    else if (h < 14) mealType = 2;   // 午餐
    else if (h < 16) mealType = 4;   // 下午加餐
    else if (h < 21) mealType = 3;   // 晚餐
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
