const env = require('./config/env');
const storage = require('./utils/storage');

App({
  onLaunch() {
    this.globalData.baseUrl = env.baseUrl;
    this.globalData.apiBaseUrl = env.apiBaseUrl;
  },
  globalData: {
    baseUrl: env.baseUrl,
    apiBaseUrl: env.apiBaseUrl,
    features: env.features,
    refreshHome: false,
    profile: storage.getProfile()
  }
});
