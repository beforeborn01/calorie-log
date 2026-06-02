const env = require('../config/env');
const storage = require('./storage');

let refreshing = null;
let relaunching = false;

function loginExpired() {
  storage.clearTokens();
  if (relaunching) return;
  relaunching = true;
  wx.showToast({ title: '登录已过期，请重新登录', icon: 'none' });
  setTimeout(() => {
    wx.reLaunch({ url: '/pages/login/login?from=expired' });
    relaunching = false;
  }, 500);
}

function wxRequest(opts) {
  return new Promise((resolve, reject) => {
    wx.request({
      ...opts,
      success: resolve,
      fail: reject
    });
  });
}

function isAuthCode(code) {
  return code === 40100 || code === 40101 || code === 40102 || code === 40103;
}

function normalizeUrl(url) {
  if (/^https?:\/\//.test(url)) return url;
  if (url.startsWith('/api/v1/')) return `${env.baseUrl}${url}`;
  if (url.startsWith('/')) return `${env.apiBaseUrl}${url}`;
  return `${env.apiBaseUrl}/${url}`;
}

function buildQuery(params) {
  if (!params) return '';
  const pairs = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`);
  return pairs.length ? `?${pairs.join('&')}` : '';
}

async function refreshToken() {
  const token = storage.getRefreshToken();
  if (!token) return null;
  if (!refreshing) {
    refreshing = wxRequest({
      url: `${env.apiBaseUrl}/auth/refresh`,
      method: 'POST',
      data: { refreshToken: token },
      header: {
        'content-type': 'application/json',
        'X-Timezone': env.timezone
      }
    })
      .then((res) => {
        const body = res.data || {};
        if (res.statusCode === 200 && body.code === 200 && body.data && body.data.accessToken) {
          storage.setTokens(body.data.accessToken, body.data.refreshToken);
          return body.data.accessToken;
        }
        return null;
      })
      .catch(() => null)
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

async function request(options = {}) {
  const {
    url,
    method = 'GET',
    data,
    params,
    auth = true,
    retried = false,
    showLoading = false,
    loadingText = '加载中'
  } = options;
  if (!url) throw new Error('request url is required');

  let fullUrl = normalizeUrl(url);
  if (method.toUpperCase() === 'GET') fullUrl += buildQuery(params || data);

  const headers = {
    'content-type': 'application/json',
    'X-Timezone': env.timezone,
    ...(options.header || {})
  };
  const token = storage.getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  if (showLoading) wx.showLoading({ title: loadingText, mask: true });
  try {
    const res = await wxRequest({
      url: fullUrl,
      method,
      data: method.toUpperCase() === 'GET' ? undefined : data,
      header: headers,
      timeout: options.timeout || 15000
    });
    const body = res.data;
    const businessCode = body && typeof body.code === 'number' ? body.code : null;
    const authFailed = res.statusCode === 401 || isAuthCode(businessCode);
    if (authFailed && auth && !retried && !fullUrl.includes('/auth/refresh')) {
      const newToken = await refreshToken();
      if (newToken) {
        return request({ ...options, retried: true, showLoading: false });
      }
      loginExpired();
      throw new Error('登录已过期');
    }
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw new Error((body && body.message) || `网络错误 ${res.statusCode}`);
    }
    if (businessCode !== null) {
      if (businessCode !== 200) throw new Error(body.message || '请求失败');
      return body.data;
    }
    return body;
  } catch (err) {
    if (err && err.errMsg && err.errMsg.includes('timeout')) throw new Error('请求超时，请稍后重试');
    if (err && err.message) throw err;
    throw new Error('网络异常，请稍后重试');
  } finally {
    if (showLoading) wx.hideLoading();
  }
}

module.exports = {
  request,
  get: (url, data, opts) => request({ ...(opts || {}), url, method: 'GET', data }),
  post: (url, data, opts) => request({ ...(opts || {}), url, method: 'POST', data }),
  put: (url, data, opts) => request({ ...(opts || {}), url, method: 'PUT', data }),
  del: (url, data, opts) => request({ ...(opts || {}), url, method: 'DELETE', data })
};
