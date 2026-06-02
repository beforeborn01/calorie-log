const api = require('../utils/request');
const storage = require('../utils/storage');
const env = require('../config/env');

function wxLogin() {
  return new Promise((resolve, reject) => {
    wx.login({
      success(res) {
        if (res && res.code) resolve(res.code);
        else reject(new Error('微信登录失败，请重试'));
      },
      fail() {
        reject(new Error('无法连接微信，请检查网络'));
      }
    });
  });
}

async function loginByMiniProgramCode(code) {
  const data = await api.post('/auth/wechat/miniprogram', { code }, { auth: false });
  if (data && data.token) {
    storage.setTokens(data.token.accessToken, data.token.refreshToken);
    if (data.needBindPhone) storage.set(storage.NEED_BIND_PHONE_KEY, '1');
    return data;
  }
  throw new Error('登录响应异常');
}

async function miniLogin() {
  const code = await wxLogin();
  return loginByMiniProgramCode(code);
}

async function getProfile() {
  const profile = await api.get('/users/profile');
  storage.setProfile(profile);
  const app = getApp({ allowDefault: true });
  if (app && app.globalData) app.globalData.profile = profile;
  return profile;
}

async function updateProfile(data) {
  const profile = await api.put('/users/profile', data);
  storage.setProfile(profile);
  const app = getApp({ allowDefault: true });
  if (app && app.globalData) app.globalData.profile = profile;
  return profile;
}

function uploadAvatar(filePath) {
  const token = storage.getToken();
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${env.apiBaseUrl}/users/avatar`,
      filePath,
      name: 'file',
      header: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'X-Timezone': env.timezone
      },
      success(res) {
        let body;
        try {
          body = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
        } catch (e) {
          reject(new Error('头像上传响应异常'));
          return;
        }
        if (res.statusCode >= 200 && res.statusCode < 300 && body && body.code === 200) {
          storage.setProfile(body.data);
          const app = getApp({ allowDefault: true });
          if (app && app.globalData) app.globalData.profile = body.data;
          resolve(body.data);
        } else {
          reject(new Error((body && body.message) || '头像上传失败'));
        }
      },
      fail() {
        reject(new Error('头像上传失败，请检查网络'));
      }
    });
  });
}

async function logout() {
  try {
    await api.post('/auth/logout', {});
  } catch (e) {}
  storage.clearAll();
}

module.exports = {
  wxLogin,
  miniLogin,
  loginByMiniProgramCode,
  getProfile,
  updateProfile,
  uploadAvatar,
  logout,
  sendCode: (identifier, scene) => api.post('/auth/send-code', { identifier, scene }, { auth: false }),
  passwordLogin: (body) => api.post('/auth/login', body, { auth: false }),
  register: (body) => api.post('/auth/register', body, { auth: false }),
  resetPassword: (identifier, verifyCode, newPassword) => api.post('/auth/reset-password', { identifier, verifyCode, newPassword }, { auth: false }),
  bindCurrentPhone: (phone, verifyCode) => api.post('/auth/wechat/bind-current', { phone, verifyCode })
};
