const authGuard = require('../../utils/authGuard');
const dateUtil = require('../../utils/date');
const fmt = require('../../utils/format');
const training = require('../../services/training');

const BODY_PARTS = fmt.BODY_PARTS;
const QUICK_RECORD_SOURCES = ['quick_form', 'quick_log'];
const TAB_STORAGE_KEY = 'trainingActiveTab';
const TYPE_OPTIONS = ['strength', 'cardio', 'mobility', 'mixed'];
const TYPE_LABELS = ['力量', '有氧', '柔韧', '混合'];
const TABS = [
  { key: 'quick', label: '速记', title: '运动速记' },
  { key: 'plans', label: '计划', title: '运动计划' },
  { key: 'sessions', label: '历史', title: '运动历史' },
  { key: 'stats', label: '统计', title: '运动统计' }
];

function tabTitle(key) {
  return (TABS.find((x) => x.key === key) || TABS[0]).title;
}

function defaultPlanForm() {
  return { name: '', description: '', estimatedDuration: '' };
}

function defaultExerciseForm() {
  return { sets: 3, reps: 10, weight: '', restSeconds: 90, notes: '' };
}

function totalMinutes(plan) {
  if (plan.estimatedDuration) return plan.estimatedDuration;
  let secs = 0;
  (plan.exercises || []).forEach((e) => {
    secs += Number(e.sets || 0) * 60 + Number(e.sets || 0) * Number(e.restSeconds || 60);
  });
  return Math.round(secs / 60);
}

function decoratePlan(plan) {
  return {
    ...plan,
    totalMinutes: totalMinutes(plan),
    typeLabel: TYPE_LABELS[TYPE_OPTIONS.indexOf(plan.type)] || plan.type || '力量'
  };
}

function decorateSession(s) {
  return {
    ...s,
    statusLabel: fmt.sessionStatusLabel(s.status),
    exerciseCount: (s.exercises || []).length
  };
}

