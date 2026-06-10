const authGuard = require('../../utils/authGuard');
const dateUtil = require('../../utils/date');
const fmt = require('../../utils/format');
const training = require('../../services/training');

const BODY_PARTS = fmt.BODY_PARTS;
const QUICK_RECORD_SOURCES = ['quick_form', 'quick_log'];

function buildSessionPayload(date, exercise, sets, repsPerSet, weight, note) {
  const occurredAt = dateUtil.toIsoNoMs(dateUtil.addHoursToDate(date, 12));
  const duration = Math.max(60, Number(sets) * 90);
  const completedSets = Array.from({ length: Number(sets) }, (_, i) => ({
    setNumber: i + 1,
    reps: Number(repsPerSet),
    weight: Number(weight || 0),
    isCompleted: true,
    completedAt: occurredAt
  }));
  return {
    name: `${exercise.name} · 速记`,
    status: 'completed',
    startTime: occurredAt,
    endTime: occurredAt,
    duration,
    source: 'quick_form',
    notes: note || undefined,
    exercises: [{ exerciseId: exercise.id, plannedSets: Number(sets), completedSets }]
  };
}

function flattenSessions(sessions) {
  return (sessions || []).filter((s) => QUICK_RECORD_SOURCES.includes(s.source)).map((s) => {
    const ex = (s.exercises || [])[0] || {};
    const sets = ex.completedSets || [];
    const first = sets[0] || {};
    return {
      sessionId: s.id,
      exerciseName: ex.exerciseName || String(s.name || '').replace(/ · 速记$/, ''),
      sets: sets.length || ex.plannedSets || 0,
      repsPerSet: first.reps || 0,
      weight: first.weight || 0,
      note: s.notes || ''
    };
  });
}

Page({
  data: {
    date: dateUtil.today(),
    bodyParts: BODY_PARTS,
    bodyPartIndex: 0,
    exercises: [],
    exerciseNames: [],
    exerciseIndex: -1,
    customExerciseName: '',
    form: { sets: 3, repsPerSet: 10, weight: '', note: '', quickText: '' },
    sessions: [],
    flatRecords: [],
    totalVolume: 0,
    loading: false,
    saving: false,
    parsing: false
  },
  onLoad() { authGuard.ensureToken(); this.reloadExercises(); this.reloadSessions(); },
  onShow() { if (authGuard.ensureToken()) this.reloadSessions(); },
  onDateChange(e) { this.setData({ date: e.detail.value }); this.reloadSessions(); },
  onBodyPartChange(e) { this.setData({ bodyPartIndex: Number(e.detail.value), exerciseIndex: -1 }); this.reloadExercises(); },
  onExerciseChange(e) { this.setData({ exerciseIndex: Number(e.detail.value) }); },
  onInput(e) { this.setData({ [`form.${e.currentTarget.dataset.field}`]: e.detail.value }); },
  onCustomInput(e) { this.setData({ customExerciseName: e.detail.value }); },
  async reloadExercises() {
    try {
      const bodyPart = BODY_PARTS[this.data.bodyPartIndex];
      const exercises = await training.listStrengthExercises({ bodyPart });
      this.setData({ exercises, exerciseNames: (exercises || []).map((x) => x.name) });
    } catch (e) { fmt.showError(e, '加载动作库失败'); }
  },
  async reloadSessions() {
    this.setData({ loading: true });
    try {
      const sessions = await training.listSessionsByDate(this.data.date);
      const flatRecords = flattenSessions(sessions);
      const totalVolume = flatRecords.reduce((s, r) => s + Number(r.weight || 0) * Number(r.sets || 0) * Number(r.repsPerSet || 0), 0);
      this.setData({ sessions, flatRecords, totalVolume: fmt.num(totalVolume) });
    } catch (e) { fmt.showError(e, '加载运动记录失败'); }
    finally { this.setData({ loading: false }); }
  },
  async ensureExercise() {
    if (this.data.exerciseIndex >= 0) return this.data.exercises[this.data.exerciseIndex];
    const name = String(this.data.customExerciseName || '').trim();
    if (!name) throw new Error('请选择动作，或填写自定义动作');
    const ex = await training.createCustomStrengthExercise({ name, bodyPart: BODY_PARTS[this.data.bodyPartIndex] });
    await this.reloadExercises();
    return ex;
  },
  async onSubmit() {
    const f = this.data.form;
    if (!Number(f.sets) || !Number(f.repsPerSet)) return fmt.toast('请填写组数和次数');
    this.setData({ saving: true });
    try {
      const ex = await this.ensureExercise();
      await training.createSession(buildSessionPayload(this.data.date, ex, f.sets, f.repsPerSet, f.weight, f.note));
      fmt.toast('已记录', 'success');
      this.setData({ form: { ...this.data.form, sets: 3, repsPerSet: 10, weight: '', note: '' }, customExerciseName: '', exerciseIndex: -1 });
      this.reloadSessions();
    } catch (e) { fmt.showError(e, '保存失败'); }
    finally { this.setData({ saving: false }); }
  },
  async onQuickText() {
    const text = String(this.data.form.quickText || '').trim();
    if (!text) return fmt.toast('请输入文字速记');
    this.setData({ parsing: true });
    try {
      await training.quickLog(text, dateUtil.toIsoNoMs(dateUtil.addHoursToDate(this.data.date, 12)));
      fmt.toast('已解析并记录', 'success');
      this.setData({ 'form.quickText': '' });
      this.reloadSessions();
    } catch (e) { fmt.showError(e, '解析失败'); }
    finally { this.setData({ parsing: false }); }
  },
  onDelete(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({ title: '删除这条运动记录？', confirmColor: '#B0413E', success: async (res) => {
      if (!res.confirm) return;
      try { await training.deleteSession(id); fmt.toast('已删除', 'success'); this.reloadSessions(); }
      catch (err) { fmt.showError(err, '删除失败'); }
    }});
  },
  goPlans() { wx.navigateTo({ url: '/pages/training-plans/training-plans' }); },
  goStats() { wx.navigateTo({ url: '/pages/training-stats/training-stats' }); },
  goSessions() { wx.navigateTo({ url: '/pages/training-sessions/training-sessions' }); }
});
