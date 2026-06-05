const authGuard = require('../../utils/authGuard');

Page({
  onLoad() { authGuard.ensureToken(); },
  onShow() { authGuard.ensureToken(); },
  goPage(e) {
    const url = e.currentTarget.dataset.url;
    if (url) wx.navigateTo({ url });
  }
});
