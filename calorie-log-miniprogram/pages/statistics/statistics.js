const authGuard = require('../../utils/authGuard');
const dateUtil = require('../../utils/date');
const fmt = require('../../utils/format');
const statApi = require('../../services/statistics');
const recordApi = require('../../services/record');
const goalApi = require('../../services/goal');

const SEV_LABEL = { info: '提示', warn: '注意', critical: '严重' };
const MEAL_RATIOS = { 1: 0.25, 2: 0.35, 3: 0.30, 4: 0.10 };
const MEAL_LABELS = { 1: '早餐', 2: '午餐', 3: '晚餐', 4: '加餐' };
const MEAL_FIELDS = { 1: 'breakfast', 2: 'lunch', 3: 'dinner', 4: 'snacks' };
const MEAL_TOLERANCE = 0.05;

// 评分说明文案：key 与评分拆解每行对应，all=总览
const SCORE_HELP = {
  all: {
    title: '饮食评分（满分 100）',
    content: '总分 = 热量 30 + 营养素 35 + 餐次分布 20 + 多样性 15。\n\n' +
      '· 热量(30)：越接近目标越高，偏差≤10%满分，>20%后快速扣到0。\n' +
      '· 营养素(35)：蛋白/碳水/脂肪各9分（达目标±15%满分）+ 膳食纤维8分（≥25g满分）。\n' +
      '· 餐次分布(20)：早25%/午35%/晚30%/加餐10%，加餐没录入时按早午晚折算。\n' +
      '· 多样性(15)：种类≥12=15，≥8=10，≥5=6，≥1=3。\n\n' +
      '进行中的当天会按当前应完成餐次折算目标。例如 14:00 按早餐+午餐约 60% 目标计算，日终再按完整一天结算。'
  },
  calorie: {
    title: '热量达标度（30 分）',
    content: '看当日总摄入与目标热量的偏差百分比：\n\n' +
      '· 偏差 ≤10% → 满分 30\n' +
      '· 10%~20% → 从 30 线性降到 15\n' +
      '· >20% → 每多 1% 再扣 0.5，最低 0\n\n' +
      '当天进行中时，目标热量会先乘以当前应完成餐次占比。'
  },
  nutrient: {
    title: '营养素合规性（35 分）',
    content: '按目标热量与你的宏量比例换算出克数目标：\n\n' +
      '· 蛋白 / 碳水 / 脂肪 各 9 分：落在目标 ±15% 给满分，每多偏 1% 扣 0.1\n' +
      '· 膳食纤维 8 分：达到 25g 满分，不足按比例\n\n' +
      '当天进行中时，蛋白 / 碳水 / 脂肪 / 膳食纤维目标会按当前餐次占比折算。'
  },
  meal: {
    title: '餐次分布（20 分）',
    content: '推荐占比：早 25% / 午 35% / 晚 30% / 加餐 10%。\n\n' +
      '有加餐记录时按四餐计算；没有加餐时按早午晚三餐计算。当天进行中时，只比较当前应完成餐次之间的分布。' +
      '加餐是可选项，没录加餐时不会因为缺少加餐扣分。跳过正餐、或集中在某一餐，都会扣分。'
  },
  variety: {
    title: '食物多样性（15 分）',
    content: '按当日不同食物种类数计分：\n\n' +
      '· ≥12 种 → 15\n· ≥8 种 → 10\n· ≥5 种 → 6\n· ≥1 种 → 3\n\n' +
      '当天进行中时，多样性门槛会按当前餐次占比折算。'
  }
};

function toNumber(v) {
  if (v === null || v === undefined || v === '' || Number.isNaN(Number(v))) return 0;
  return Number(v);
}

function roundScore(v) {
  return Math.round(Math.max(0, Number(v || 0)) * 100) / 100;
}

function scoreByTarget(actual, target, full) {
  if (!target || target <= 0) return 0;
  const deviationPct = Math.abs(Number(actual || 0) - target) / target * 100;
  if (deviationPct <= 10) return full;
  if (deviationPct <= 20) return full - (deviationPct - 10) * (full / 20);
  return Math.max(0, full / 2 - (deviationPct - 20) * (full / 60));
}

function fitScore(actual, target, full) {
  if (!target || target <= 0) return 0;
  const dev = Math.abs(Number(actual || 0) - target) / target * 100;
  if (dev <= 15) return full;
  return Math.max(0, full - (dev - 15) * 0.1);
}

