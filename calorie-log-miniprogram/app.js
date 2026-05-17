// 全局应用入口。我们走 web-view 套壳，这里几乎没逻辑。
// 唯一职责：把 web 的 baseURL 写在 globalData，pages/index 读出来注入 web-view。
App({
  onLaunch() {
    // 真实环境域名以 globalData.baseUrl 为准；要切换 prod/dev 时在此处改
    // ！必须是 https 且已在小程序后台配 "业务域名" 白名单
  },
  globalData: {
    // 改成你自己的域名后再上线发布
    baseUrl: 'https://REPLACE_WITH_YOUR_DOMAIN'
  }
});
