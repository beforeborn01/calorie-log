// 小程序运行配置。原生版只通过 wx.request 访问后端，不再使用 web-view。
const BASE_URL = 'https://bcappandgame.com';

module.exports = {
  baseUrl: BASE_URL,
  apiBaseUrl: `${BASE_URL}/api/v1`,
  timezone: 'Asia/Shanghai',
  features: {
    aiRecognize: false,
    aiCooking: false,
    aiFavorites: false
  }
};
