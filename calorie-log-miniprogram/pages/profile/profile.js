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
    // 体重体脂/周月报告/运动统计已收入「洞察」tab，运动计划在「运动」tab，此处不再重复
    menu: [
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
  goGoal() { wx.navigateTo({ url: '/pages/goal/goal' }); },
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
