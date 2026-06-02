const TOKEN_KEY = 'clog_access_token';
const REFRESH_KEY = 'clog_refresh_token';
const PROFILE_KEY = 'clog_profile';
const NEED_BIND_PHONE_KEY = 'clog_need_bind_phone';
// 旧 web-view 壳曾用过的 key，保留兼容读取/清理。
const LEGACY_TOKEN_KEY = 'clog_token';
const LEGACY_REFRESH_KEY = 'clog_refresh';

function get(key, fallback = null) {
  try {
    const v = wx.getStorageSync(key);
    return v === undefined || v === '' ? fallback : v;
  } catch (e) {
    return fallback;
  }
}

function set(key, value) {
  try {
    wx.setStorageSync(key, value);
  } catch (e) {
    // storage 写入失败时不打断主流程
    console.warn('[storage] set failed', key, e);
  }
}

function remove(key) {
  try {
    wx.removeStorageSync(key);
  } catch (e) {}
}

function getToken() {
  return get(TOKEN_KEY) || get(LEGACY_TOKEN_KEY);
}

function getRefreshToken() {
  return get(REFRESH_KEY) || get(LEGACY_REFRESH_KEY);
}

function setTokens(accessToken, refreshToken) {
  if (accessToken) set(TOKEN_KEY, accessToken);
  if (refreshToken) set(REFRESH_KEY, refreshToken);
  // 同步旧 key，便于从旧壳升级过来的用户无感过渡；后续版本可删除。
  if (accessToken) set(LEGACY_TOKEN_KEY, accessToken);
  if (refreshToken) set(LEGACY_REFRESH_KEY, refreshToken);
}

function clearTokens() {
  remove(TOKEN_KEY);
  remove(REFRESH_KEY);
  remove(LEGACY_TOKEN_KEY);
  remove(LEGACY_REFRESH_KEY);
  remove(NEED_BIND_PHONE_KEY);
}

function setProfile(profile) {
  set(PROFILE_KEY, profile || null);
}

function getProfile() {
  return get(PROFILE_KEY, null);
}

function clearAll() {
  clearTokens();
  remove(PROFILE_KEY);
}

module.exports = {
  get,
  set,
  remove,
  getToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  setProfile,
  getProfile,
  clearAll,
  NEED_BIND_PHONE_KEY
};
