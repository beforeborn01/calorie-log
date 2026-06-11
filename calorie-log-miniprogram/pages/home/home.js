const authGuard = require('../../utils/authGuard');
const dateUtil = require('../../utils/date');
const fmt = require('../../utils/format');
const recordApi = require('../../services/record');
const socialApi = require('../../services/social');
const authApi = require('../../services/auth');

let loadSeq = 0;

function buildView(daily) {
  const target = Number(daily && daily.targetCalories ? daily.targetCalories : 0);
  const total = Number(daily && daily.totalCalories ? daily.totalCalories : 0);
  const tdee = Number(daily && daily.tdee ? daily.tdee : 0);
  const exerciseCalories = Number(daily && daily.exerciseCalories ? daily.exerciseCalories : 0);
  const netDeficit = daily && daily.netDeficit !== null && daily.netDeficit !== undefined
    ? Number(daily.netDeficit)
    : null;
  const remaining = target - total;
  const caloriesPct = fmt.ratioPct(total, target);
  const intakeHint = target > 0
    ? (remaining >= 0
      ? `距离今日目标还差 ${fmt.num(remaining)} kcal`
      : `已超过今日目标 ${fmt.num(Math.abs(remaining))} kcal`)
    : '设置目标后显示今日建议摄入';
  const netHeadline = netDeficit === null
    ? '完善资料后显示热量差额'
    : (netDeficit >= 0
      ? `消耗比摄入多 ${fmt.num(netDeficit)} kcal`
      : `摄入比消耗多 ${fmt.num(Math.abs(netDeficit))} kcal`);
  const netFormula = netDeficit === null
    ? '基础消耗会按身高、体重、年龄和日常活动估算'
    : `基础消耗 ${fmt.num(tdee)} + 运动 ${fmt.num(exerciseCalories)} - 已吃 ${fmt.num(total)}`;
  return {
    daily,
    caloriesPct,
    caloriesText: daily ? `${fmt.num(total)}/${fmt.num(target)}` : '-',
    intakeHint,
    netHeadline,
    netFormula,
    macroStats: [
      { label: '蛋白质', value: fmt.num(daily && daily.totalProtein, 1), unit: 'g' },
      { label: '碳水', value: fmt.num(daily && daily.totalCarb, 1), unit: 'g' },
      { label: '脂肪', value: fmt.num(daily && daily.totalFat, 1), unit: 'g' }
    ],
    netStats: [
      { label: '基础消耗', value: fmt.num(daily && daily.tdee), unit: 'kcal', hint: '日常活动估算' },
      { label: '运动消耗', value: fmt.num(daily && daily.exerciseCalories), unit: 'kcal', hint: '额外记录' },
      {
        label: '热量差额',
        value: fmt.num(daily && daily.netDeficit),
        unit: 'kcal',
        hint: netDeficit === null ? '等待计算' : (netDeficit >= 0 ? '消耗多于摄入' : '摄入多于消耗')
      }
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
    intakeHint: '',
    netHeadline: '',
    netFormula: '',
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
    const seq = ++loadSeq;
    const app = getApp();
    const forceRefresh = Boolean((app && app.globalData && app.globalData.refreshHome) || wx.getStorageSync('refreshHomeAt'));
    this.setData({ loading: true, date, displayDate: dateUtil.displayDate(date) });
    try {
      const [daily, experience] = await Promise.all([
        recordApi.getDailyRecords(date),
        socialApi.getExperience().catch(() => null)
      ]);
      if (seq !== loadSeq) return;
      const view = buildView(daily);
      const expPct = experience ? Math.round(Number(experience.levelProgress || 0) * 100) : 0;
      this.setData({ ...view, experience, expPct });
      if (forceRefresh) {
        if (app && app.globalData) app.globalData.refreshHome = false;
        wx.removeStorageSync('refreshHomeAt');
      }
    } catch (e) {
      if (seq !== loadSeq) return;
      fmt.showError(e, '加载今日记录失败');
    } finally {
      if (seq === loadSeq) this.setData({ loading: false });
    }
  },

  onShowNetHelp() {
    wx.showModal({
      title: '热量收支',
      content: '基础消耗：按你的基础代谢和日常活动水平估算，不包含你记录的运动。\n' +
        '运动消耗：你记录的运动额外燃烧的热量。\n' +
        '热量差额 = 基础消耗 + 运动消耗 − 饮食摄入。\n正数表示消耗大于摄入；负数表示摄入超过消耗。\n\n顶部圆环是饮食目标进度，不是消耗进度；运动不会自动抬高饮食目标。',
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