function mealRecords(dailyRecords, mealType) {
  const key = MEAL_FIELDS[mealType];
  return (dailyRecords && dailyRecords[key]) || [];
}

function recordsForMeals(dailyRecords, mealTypes) {
  return mealTypes.reduce((list, type) => list.concat(mealRecords(dailyRecords, type)), []);
}

function hasMealRecord(dailyRecords, mealType) {
  return mealRecords(dailyRecords, mealType).some((r) => toNumber(r.calories) > 0);
}

function sumField(records, field) {
  return records.reduce((sum, r) => sum + toNumber(r[field]), 0);
}

function distinctFoodCount(records) {
  const keys = {};
  records.forEach((r) => {
    const key = r.foodId != null ? `id:${r.foodId}` : `name:${r.foodName || ''}`;
    if (key !== 'name:') keys[key] = true;
  });
  return Object.keys(keys).length;
}

function buildCurrentMealPlan(dailyRecords, now) {
  const hour = (now || new Date()).getHours();
  const mealTypes = [];
  if (hour >= 9) mealTypes.push(1);
  if (hour >= 14) mealTypes.push(2);
  if (hour >= 20) mealTypes.push(3);

  Object.keys(MEAL_RATIOS).forEach((key) => {
    const type = Number(key);
    if (hasMealRecord(dailyRecords, type) && mealTypes.indexOf(type) === -1) mealTypes.push(type);
  });

  mealTypes.sort((a, b) => a - b);
  const rawRatio = mealTypes.reduce((sum, type) => sum + MEAL_RATIOS[type], 0);
  const hasSnack = mealTypes.indexOf(4) !== -1;
  const hasAllMainMeals = [1, 2, 3].every((type) => mealTypes.indexOf(type) !== -1);
  const ratio = !hasSnack && hasAllMainMeals ? 1 : rawRatio;
  const distributionRatio = hasSnack ? rawRatio : mealTypes
    .filter((type) => type !== 4)
    .reduce((sum, type) => sum + MEAL_RATIOS[type], 0);
  return {
    mealTypes,
    ratio,
    distributionRatio,
    expectedPct: Math.round(ratio * 100),
    label: mealTypes.map((type) => MEAL_LABELS[type]).join('、')
  };
}

function scoreNutrientsProgress(totals, goal, targetCalories, ratio) {
  if (!goal || !targetCalories || !ratio) return { score: 0, detail: {} };
  const proteinRatio = toNumber(goal.proteinRatio);
  const carbRatio = toNumber(goal.carbRatio);
  const fatRatio = toNumber(goal.fatRatio);
  if (!proteinRatio || !carbRatio || !fatRatio) return { score: 0, detail: {} };

  const proteinTargetG = targetCalories * ratio * proteinRatio / 100 / 4;
  const carbTargetG = targetCalories * ratio * carbRatio / 100 / 4;
  const fatTargetG = targetCalories * ratio * fatRatio / 100 / 9;
  const fiberTargetG = 25 * ratio;

  const proteinScore = fitScore(totals.protein, proteinTargetG, 9);
  const carbScore = fitScore(totals.carb, carbTargetG, 9);
  const fatScore = fitScore(totals.fat, fatTargetG, 9);
  const fiberScore = fiberTargetG > 0
    ? (totals.fiber >= fiberTargetG ? 8 : totals.fiber / fiberTargetG * 8)
    : 0;

  return {
    score: Math.min(35, proteinScore + carbScore + fatScore + fiberScore),
    detail: {
      protein: roundScore(proteinScore),
      carbohydrate: roundScore(carbScore),
      fat: roundScore(fatScore),
      fiber: roundScore(fiberScore),
      proteinTargetG: roundScore(proteinTargetG),
      carbTargetG: roundScore(carbTargetG),
      fatTargetG: roundScore(fatTargetG),
      fiberTargetG: roundScore(fiberTargetG)
    }
  };
}

function scoreMealDistributionProgress(dailyRecords, plan) {
  if (!plan || !plan.distributionRatio || plan.mealTypes.length === 0) return 0;
  const records = recordsForMeals(dailyRecords, plan.mealTypes);
  const total = sumField(records, 'calories');
  if (total <= 0) return 0;

  const maxPenaltyPerMeal = 20 / plan.mealTypes.length;
  let score = 20;
  plan.mealTypes.forEach((type) => {
    const mealCalories = sumField(mealRecords(dailyRecords, type), 'calories');
    const actualShare = mealCalories / total;
    const targetShare = MEAL_RATIOS[type] / plan.distributionRatio;
    const deviation = Math.abs(actualShare - targetShare);
    if (deviation > MEAL_TOLERANCE) {
      score -= Math.min(maxPenaltyPerMeal, (deviation - MEAL_TOLERANCE) * 100 * 0.5);
    }
  });
  return Math.max(0, score);
}

