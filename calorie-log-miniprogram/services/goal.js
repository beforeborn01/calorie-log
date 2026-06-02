const api = require('../utils/request');

module.exports = {
  getCurrentGoal() {
    return api.get('/goals/current');
  },
  setGoal(body) {
    return api.post('/goals', body);
  },
  saveTrainingSchedule(body) {
    return api.post('/goals/training-schedule', body);
  },
  getTrainingSchedule(month) {
    return api.get('/goals/training-schedule', month ? { month } : undefined);
  },
  getMealDistribution(date) {
    return api.get('/goals/meal-distribution', date ? { date } : undefined);
  }
};
