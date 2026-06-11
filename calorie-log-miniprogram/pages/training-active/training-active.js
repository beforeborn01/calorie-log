const training = require('../../services/training');
const fmt = require('../../utils/format');
const dateUtil = require('../../utils/date');

function buildStats(session) {
  let done = 0, total = 0, volume = 0;
  (session.exercises || []).forEach((ex) => {
    (ex.completedSets || []).forEach((s) => {
      total += 1;
      if (s.isCompleted) done += 1;
      if (s.isCompleted) volume += Number(s.weight || 0) * Number(s.reps || 0);
    });
  });
  return { done, total, volume: fmt.num(volume), pct: total ? Math.round(done / total * 100) : 0 };
}

Page({
  data: {
    id: null,
    session: null,
    stats: { done: 0, total: 0, volume: 0, pct: 0 },
    loading: false,
    saving: false,
    finishing: false,
    timerText: '00:00',
    startAt: 0,
    timer: null
  },
  onLoad(options) {
    if (!options || !options.id) { fmt.toast('缺少会话 ID'); wx.navigateBack(); return; }
    this.setData({ id: options.id });
    this.load();
  },
  onUnload() { if (this.data.timer) clearInterval(this.data.timer); },
  async load() {
    this.setData({ loading: true });
    try {
      const session = await training.getSession(this.data.id);
      this.setSession(session);
      this.startTimer(session.startTime);
    } catch (e) { fmt.showError(e, '加载训练失败'); }
    finally { this.setData({ loading: false }); }
  },
  setSession(session) {
    this.setData({ session, stats: buildStats(session) });
  },
  startTimer(startTime) {
    if (this.data.timer) clearInterval(this.data.timer);
    const startAt = startTime ? new Date(startTime).getTime() : Date.now();
    const tick = () => {
      const secs = Math.max(0, Math.floor((Date.now() - startAt) / 1000));
      const m = String(Math.floor(secs / 60)).padStart(2, '0');
      const s = String(secs % 60).padStart(2, '0');
      this.setData({ timerText: `${m}:${s}` });
    };
    tick();
    const timer = setInterval(tick, 1000);
    this.setData({ timer, startAt });
  },
  onSetInput(e) {
    const exIdx = Number(e.currentTarget.dataset.exidx);
    const setIdx = Number(e.currentTarget.dataset.setidx);
    const field = e.currentTarget.dataset.field;
    const key = `session.exercises[${exIdx}].completedSets[${setIdx}].${field}`;
    this.setData({ [key]: Number(e.detail.value || 0) });
  },
  onToggleSet(e) {
    const exIdx = Number(e.currentTarget.dataset.exidx);
    const setIdx = Number(e.currentTarget.dataset.setidx);
    const path = `session.exercises[${exIdx}].completedSets[${setIdx}]`;
    const set = this.data.session.exercises[exIdx].completedSets[setIdx];
    const next = !set.isCompleted;
    this.setData({ [`${path}.isCompleted`]: next, [`${path}.completedAt`]: next ? dateUtil.toIsoNoMs(new Date()) : undefined }, () => {
      this.setData({ stats: buildStats(this.data.session) });
      this.onSave(false);
    });
  },
  onNotesInput(e) { this.setData({ 'session.notes': e.detail.value }); },
  async onSave(showToast = true) {
    if (!this.data.session || this.data.saving) return;
    this.setData({ saving: true });
    try {
      const s = this.data.session;
      const saved = await training.updateSession(s.id, {
        name: s.name,
        planId: s.planId,
        status: s.status || 'in_progress',
        startTime: s.startTime,
        notes: s.notes,
        source: s.source,
        exercises: s.exercises
      });
      this.setSession(saved);
      if (showToast) fmt.toast('已保存', 'success');
    } catch (e) { if (showToast) fmt.showError(e, '保存失败'); }
    finally { this.setData({ saving: false }); }
  },
  onFinish() {
    wx.showModal({ title: '结束运动？', content: `已完成 ${this.data.stats.done}/${this.data.stats.total} 组`, success: async (res) => {
      if (!res.confirm) return;
      this.setData({ finishing: true });
      try {
        await this.onSave(false);
        const duration = Math.max(60, Math.floor((Date.now() - this.data.startAt) / 1000));
        const resp = await training.finishSession(this.data.id, { endTime: dateUtil.toIsoNoMs(new Date()), duration, notes: this.data.session.notes });
        const prCount = resp && resp.newPersonalRecords ? Object.keys(resp.newPersonalRecords).length : 0;
        fmt.toast(prCount ? `完成！新增 ${prCount} 个 PR` : '运动已完成', 'success');
        setTimeout(() => {
          wx.setStorageSync('trainingActiveTab', 'sessions');
          wx.switchTab({ url: '/pages/training-quick/training-quick' });
        }, 600);
      } catch (e) { fmt.showError(e, '结束失败'); }
      finally { this.setData({ finishing: false }); }
    }});
  },
  onAbort() {
    wx.showModal({ title: '放弃本次运动？', confirmColor: '#B0413E', success: async (res) => {
      if (!res.confirm) return;
      try { await training.abortSession(this.data.id); fmt.toast('已放弃'); wx.navigateBack(); }
      catch (e) { fmt.showError(e, '操作失败'); }
    }});
  }
});
