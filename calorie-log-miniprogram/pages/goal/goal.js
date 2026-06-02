const authGuard = require('../../utils/authGuard');
const dateUtil = require('../../utils/date');
const fmt = require('../../utils/format');
const goalApi = require('../../services/goal');

Page({
  data: {
    loading: false,
    saving: false,
    goal: null,
    mealDistribution: null,
    goalOptions: ['增肌塑型', '减脂增肌'],
    form: {
      goalType: 2,
      targetCaloriesTraining: '',
      targetCaloriesRest: '',
      proteinRatio: '',
      carbRatio: '',
      fatRatio: ''
    }
  },
  onLoad() { authGuard.ensureToken(); this.load(); },
  async load() {
    this.setData({ loading: true });
    try {
      const [goal, mealDistribution] = await Promise.all([
        goalApi.getCurrentGoal().catch(() => null),
        goalApi.getMealDistribution(dateUtil.today()).catch(() => null)
      ]);
      const form = goal ? {
        goalType: Number(goal.goalType || 2),
        targetCaloriesTraining: goal.targetCaloriesTraining || '',
        targetCaloriesRest: goal.targetCaloriesRest || '',
        proteinRatio: goal.proteinRatio || '',
        carbRatio: goal.carbRatio || '',
        fatRatio: goal.fatRatio || ''
      } : this.data.form;
      this.setData({ goal, mealDistribution, form });
    } catch (e) { fmt.showError(e, '加载目标失败'); }
    finally { this.setData({ loading: false }); }
  },
  onGoalTypeChange(e) { this.setData({ 'form.goalType': Number(e.detail.value) + 1 }); },
  onInput(e) { this.setData({ [`form.${e.currentTarget.dataset.field}`]: e.detail.value }); },
  async onSubmit() {
    const f = this.data.form;
    const p = Number(f.proteinRatio || 0), c = Number(f.carbRatio || 0), fat = Number(f.fatRatio || 0);
    if ((p || c || fat) && p + c + fat !== 100) return fmt.toast('三大营养素比例之和需为 100');
    this.setData({ saving: true });
    try {
      await goalApi.setGoal({
        goalType: Number(f.goalType),
        targetCaloriesTraining: f.targetCaloriesTraining === '' ? undefined : Number(f.targetCaloriesTraining),
        targetCaloriesRest: f.targetCaloriesRest === '' ? undefined : Number(f.targetCaloriesRest),
        proteinRatio: f.proteinRatio === '' ? undefined : Number(f.proteinRatio),
        carbRatio: f.carbRatio === '' ? undefined : Number(f.carbRatio),
        fatRatio: f.fatRatio === '' ? undefined : Number(f.fatRatio)
      });
      fmt.toast('目标已保存', 'success');
      this.load();
    } catch (e) { fmt.showError(e, '保存失败'); }
    finally { this.setData({ saving: false }); }
  }
});