function scoreVarietyProgress(records, ratio) {
  const distinct = distinctFoodCount(records);
  const full = Math.max(1, Math.ceil(12 * ratio));
  const high = Math.max(1, Math.ceil(8 * ratio));
  const medium = Math.max(1, Math.ceil(5 * ratio));
  let score = 0;
  if (distinct >= full) score = 15;
  else if (distinct >= high) score = 10;
  else if (distinct >= medium) score = 6;
  else if (distinct >= 1) score = 3;
  return { score, count: distinct };
}

Page({
  data: {
    date: dateUtil.today(),
    displayDate: dateUtil.displayDate(dateUtil.today()),
    loading: false,
    inProgress: false,
    noRecord: false,
    daily: null,
    score: null,
    statusText: '',
    macro: { protein: '-', carb: '-', fat: '-' },
    cards: [],
    scoreView: null,
    visibleSuggestions: []
  },
  onLoad(options) {
    authGuard.ensureToken();
    if (options && options.date) this.setData({ date: options.date });
    this.load();
  },
  async load() {
    const date = this.data.date;
    const today = dateUtil.today();
    const inProgress = date >= today; // 今天或未来 = 进行中
    const isToday = date === today;
    this.setData({ loading: true, inProgress, noRecord: false, displayDate: dateUtil.displayDate(date) });
    try {
      const [daily, score, suggestionsResp, dailyRecords, goal] = await Promise.all([
        statApi.getDailyStatistics(date).catch(() => null),
        statApi.getDietScore(date).catch(() => null),
        statApi.getDietSuggestions(date).catch(() => ({ suggestions: [] })),
        recordApi.getDailyRecords(date).catch(() => null),
        goalApi.getCurrentGoal().catch(() => null)
      ]);

      const hasRecords = !!(daily && (Number(daily.totalCalories) > 0 || Number(daily.foodVarietyCount) > 0));
      // 历史日且当天无任何录入 → 只提示未录入，不做分析
      const noRecord = !inProgress && !hasRecords;
      if (noRecord) {
        this.setData({ daily, noRecord: true, cards: [], scoreView: null, statusText: '', visibleSuggestions: [] });
        return;
      }

      const progressScore = isToday ? this.buildProgressScore(dailyRecords, daily, goal) : null;
      const effectiveScore = progressScore || (!inProgress ? score : null);
      const cards = this.buildCards(daily, effectiveScore, inProgress, progressScore);
      const scoreView = this.buildScoreView(effectiveScore, progressScore);
      const statusText = this.buildStatusText(daily, inProgress, progressScore);
      const macro = {
        protein: fmt.num(daily && daily.totalProtein, 1),
        carb: fmt.num(daily && daily.totalCarb, 1),
        fat: fmt.num(daily && daily.totalFat, 1)
      };

      let suggestions = (suggestionsResp.suggestions || []).map((s) => ({
        ...s,
        sevLabel: SEV_LABEL[s.severity] || s.severity
      }));
      if (inProgress) suggestions = suggestions.filter((s) => !s.endOfDayOnly);

      this.setData({ daily, score, noRecord: false, cards, scoreView, statusText, macro, visibleSuggestions: suggestions });
    } catch (e) {
      fmt.showError(e, '加载分析失败');
    } finally {
      this.setData({ loading: false });
    }
  },

  buildProgressScore(dailyRecords, daily, goal) {
    if (!dailyRecords) return null;
    const targetCalories = toNumber((daily && daily.targetCalories) || dailyRecords.targetCalories);
    if (!targetCalories) return null;

    const plan = buildCurrentMealPlan(dailyRecords, new Date());
    if (!plan.ratio || plan.mealTypes.length === 0) return null;

    const records = recordsForMeals(dailyRecords, plan.mealTypes);
    const totals = {
      calories: sumField(records, 'calories'),
      protein: sumField(records, 'protein'),
      carb: sumField(records, 'carbohydrate'),
      fat: sumField(records, 'fat'),
      fiber: sumField(records, 'dietaryFiber')
    };
    const progressTargetCalories = targetCalories * plan.ratio;
    const calorieScore = scoreByTarget(totals.calories, progressTargetCalories, 30);
    const nutrient = scoreNutrientsProgress(totals, goal, targetCalories, plan.ratio);
    const mealScore = scoreMealDistributionProgress(dailyRecords, plan);
    const variety = scoreVarietyProgress(records, plan.ratio);
    const total = calorieScore + nutrient.score + mealScore + variety.score;

    return {
      totalScore: roundScore(total),
      calorieScore: roundScore(calorieScore),
      nutrientScore: roundScore(nutrient.score),
      mealDistributionScore: roundScore(mealScore),
      varietyScore: roundScore(variety.score),
      varietyCount: variety.count,
      nutrientDetail: nutrient.detail,
      progressMeta: {
        label: plan.label,
        expectedPct: plan.expectedPct,
        recordedPct: fmt.ratioPct(totals.calories, targetCalories),
        recordedCalories: fmt.num(totals.calories),
        targetCalories: fmt.num(progressTargetCalories)
      }
    };
  },

  buildCards(daily, score, inProgress, progressScore) {
    if (!daily) return [];
    const scoreTotal = score ? score.totalScore : daily.dietScore;
    const remaining = (daily.targetCalories != null && daily.totalCalories != null)
      ? Number(daily.targetCalories) - Number(daily.totalCalories) : null;

    let secondCard;
    if (inProgress) {
      if (remaining == null) secondCard = { label: '还可摄入', value: '-', unit: 'kcal' };
      else if (remaining >= 0) secondCard = { label: '还可摄入', value: fmt.num(remaining), unit: 'kcal' };
      else secondCard = { label: '已超标', value: fmt.num(-remaining), unit: 'kcal' };
    } else {
      secondCard = { label: '目标差', value: fmt.num(daily.calorieGap), unit: 'kcal' };
    }

    const scoreCard = progressScore
      ? { label: '当前评分', value: fmt.num(scoreTotal, 1), unit: '分' }
      : inProgress
        ? { label: '饮食评分', value: '进行中', unit: '' }
      : { label: '饮食评分', value: fmt.num(scoreTotal), unit: '分' };

    return [
      { label: '热量', value: fmt.num(daily.totalCalories), unit: 'kcal' },
      secondCard,
      { label: '食物种类', value: fmt.num(daily.foodVarietyCount), unit: '种' },
      scoreCard
    ];
  },

  buildScoreView(score, progressScore) {
    if (!score) return null;
    return {
      source: progressScore ? 'progress' : 'day',
      meta: progressScore ? progressScore.progressMeta : null,
      total: fmt.num(score.totalScore, 1),
      rows: [
        { key: 'calorie', label: '热量', value: fmt.num(score.calorieScore, 1), max: 30 },
        { key: 'nutrient', label: '营养素', value: fmt.num(score.nutrientScore, 1), max: 35 },
        { key: 'meal', label: '餐次分布', value: fmt.num(score.mealDistributionScore, 1), max: 20 },
        { key: 'variety', label: '多样性', value: fmt.num(score.varietyScore, 1), max: 15 }
      ]
    };
  },

  buildStatusText(daily, inProgress, progressScore) {
    if (!daily) return '';
    if (!inProgress) return daily.statusHint || '';
    if (progressScore && progressScore.progressMeta) {
      const m = progressScore.progressMeta;
      return `当前应完成：${m.label}。已记录 ${m.recordedCalories} kcal，约为全天目标的 ${m.recordedPct}%（当前目标 ${m.expectedPct}%）。`;
    }
    const remaining = (daily.targetCalories != null && daily.totalCalories != null)
      ? Number(daily.targetCalories) - Number(daily.totalCalories) : null;
    if (remaining == null) return daily.statusHint || '今日仍在进行中。';
    const target = fmt.num(daily.targetCalories);
    if (remaining >= 0) return `今日目标 ${target} kcal，还可摄入 ${fmt.num(remaining)} kcal。`;
    return `今日已超出目标 ${fmt.num(-remaining)} kcal，注意控制后续摄入。`;
  },

  onShowScoreHelp(e) {
    const key = e.currentTarget.dataset.key || 'all';
    const help = SCORE_HELP[key] || SCORE_HELP.all;
    wx.showModal({ title: help.title, content: help.content, showCancel: false, confirmText: '知道了' });
  },

  onPrevDay() { this.setData({ date: dateUtil.addDays(this.data.date, -1) }); this.load(); },
  onNextDay() { this.setData({ date: dateUtil.addDays(this.data.date, 1) }); this.load(); },
  onDateChange(e) { this.setData({ date: e.detail.value }); this.load(); }
});
