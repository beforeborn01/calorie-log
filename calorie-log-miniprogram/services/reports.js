const api = require('../utils/request');

module.exports = {
  getWeekly(startDate) {
    return api.get('/statistics/weekly', { startDate });
  },
  getMonthly(yearMonth) {
    return api.get('/statistics/monthly', { yearMonth });
  }
};
