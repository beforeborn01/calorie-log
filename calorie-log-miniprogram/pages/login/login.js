const auth = require('../../services/auth');
const storage = require('../../utils/storage');
const fmt = require('../../utils/format');

Page({
  data: {
    loading: false,
    errMsg: '',
    hasToken: false
  },

  onLoad(options) {
    if (options && (options.from === 'logout' || options.from === 'expired')) {
      storage.clearAll();
    }
    const token = storage.getToken();
    this.setData({ hasToken: !!token });
    if (token) this.enterApp();
  },

  async enterApp() {
    try {
      const profile = await auth.getProfile();
      if (profile && !profile.profileComplete) {
        wx.redirectTo({ url: '/pages/profile-setup/profile-setup' });
      } else {
        wx.switchTab({ url: '/pages/home/home' });
      }
    } catch (e) {
      storage.clearAll();
      this.setData({ hasToken: false });
    }
  },

  async onTapLogin() {
    if (this.data.loading) return;
    this.setData({ loading: true, errMsg: '' });
    try {
      const resp = await auth.miniLogin();
      const token = resp.token || {};
      if (token.profileComplete === false || resp.needBindPhone) {
        // needBindPhone 不阻塞首页；profile 未完善才进入建档。
      }
      let profile = null;
      try {
        profile = await auth.getProfile();
      } catch (e) {}
      if (profile && !profile.profileComplete) {
        wx.redirectTo({ url: '/pages/profile-setup/profile-setup' });
      } else if (token.profileComplete === false) {
        wx.redirectTo({ url: '/pages/profile-setup/profile-setup' });
      } else {
        wx.switchTab({ url: '/pages/home/home' });
      }
    } catch (e) {
      this.setData({ errMsg: e.message || '登录失败，请稍后重试' });
    } finally {
      this.setData({ loading: false });
    }
  },

  onTapClear() {
    storage.clearAll();
    fmt.toast('已清除本地登录态');
    this.setData({ hasToken: false });
  }
});
