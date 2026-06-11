const authGuard = require('../../utils/authGuard');
const fmt = require('../../utils/format');
const training = require('../../services/training');

function decorate(s) {
  return { ...s, statusLabel: fmt.sessionStatusLabel(s.status), exerciseCount: (s.exercises || []).length };
}

Page({
  data: { sessions: [], loading: false, page: 1 },
  onLoad() { authGuard.ensureToken(); this.load(); },
  async load() {
    this.setData({ loading: true });
    try { const sessions = await training.listSessions(1, 50); this.setData({ sessions: (sessions || []).map(decorate) }); }
    catch (e) { fmt.showError(e, '加载运动历史失败'); }
    finally { this.setData({ loading: false }); }
  },
  onOpen(e) {
    const s = this.data.sessions[Number(e.currentTarget.dataset.index)];
    if (s.status === 'in_progress' || s.status === 'active' || s.status === 'paused') wx.navigateTo({ url: `/pages/training-active/training-active?id=${s.id}` });
  },
  onDelete(e) {
    const s = this.data.sessions[Number(e.currentTarget.dataset.index)];
    wx.showModal({ title: '删除运动记录？', content: s.name, confirmColor: '#B0413E', success: async (res) => {
      if (!res.confirm) return;
      try { await training.deleteSession(s.id); fmt.toast('已删除', 'success'); this.load(); }
      catch (err) { fmt.showError(err, '删除失败'); }
    }});
  },
  goQuick() { this.openTrainingTab('quick'); },
  goPlans() { this.openTrainingTab('plans'); },
  goStats() { this.openTrainingTab('stats'); },
  openTrainingTab(tab) {
    wx.setStorageSync('trainingActiveTab', tab);
    wx.switchTab({ url: '/pages/training-quick/training-quick' });
  }
});
