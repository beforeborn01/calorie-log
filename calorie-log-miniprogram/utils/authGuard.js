const storage = require('./storage');
const auth = require('../services/auth');

function ensureToken() {
  if (storage.getToken()) return true;
  wx.reLaunch({ url: '/pages/login/login' });
  return false;
}

async function ensureProfileComplete(options = {}) {
  if (!ensureToken()) return null;
  const redirect = options.redirect !== false;
  try {
    const profile = await auth.getProfile();
    if (redirect && profile && !profile.profileComplete) {
      wx.redirectTo({ url: '/pages/profile-setup/profile-setup' });
    }
    return profile;
  } catch (e) {
    return null;
  }
}

module.exports = { ensureToken, ensureProfileComplete };
