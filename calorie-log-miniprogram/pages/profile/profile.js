const authGuard = require('../../utils/authGuard');
const auth = require('../../services/auth');
const social = require('../../services/social');
const storage = require('../../utils/storage');
const fmt = require('../../utils/format');

Page({
  data: {
    profile: null,
    displayAvatar: '',
    experience: null,
    menu: [
      { title: '健身目标', desc: '目标热量与餐次分配', url: '/pages/goal/goal' },
      { title: '体重体脂', desc: '记录身体趋势', url: '/pages/body/body' },
      { title: '周月报告', desc: '阶段回顾', url: '/pages/reports/reports' },
      { title: '运动计划', desc: '训练计划与进行中训练', url: '/pages/training-plans/training-plans' },
      { title: '运动统计', desc: 'PR 与连续训练', url: '/pages/training-stats/training-stats' },
      { title: '好友', desc: '好友管理', url: '/pages/social-friends/social-friends' },
      { title: '排行榜', desc: '经验 / 评分 / 连续记录排行', url: '/pages/social-ranking/social-ranking' },
      { title: '设置', desc: '提醒与账号', url: '/pages/settings/settings' }
    ]
  },
  onLoad() { authGuard.ensureToken(); },
  onShow() { if (authGuard.ensureToken()) this.load(); },
  async load() {
    try {
      const [profile, experience] = await Promise.all([auth.getProfile(), social.getExperience().catch(() => null)]);
      this.setData({ profile, displayAvatar: fmt.assetUrl(profile && profile.avatarUrl), experience });
    } catch (e) { fmt.showError(e, '加载个人信息失败'); }
  },
  goEdit() { wx.navigateTo({ url: '/pages/profile-setup/profile-setup?edit=1' }); },
  goPage(e) { wx.navigateTo({ url: e.currentTarget.dataset.url }); },
  onLogout() {
    wx.showModal({ title: '退出登录？', success: async (res) => {
      if (!res.confirm) return;
      await auth.logout();
      storage.clearAll();
      wx.reLaunch({ url: '/pages/login/login?from=logout' });
    }});
  }
});
