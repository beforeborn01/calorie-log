const api = require('../utils/request');

module.exports = {
  getDailyRecords(date) {
    return api.get('/records/daily', { date, _t: Date.now() });
  },
  createRecord(body) {
    return api.post('/records', body);
  },
  updateRecord(id, body) {
    return api.put(`/records/${id}`, body);
  },
  deleteRecord(id) {
    return api.del(`/records/${id}`);
  }
};
