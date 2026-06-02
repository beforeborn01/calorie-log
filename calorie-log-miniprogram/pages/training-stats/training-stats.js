const authGuard = require('../../utils/authGuard');
const fmt = require('../../utils/format');
const training = require('../../services/training');

Page({
  data: { stats: null, cards: [], prs: [], loading: false },
  onLoad() { authGuard.ensureToken(); this.load(); },
  async load() {
    this.setData({ loading: true });
    try {
      const stats = await training.getTrainingStats();
      const cards = [
        { label: '总运动', value: fmt.num(stats.totalWorkouts), unit: '次' },
        { label: '总容量', value: fmt.num(stats.totalVolume), unit: 'kg' },
        { label: '当前连续', value: fmt.num(stats.currentStreak), unit: '天' },
        { label: '最长连续', value: fmt.num(stats.longestStreak), unit: '天' },
        { label: '周均', value: fmt.num(stats.weeklyAverage, 1), unit: '次' },
        { label: '今日消耗', value: fmt.num(stats.todayExerciseCalories), unit: 'kcal' }
      ];
      const prs = Object.keys(stats.personalRecords || {}).map((name) => ({ name, weight: stats.personalRecords[name].weight, date: stats.personalRecords[name].date }));
      this.setData({ stats, cards, prs });
    } catch (e) { fmt.showError(e, '加载运动统计失败'); }
    finally { this.setData({ loading: false }); }
  },
  goQuick() { wx.switchTab({ url: '/pages/training-quick/training-quick' }); },
  goPlans() { wx.redirectTo({ url: '/pages/training-plans/training-plans' }); },
  goSessions() { wx.redirectTo({ url: '/pages/training-sessions/training-sessions' }); }
});
