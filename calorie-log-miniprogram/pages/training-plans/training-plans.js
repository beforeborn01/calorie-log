const authGuard = require('../../utils/authGuard');
const dateUtil = require('../../utils/date');
const fmt = require('../../utils/format');
const training = require('../../services/training');

const TYPE_OPTIONS = ['strength', 'cardio', 'mobility', 'mixed'];
const TYPE_LABELS = ['力量', '有氧', '柔韧', '混合'];

// 只有这些器械才显示「重量」输入（其余如自重/弹力带/有氧器械重量无意义）
const WEIGHTED_EQUIP = ['杠铃', '哑铃', '史密斯', '器械', '绳索'];
function shouldShowWeight(equipment) {
  return WEIGHTED_EQUIP.indexOf(equipment) >= 0;
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

function defaultPlanForm() {
  return { name: '', description: '', estimatedDuration: '' };
}

function defaultExerciseForm() {
  return { sets: 3, reps: 10, weight: '', restSeconds: 90, notes: '' };
}

Page({
  data: {
    plans: [],
    activeSession: null,
    loading: false,
    saving: false,
    editorOpen: false,
    editingPlanId: null,
    editorTitle: '新建计划',
    typeLabels: TYPE_LABELS,
    typeIndex: 0,
    pickerOpen: false,
    selectedExercise: null,
    showWeight: true,
    exerciseEditIndex: -1,
    planForm: defaultPlanForm(),
    exerciseForm: defaultExerciseForm(),
    draftExercises: []
  },

  onLoad() {
    authGuard.ensureToken();
    this.load();
  },

  onShow() {
    if (authGuard.ensureToken()) this.loadActive();
  },

  async load() {
    this.setData({ loading: true });
    try {
      const [plansRaw] = await Promise.all([training.listPlans(), this.loadActive()]);
      this.setData({ plans: (plansRaw || []).map(decoratePlan) });
    } catch (e) {
      fmt.showError(e, '加载计划失败');
    } finally {
      this.setData({ loading: false });
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

  openCreate() {
    this.setData({
      editorOpen: true,
      editingPlanId: null,
      editorTitle: '新建计划',
      typeIndex: 0,
      planForm: defaultPlanForm(),
      exerciseForm: defaultExerciseForm(),
      selectedExercise: null,
      showWeight: true,
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
      selectedExercise: null,
      showWeight: true,
      exerciseEditIndex: -1,
      draftExercises
    });
  },

  closeEditor() {
    this.setData({ editorOpen: false, editingPlanId: null });
  },

  onTypeChange(e) { this.setData({ typeIndex: Number(e.detail.value) }); },
  onPlanInput(e) { this.setData({ [`planForm.${e.currentTarget.dataset.field}`]: e.detail.value }); },
  onExerciseInput(e) { this.setData({ [`exerciseForm.${e.currentTarget.dataset.field}`]: e.detail.value }); },

  // —— 动作选择器 ——
  openPicker() { this.setData({ pickerOpen: true }); },
  closePicker() { this.setData({ pickerOpen: false }); },
  onPickerSelect(e) {
    const ex = e.detail.exercise;
    if (!ex) return;
    this.setData({
      selectedExercise: ex,
      showWeight: shouldShowWeight(ex.equipment),
      pickerOpen: false
    });
  },

  addOrUpdateExercise() {
    const exercise = this.data.selectedExercise;
    if (!exercise) return fmt.toast('请选择动作');
    const f = this.data.exerciseForm;
    if (!Number(f.sets)) return fmt.toast('请填写组数');
    const item = {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      bodyPart: exercise.bodyPart || '',
      equipment: exercise.equipment || '',
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
      selectedExercise: null,
      showWeight: true,
      exerciseEditIndex: -1
    });
  },

  editDraftExercise(e) {
    const index = Number(e.currentTarget.dataset.index);
    const item = this.data.draftExercises[index];
    this.setData({
      exerciseEditIndex: index,
      selectedExercise: {
        id: item.exerciseId,
        name: item.exerciseName,
        bodyPart: item.bodyPart,
        equipment: item.equipment || ''
      },
      showWeight: shouldShowWeight(item.equipment),
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
    const list = this.data.draftExercises.filter((_, i) => i !== index).map((x, i) => ({ ...x, order: i }));
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

  buildPayload() {
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
      payload = this.buildPayload();
    } catch (e) {
      return fmt.toast(e.message);
    }
    this.setData({ saving: true });
    try {
      if (this.data.editingPlanId) await training.updatePlan(this.data.editingPlanId, payload);
      else await training.createPlan(payload);
      fmt.toast('计划已保存', 'success');
      this.setData({ editorOpen: false, editingPlanId: null });
      this.load();
    } catch (e) {
      fmt.showError(e, '保存失败');
    } finally {
      this.setData({ saving: false });
    }
  },

  async onStart(e) {
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

  onDelete(e) {
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
          this.load();
        } catch (err) {
          fmt.showError(err, '删除失败');
        }
      }
    });
  },

  goQuick() { this.openTrainingTab('quick'); },
  goSessions() { this.openTrainingTab('sessions'); },
  goStats() { this.openTrainingTab('stats'); },
  openTrainingTab(tab) {
    wx.setStorageSync('trainingActiveTab', tab);
    wx.switchTab({ url: '/pages/training-quick/training-quick' });
  }
});
