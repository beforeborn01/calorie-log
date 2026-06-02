const api = require('../utils/request');

module.exports = {
  searchFood(keyword, page = 1, size = 20) {
    return api.get('/foods/search', { keyword, page, size });
  },
  getFood(id) {
    return api.get(`/foods/${id}`);
  },
  createCustomFood(body) {
    return api.post('/foods/custom', body);
  }
};
