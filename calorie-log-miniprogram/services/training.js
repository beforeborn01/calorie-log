const api = require('../utils/request');

module.exports = {
  // 老 Strength 动作库：运动速记仍复用它。
  listStrengthExercises(params) {
    return api.get('/strength/exercises', params);
  },
  createCustomStrengthExercise(data) {
    return api.post('/strength/exercises/custom', data);
  },

  // 新 Training 动作库 / 计划 / 会话。
  listExercises(all = false) {
    return api.get('/training/exercises', { all });
  },
  searchExercises(params = {}) {
    return api.get('/training/exercises/search', params);
  },
  getExercise(id) {
    return api.get(`/training/exercises/${id}`);
  },
  createCustomTrainingExercise(data) {
    return api.post('/training/exercises', data);
  },
  listPlans() {
    return api.get('/training/plans');
  },
  getPlan(id) {
    return api.get(`/training/plans/${id}`);
  },
  createPlan(data) {
    return api.post('/training/plans', data);
  },
  updatePlan(id, data) {
    return api.put(`/training/plans/${id}`, data);
  },
  deletePlan(id) {
    return api.del(`/training/plans/${id}`);
  },
  listSessions(page = 1, size = 20) {
    return api.get('/training/sessions', { page, size });
  },
  listSessionsByDate(date) {
    return api.get('/training/sessions', { date });
  },
  getSession(id) {
    return api.get(`/training/sessions/${id}`);
  },
  getActiveSession() {
    return api.get('/training/sessions/active');
  },
  createSession(data) {
    return api.post('/training/sessions', data);
  },
  updateSession(id, data) {
    return api.put(`/training/sessions/${id}`, data);
  },
  finishSession(id, data) {
    return api.post(`/training/sessions/${id}/finish`, data || {});
  },
  abortSession(id) {
    return api.post(`/training/sessions/${id}/abort`, {});
  },
  deleteSession(id) {
    return api.del(`/training/sessions/${id}`);
  },
  getTrainingStats() {
    return api.get('/training/stats');
  },
  quickLog(text, now) {
    return api.post('/training/sessions/quick-log', { text, now });
  }
};
