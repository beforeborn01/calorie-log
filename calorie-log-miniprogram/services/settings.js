const api = require('../utils/request');

module.exports = {
  getNotificationSetting() {
    return api.get('/settings/notifications');
  },
  saveNotificationSetting(data) {
    return api.put('/settings/notifications', data);
  },
  changePassword(oldPassword, newPassword) {
    return api.put('/users/password', { oldPassword, newPassword });
  }
};
