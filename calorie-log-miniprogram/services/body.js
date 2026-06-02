const api = require('../utils/request');

module.exports = {
  saveBodyRecord(data) {
    return api.post('/body/records', data);
  },
  getBodyTrend(startDate, endDate) {
    return api.get('/body/records', { startDate, endDate });
  },
  deleteBodyRecord(id) {
    return api.del(`/body/records/${id}`);
  }
};
