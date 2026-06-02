const api = require('../utils/request');

module.exports = {
  getDailyStatistics(date) {
    return api.get('/statistics/daily', { date });
  },
  getDietScore(date) {
    return api.get('/statistics/score', { date });
  },
  getDietSuggestions(date) {
    return api.get('/statistics/suggestions', { date });
  }
};
