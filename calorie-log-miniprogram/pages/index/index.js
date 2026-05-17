// 单页全屏 web-view —— 把 React web 套进来。
// 真实页面、登录态都在 web 里完成；小程序壳只负责审核合规 + 充当容器。
//
// 进来时通常带 query：?token=xxx&refresh=xxx&needBindPhone=1[&path=/somepath]
// 这些参数会原样拼到 web-view URL；web 端 main.tsx 启动时会读 token/refresh 注入 localStorage，
// 然后用 history.replaceState 清掉 URL，避免泄漏。

const app = getApp();

Page({
  data: {
    src: ''
  },

  onLoad(options) {
    const base = (app.globalData && app.globalData.baseUrl) || '';
    const opts = options || {};

    // 路径：默认 / ，可由 ?path= 覆盖（用于深链接）
    const path = opts.path ? decodeURIComponent(opts.path) : '/';

    // 把所有 query 透传给 web，但要排除 path 自身
    const passthrough = Object.keys(opts)
      .filter((k) => k !== 'path' && opts[k] !== undefined && opts[k] !== '')
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(opts[k])}`);

    // _ts 让冷启动绕开 web-view 内部缓存
    passthrough.push(`_ts=${Date.now()}`);

    const sep = path.indexOf('?') >= 0 ? '&' : '?';
    const src = `${base}${path}${sep}${passthrough.join('&')}`;
    this.setData({ src });
  },

  // wxml: bindmessage —— web 端 wx.miniProgram.postMessage 的消息累积送达点
  // （仅在用户后退/分享/页面销毁时派发，所以做的是聚合而非实时）
  onMessage(e) {
    const list = (e && e.detail && e.detail.data) || [];
    for (const msg of list) {
      if (msg && msg.type === 'logout') {
        // web 端登出时通知壳清空 storage
        wx.removeStorageSync('clog_token');
        wx.removeStorageSync('clog_refresh');
        wx.reLaunch({ url: '/pages/login/login' });
        return;
      }
    }
    if (list.length) {
      console.log('[web-view] message from web:', list);
    }
  },

  // wxml: bindload —— web-view 内 url 加载完成
  onWebviewLoad(e) {
    console.log('[web-view] loaded', e && e.detail);
  },

  // wxml: binderror —— web-view 加载失败
  onError(e) {
    console.error('[web-view] error', e && e.detail);
    wx.showToast({ title: '加载失败，请检查网络', icon: 'none' });
  }
});
