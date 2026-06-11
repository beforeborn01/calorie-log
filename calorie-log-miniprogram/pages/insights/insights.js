const authGuard = require('../../utils/authGuard');

Page({
  onLoad() { authGuard.ensureToken(); },
  onShow() { authGuard.ensureToken(); },
  goPage(e) {
    const url = e.currentTarget.dataset.url;
    if (url) wx.navigateTo({ url });
  },
  goTrainingTab(e) {
    const tab = e.currentTarget.dataset.trainingTab || 'quick';
    wx.setStorageSync('trainingActiveTab', tab);
    wx.switchTab({ url: '/pages/training-quick/training-quick' });
  }
});
