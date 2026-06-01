// 微信一键登录页（小程序原生）。
//
// 流程：
//   1. wx.login() 拿 jscode（5 分钟有效，一次性）
//   2. POST {baseUrl}/api/v1/auth/wechat/miniprogram { code: jscode }
//      → { token: { accessToken, refreshToken, ... }, needBindPhone }
//   3. 把 token 写到 wx.setStorageSync('clog_token', ...)（小程序壳的 storage）
//   4. wx.redirectTo 到 pages/index，URL 带 ?token=...&refresh=...&needBindPhone=...
//      web-view 加载时 main.tsx 会读 URL 参数注入 localStorage 然后清掉

const app = getApp();
const STORAGE_TOKEN = 'clog_token';
const STORAGE_REFRESH = 'clog_refresh';

Page({
  data: {
    loading: false,
    errMsg: ''
  },

  onLoad(options) {
    // 来自 web 端登出 / 401 跳转：清掉壳的 storage，避免下面"自动跳"逻辑把用户又带进失效会话
    if (options && options.from === 'logout') {
      wx.removeStorageSync(STORAGE_TOKEN);
      wx.removeStorageSync(STORAGE_REFRESH);
      return;
    }
    // 已登录则跳过登录页直接进 web
    const token = wx.getStorageSync(STORAGE_TOKEN);
    const refresh = wx.getStorageSync(STORAGE_REFRESH);
    if (token && refresh) {
      this.gotoIndex(token, refresh, false);
    }
  },

  onTapLogin() {
    if (this.data.loading) return;
    this.setData({ loading: true, errMsg: '' });

    wx.login({
      success: (res) => {
        if (!res || !res.code) {
          this.setData({ loading: false, errMsg: '微信登录失败，请重试' });
          return;
        }
        this.exchangeToken(res.code);
      },
      fail: (err) => {
        console.error('[login] wx.login fail', err);
        this.setData({ loading: false, errMsg: '无法连接微信，请检查网络' });
      }
    });
  },

  exchangeToken(jsCode) {
    const base = (app.globalData && app.globalData.baseUrl) || '';
    if (!base || base.indexOf('REPLACE_WITH') === 0) {
      this.setData({ loading: false, errMsg: '小程序未配置后端域名' });
      return;
    }
    wx.request({
      url: `${base}/api/v1/auth/wechat/miniprogram`,
      method: 'POST',
      data: { code: jsCode },
      header: { 'content-type': 'application/json' },
      success: (resp) => {
        const body = resp && resp.data;
        // 后端 ApiResult 格式 { code, message, data }
        if (!body || body.code !== 200 || !body.data || !body.data.token) {
          const msg = (body && body.message) || '登录失败';
          this.setData({ loading: false, errMsg: msg });
          return;
        }
        const { token, needBindPhone } = body.data;
        wx.setStorageSync(STORAGE_TOKEN, token.accessToken);
        wx.setStorageSync(STORAGE_REFRESH, token.refreshToken);
        this.gotoIndex(token.accessToken, token.refreshToken, needBindPhone);
      },
      fail: (err) => {
        console.error('[login] request fail', err);
        this.setData({ loading: false, errMsg: '网络异常，请稍后重试' });
      }
    });
  },

  gotoIndex(token, refresh, needBindPhone) {
    const params = [
      `token=${encodeURIComponent(token)}`,
      `refresh=${encodeURIComponent(refresh)}`,
      needBindPhone ? 'needBindPhone=1' : ''
    ].filter(Boolean).join('&');
    // redirectTo 不在路由栈里留痕，避免后退回登录页
    wx.redirectTo({
      url: `/pages/index/index?${params}`
    });
  }
});
