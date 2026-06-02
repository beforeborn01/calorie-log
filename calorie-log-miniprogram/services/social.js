const api = require('../utils/request');

module.exports = {
  searchUser(phone) {
    return api.get('/social/users/search', { phone });
  },
  sendFriendRequest(toUserId, message) {
    return api.post('/social/friends/request', { toUserId, message });
  },
  listFriendRequests(direction = 'incoming') {
    return api.get('/social/friends/requests', { direction });
  },
  handleFriendRequest(id, action) {
    return api.put(`/social/friends/request/${id}`, { action });
  },
  listFriends() {
    return api.get('/social/friends');
  },
  deleteFriend(friendId) {
    return api.del(`/social/friends/${friendId}`);
  },
  setFriendRemark(friendId, remark) {
    return api.put(`/social/friends/${friendId}/remark`, { remark });
  },
  getExperience() {
    return api.get('/social/experience');
  },
  getExpLogs(limit = 30) {
    return api.get('/social/experience/logs', { limit });
  },
  getRanking(type = 'exp', period = 'all') {
    return api.get('/social/ranking', { type, period });
  },
  createInviteLink() {
    return api.get('/social/invite-link');
  },
  previewInvite(token) {
    return api.get('/social/invite/preview', { token });
  },
  acceptInvite(token) {
    return api.post('/social/invite/accept', { token });
  }
};