function buildQuickSessionPayload(date, exercise, sets, repsPerSet, weight, note) {
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

function flattenQuickSessions(sessions) {
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
    tabs: TABS,
    activeTab: 'quick',
    pageTitle: '运动速记',

    date: dateUtil.today(),
    bodyParts: BODY_PARTS,
    bodyPartIndex: 0,
    quickExercises: [],
    quickExerciseNames: [],
    quickExerciseIndex: -1,
    customExerciseName: '',
    form: { sets: 3, repsPerSet: 10, weight: '', note: '', quickText: '' },
    sessions: [],
    flatRecords: [],
    totalVolume: 0,
    quickLoading: false,
    saving: false,
    parsing: false,

    plans: [],
    activeSession: null,
    plansLoading: false,
    planSaving: false,
    editorOpen: false,
    editingPlanId: null,
    editorTitle: '新建计划',
    typeLabels: TYPE_LABELS,
    typeIndex: 0,
    planExercises: [],
    planExerciseNames: [],
    planExerciseIndex: -1,
    exerciseEditIndex: -1,
    planForm: defaultPlanForm(),
    exerciseForm: defaultExerciseForm(),
    draftExercises: [],

    historySessions: [],
    historyLoading: false,

    stats: null,
    statsCards: [],
    prs: [],
    statsLoading: false
  },

  onLoad() {
    authGuard.ensureToken();
    this.activateTab(this.consumePendingTab() || 'quick', true);
  },

  onShow() {
    if (!authGuard.ensureToken()) return;
    const pendingTab = this.consumePendingTab();
    if (pendingTab) {
      this.activateTab(pendingTab, true);
    } else {
      this.refreshActiveTab();
    }
  },

  consumePendingTab() {
    const tab = wx.getStorageSync(TAB_STORAGE_KEY);
    if (tab) wx.removeStorageSync(TAB_STORAGE_KEY);
    return TABS.some((x) => x.key === tab) ? tab : '';
  },

  onTabTap(e) {
    this.activateTab(e.currentTarget.dataset.tab);
  },

  activateTab(tab, force = false) {
    if (!TABS.some((x) => x.key === tab)) return;
    this.setData({ activeTab: tab, pageTitle: tabTitle(tab) });
    wx.setNavigationBarTitle({ title: tabTitle(tab) });
    this.loadTab(tab, force);
  },

  refreshActiveTab() {
    const tab = this.data.activeTab;
    if (tab === 'plans') this.loadActive();
    if (tab === 'quick') this.reloadQuickSessions();
    if (tab === 'sessions') this.loadHistorySessions();
    if (tab === 'stats') this.loadStats();
  },

  loadTab(tab, force = false) {
    if (tab === 'quick') {
      if (force || this.data.quickExercises.length === 0) this.reloadQuickExercises();
      this.reloadQuickSessions();
      return;
    }
    if (tab === 'plans') {
      if (force || this.data.planExercises.length === 0) this.loadPlanExercises();
      this.loadPlans();
      return;
    }
    if (tab === 'sessions') {
      this.loadHistorySessions();
      return;
    }
    if (tab === 'stats') this.loadStats();
  },

  onDateChange(e) {
    this.setData({ date: e.detail.value });
    this.reloadQuickSessions();
  },

  onBodyPartChange(e) {
    this.setData({ bodyPartIndex: Number(e.detail.value), quickExerciseIndex: -1 });
    this.reloadQuickExercises();
  },

  onQuickExerciseChange(e) {
    this.setData({ quickExerciseIndex: Number(e.detail.value) });
  },

  onInput(e) {
    this.setData({ [`form.${e.currentTarget.dataset.field}`]: e.detail.value });
  },

  onCustomInput(e) {
    this.setData({ customExerciseName: e.detail.value });
  },

  async reloadQuickExercises() {
    try {
      const bodyPart = BODY_PARTS[this.data.bodyPartIndex];
      const quickExercises = await training.listStrengthExercises({ bodyPart });
      this.setData({
        quickExercises,
        quickExerciseNames: (quickExercises || []).map((x) => x.name)
      });
    } catch (e) {
      fmt.showError(e, '加载动作库失败');
    }
  },

  async reloadQuickSessions() {
    this.setData({ quickLoading: true });
    try {
      const sessions = await training.listSessionsByDate(this.data.date);
      const flatRecords = flattenQuickSessions(sessions);
      const totalVolume = flatRecords.reduce(
        (s, r) => s + Number(r.weight || 0) * Number(r.sets || 0) * Number(r.repsPerSet || 0),
        0
      );
      this.setData({ sessions, flatRecords, totalVolume: fmt.num(totalVolume) });
    } catch (e) {
      fmt.showError(e, '加载运动记录失败');
    } finally {
      this.setData({ quickLoading: false });
    }
  },

  async ensureQuickExercise() {
    if (this.data.quickExerciseIndex >= 0) {
      return this.data.quickExercises[this.data.quickExerciseIndex];
    }
    const name = String(this.data.customExerciseName || '').trim();
    if (!name) throw new Error('请选择动作，或填写自定义动作');
    const ex = await training.createCustomStrengthExercise({
      name,
      bodyPart: BODY_PARTS[this.data.bodyPartIndex]
    });
    await this.reloadQuickExercises();
    return ex;
  },

  async onSubmit() {
    const f = this.data.form;
    if (!Number(f.sets) || !Number(f.repsPerSet)) return fmt.toast('请填写组数和次数');
    this.setData({ saving: true });
    try {
      const ex = await this.ensureQuickExercise();
      await training.createSession(
        buildQuickSessionPayload(this.data.date, ex, f.sets, f.repsPerSet, f.weight, f.note)
      );
      fmt.toast('已记录', 'success');
      this.setData({
        form: { ...this.data.form, sets: 3, repsPerSet: 10, weight: '', note: '' },
        customExerciseName: '',
        quickExerciseIndex: -1
      });
      this.reloadQuickSessions();
    } catch (e) {
      fmt.showError(e, '保存失败');
    } finally {
      this.setData({ saving: false });
    }
  },

  async onQuickText() {
    const text = String(this.data.form.quickText || '').trim();
    if (!text) return fmt.toast('请输入文字速记');
    this.setData({ parsing: true });
    try {
      await training.quickLog(text, dateUtil.toIsoNoMs(dateUtil.addHoursToDate(this.data.date, 12)));
      fmt.toast('已解析并记录', 'success');
      this.setData({ 'form.quickText': '' });
      this.reloadQuickSessions();
    } catch (e) {
      fmt.showError(e, '解析失败');
    } finally {
      this.setData({ parsing: false });
    }
  },

  onQuickDelete(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '删除这条运动记录？',
      confirmColor: '#B0413E',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await training.deleteSession(id);
          fmt.toast('已删除', 'success');
          this.reloadQuickSessions();
        } catch (err) {
          fmt.showError(err, '删除失败');
        }
      }
    });
  },

  async loadPlans() {
    this.setData({ plansLoading: true });
    try {
      const [plansRaw] = await Promise.all([training.listPlans(), this.loadActive()]);
      this.setData({ plans: (plansRaw || []).map(decoratePlan) });
    } catch (e) {
      fmt.showError(e, '加载计划失败');
    } finally {
      this.setData({ plansLoading: false });
    }
  },

  async loadActive() {
    try {
      const activeSession = await training.getActiveSession();
      this.setData({ activeSession });
      return activeSession;
    } catch (e) {
      this.setData({ activeSession: null });
      return null;
    }
  },

  async loadPlanExercises() {
    try {
      const planExercises = await training.searchExercises({ all: true, limit: 200 });
      this.setData({
        planExercises,
        planExerciseNames: (planExercises || []).map((e) => e.name)
      });
    } catch (e) {
      fmt.showError(e, '加载动作库失败');
    }
  },

  openCreate() {
    this.setData({
      editorOpen: true,
      editingPlanId: null,
      editorTitle: '新建计划',
      typeIndex: 0,
      planForm: defaultPlanForm(),
      exerciseForm: defaultExerciseForm(),
      planExerciseIndex: -1,
      exerciseEditIndex: -1,
      draftExercises: []
    });
  },

  openEdit(e) {
    const plan = this.data.plans[Number(e.currentTarget.dataset.index)];
    const typeIndex = Math.max(0, TYPE_OPTIONS.indexOf(plan.type));
    const draftExercises = (plan.exercises || []).map((x, i) => ({
      exerciseId: x.exerciseId,
      exerciseName: x.exerciseName || `动作#${x.exerciseId}`,
      bodyPart: x.bodyPart || '',
      sets: x.sets || 3,
      reps: x.reps || '',
      weight: x.weight == null ? '' : x.weight,
      restSeconds: x.restSeconds || 90,
      notes: x.notes || '',
      order: x.order == null ? i : x.order
    }));
    this.setData({
      editorOpen: true,
      editingPlanId: plan.id,
      editorTitle: `编辑 ${plan.name}`,
      typeIndex,
      planForm: {
        name: plan.name || '',
        description: plan.description || '',
        estimatedDuration: plan.estimatedDuration || ''
      },
      exerciseForm: defaultExerciseForm(),
      planExerciseIndex: -1,
      exerciseEditIndex: -1,
      draftExercises
    });
  },

  closeEditor() {
    this.setData({ editorOpen: false, editingPlanId: null });
  },

  onTypeChange(e) {
    this.setData({ typeIndex: Number(e.detail.value) });
  },

  onPlanExerciseChange(e) {
    this.setData({ planExerciseIndex: Number(e.detail.value) });
  },

  onPlanInput(e) {
    this.setData({ [`planForm.${e.currentTarget.dataset.field}`]: e.detail.value });
  },

  onExerciseInput(e) {
    this.setData({ [`exerciseForm.${e.currentTarget.dataset.field}`]: e.detail.value });
  },

  addOrUpdateExercise() {
    if (this.data.planExerciseIndex < 0) return fmt.toast('请选择动作');
    const exercise = this.data.planExercises[this.data.planExerciseIndex];
    const f = this.data.exerciseForm;
    if (!Number(f.sets)) return fmt.toast('请填写组数');
    const item = {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      bodyPart: exercise.bodyPart || '',
      sets: Number(f.sets),
      reps: f.reps === '' ? undefined : Number(f.reps),
      weight: f.weight === '' ? undefined : Number(f.weight),
      restSeconds: Number(f.restSeconds || 90),
      notes: String(f.notes || '').trim(),
      order: this.data.exerciseEditIndex >= 0 ? this.data.exerciseEditIndex : this.data.draftExercises.length
    };
    const list = this.data.draftExercises.slice();
    if (this.data.exerciseEditIndex >= 0) list[this.data.exerciseEditIndex] = item;
    else list.push(item);
    this.setData({
      draftExercises: list.map((x, i) => ({ ...x, order: i })),
      exerciseForm: defaultExerciseForm(),
      planExerciseIndex: -1,
      exerciseEditIndex: -1
    });
  },

  editDraftExercise(e) {
    const index = Number(e.currentTarget.dataset.index);
    const item = this.data.draftExercises[index];
    const planExerciseIndex = this.data.planExercises.findIndex((x) => x.id === item.exerciseId);
    this.setData({
      exerciseEditIndex: index,
      planExerciseIndex,
      exerciseForm: {
        sets: item.sets,
        reps: item.reps == null ? '' : item.reps,
        weight: item.weight == null ? '' : item.weight,
        restSeconds: item.restSeconds || 90,
        notes: item.notes || ''
      }
    });
  },

  removeDraftExercise(e) {
    const index = Number(e.currentTarget.dataset.index);
    const list = this.data.draftExercises
      .filter((_, i) => i !== index)
      .map((x, i) => ({ ...x, order: i }));
    this.setData({ draftExercises: list });
  },

  moveDraftExercise(e) {
    const index = Number(e.currentTarget.dataset.index);
    const dir = Number(e.currentTarget.dataset.dir);
    const to = index + dir;
    const list = this.data.draftExercises.slice();
    if (to < 0 || to >= list.length) return;
    const tmp = list[index];
    list[index] = list[to];
    list[to] = tmp;
    this.setData({ draftExercises: list.map((x, i) => ({ ...x, order: i })) });
  },

  buildPlanPayload() {
    const f = this.data.planForm;
    if (!String(f.name || '').trim()) throw new Error('请填写计划名称');
    if (this.data.draftExercises.length === 0) throw new Error('请至少添加一个动作');
    return {
      name: String(f.name).trim(),
      description: String(f.description || '').trim() || undefined,
      type: TYPE_OPTIONS[this.data.typeIndex],
      estimatedDuration: f.estimatedDuration === '' ? undefined : Number(f.estimatedDuration),
      isTemplate: false,
      exercises: this.data.draftExercises.map((x, i) => ({
        exerciseId: x.exerciseId,
        sets: Number(x.sets || 3),
        reps: x.reps === '' || x.reps == null ? undefined : Number(x.reps),
        weight: x.weight === '' || x.weight == null ? undefined : Number(x.weight),
        restSeconds: Number(x.restSeconds || 90),
        notes: x.notes || undefined,
        order: i
      }))
    };
  },

  async savePlan() {
    let payload;
    try {
      payload = this.buildPlanPayload();
    } catch (e) {
      return fmt.toast(e.message);
    }
    this.setData({ planSaving: true });
    try {
      if (this.data.editingPlanId) await training.updatePlan(this.data.editingPlanId, payload);
      else await training.createPlan(payload);
      fmt.toast('计划已保存', 'success');
      this.setData({ editorOpen: false, editingPlanId: null });
      this.loadPlans();
    } catch (e) {
      fmt.showError(e, '保存失败');
    } finally {
      this.setData({ planSaving: false });
    }
  },

  async onPlanStart(e) {
    const index = Number(e.currentTarget.dataset.index);
    const plan = this.data.plans[index];
    try {
      const session = await training.createSession({
        planId: plan.id,
        name: plan.name,
        status: 'in_progress',
        startTime: dateUtil.toIsoNoMs(new Date()),
        source: 'plan',
        exercises: (plan.exercises || []).map((pe) => ({
          exerciseId: pe.exerciseId,
          plannedSets: pe.sets,
          notes: pe.notes,
          completedSets: Array.from({ length: pe.sets || 0 }, (_, i) => ({
            setNumber: i + 1,
            reps: pe.reps || 0,
            weight: pe.weight || 0,
            isCompleted: false
          }))
        }))
      });
      wx.navigateTo({ url: `/pages/training-active/training-active?id=${session.id}` });
    } catch (e2) {
      fmt.showError(e2, '开始运动失败');
    }
  },

  continueActive() {
    if (!this.data.activeSession || !this.data.activeSession.id) return;
    wx.navigateTo({ url: `/pages/training-active/training-active?id=${this.data.activeSession.id}` });
  },

  onPlanDelete(e) {
    const index = Number(e.currentTarget.dataset.index);
    const plan = this.data.plans[index];
    wx.showModal({
      title: `删除 ${plan.name}？`,
      confirmColor: '#B0413E',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await training.deletePlan(plan.id);
          fmt.toast('已删除', 'success');
          this.loadPlans();
        } catch (err) {
          fmt.showError(err, '删除失败');
        }
      }
    });
  },

  async loadHistorySessions() {
    this.setData({ historyLoading: true });
    try {
      const historySessions = await training.listSessions(1, 50);
      this.setData({ historySessions: (historySessions || []).map(decorateSession) });
    } catch (e) {
      fmt.showError(e, '加载运动历史失败');
    } finally {
      this.setData({ historyLoading: false });
    }
  },

  onOpenSession(e) {
    const s = this.data.historySessions[Number(e.currentTarget.dataset.index)];
    if (s.status === 'in_progress' || s.status === 'active' || s.status === 'paused') {
      wx.navigateTo({ url: `/pages/training-active/training-active?id=${s.id}` });
    }
  },

  onSessionDelete(e) {
    const s = this.data.historySessions[Number(e.currentTarget.dataset.index)];
    wx.showModal({
      title: '删除运动记录？',
      content: s.name,
      confirmColor: '#B0413E',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await training.deleteSession(s.id);
          fmt.toast('已删除', 'success');
          this.loadHistorySessions();
        } catch (err) {
          fmt.showError(err, '删除失败');
        }
      }
    });
  },

  async loadStats() {
    this.setData({ statsLoading: true });
    try {
      const stats = await training.getTrainingStats();
      const statsCards = [
        { label: '总运动', value: fmt.num(stats.totalWorkouts), unit: '次' },
        { label: '总容量', value: fmt.num(stats.totalVolume), unit: 'kg' },
        { label: '当前连续', value: fmt.num(stats.currentStreak), unit: '天' },
        { label: '最长连续', value: fmt.num(stats.longestStreak), unit: '天' },
        { label: '周均', value: fmt.num(stats.weeklyAverage, 1), unit: '次' },
        { label: '今日消耗', value: fmt.num(stats.todayExerciseCalories), unit: 'kcal' }
      ];
      const prs = Object.keys(stats.personalRecords || {}).map((name) => ({
        name,
        weight: stats.personalRecords[name].weight,
        date: stats.personalRecords[name].date
      }));
      this.setData({ stats, statsCards, prs });
    } catch (e) {
      fmt.showError(e, '加载运动统计失败');
    } finally {
      this.setData({ statsLoading: false });
    }
  }
});
