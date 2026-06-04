const authGuard = require('../../utils/authGuard');
const dateUtil = require('../../utils/date');
const fmt = require('../../utils/format');
const statApi = require('../../services/statistics');

const SEV_LABEL = { info: '提示', warn: '注意', critical: '严重' };

// 评分说明文案：key 与评分拆解每行对应，all=总览
const SCORE_HELP = {
  all: {
    title: '饮食评分（满分 100）',
    content: '总分 = 热量 30 + 营养素 35 + 餐次分布 20 + 多样性 15。\n\n' +
      '· 热量(30)：越接近目标越高，偏差≤10%满分，>20%后快速扣到0。\n' +
      '· 营养素(35)：蛋白/碳水/脂肪各9分（达目标±15%满分）+ 膳食纤维8分（≥25g满分）。\n' +
      '· 餐次分布(20)：早25%/午35%/晚30%/加餐10%，偏离越多扣越多。\n' +
      '· 多样性(15)：种类≥12=15，≥8=10，≥5=6，≥1=3。\n\n' +
      '提示：进行中的当天因为还没吃完，分数偏低是正常的，请以日终结算为准。'
  },
  calorie: {
    title: '热量达标度（30 分）',
    content: '看当日总摄入与目标热量的偏差百分比：\n\n' +
      '· 偏差 ≤10% → 满分 30\n' +
      '· 10%~20% → 从 30 线性降到 15\n' +
      '· >20% → 每多 1% 再扣 0.5，最低 0\n\n' +
      '目标热量按你的资料(BMR)、活动水平、当日训练/休息和健身目标推算。'
  },
  nutrient: {
    title: '营养素合规性（35 分）',
    content: '按目标热量与你的宏量比例换算出克数目标：\n\n' +
      '· 蛋白 / 碳水 / 脂肪 各 9 分：落在目标 ±15% 给满分，每多偏 1% 扣 0.1\n' +
      '· 膳食纤维 8 分：达到 25g 满分，不足按比例\n\n' +
      '（添加糖扣分暂未启用）'
  },
  meal: {
    title: '餐次分布（20 分）',
    content: '推荐占比：早 25% / 午 35% / 晚 30% / 加餐 10%。\n\n' +
      '从 20 分起，每一餐实际占比偏离推荐超过 5% 的部分按比例扣分（单餐最多扣 5）。' +
      '跳过正餐、或集中在某一餐，都会扣分。'
  },
  variety: {
    title: '食物多样性（15 分）',
    content: '按当日不同食物种类数计分：\n\n' +
      '· ≥12 种 → 15\n· ≥8 种 → 10\n· ≥5 种 → 6\n· ≥1 种 → 3\n\n' +
      '种类越多，覆盖的微量营养素越全面。'
  }
};

Page({
  data: {
    date: dateUtil.today(),
    displayDate: dateUtil.displayDate(dateUtil.today()),
    loading: false,
    inProgress: false,
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
    const inProgress = date >= dateUtil.today(); // 今天或未来 = 进行中
    this.setData({ loading: true, inProgress, displayDate: dateUtil.displayDate(date) });
    try {
      const [daily, score, suggestionsResp] = await Promise.all([
        statApi.getDailyStatistics(date).catch(() => null),
        statApi.getDietScore(date).catch(() => null),
        statApi.getDietSuggestions(date).catch(() => ({ suggestions: [] }))
      ]);

      const cards = this.buildCards(daily, score, inProgress);
      const scoreView = this.buildScoreView(score);
      const statusText = this.buildStatusText(daily, inProgress);
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

      this.setData({ daily, score, cards, scoreView, statusText, macro, visibleSuggestions: suggestions });
    } catch (e) {
      fmt.showError(e, '加载分析失败');
    } finally {
      this.setData({ loading: false });
    }
  },

  buildCards(daily, score, inProgress) {
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

    const scoreCard = inProgress
      ? { label: '饮食评分', value: '进行中', unit: '' }
      : { label: '饮食评分', value: fmt.num(scoreTotal), unit: '分' };

    return [
      { label: '热量', value: fmt.num(daily.totalCalories), unit: 'kcal' },
      secondCard,
      { label: '食物种类', value: fmt.num(daily.foodVarietyCount), unit: '种' },
      scoreCard
    ];
  },

  buildScoreView(score) {
    if (!score) return null;
    return {
      total: fmt.num(score.totalScore, 1),
      rows: [
        { key: 'calorie', label: '热量', value: fmt.num(score.calorieScore, 1), max: 30 },
        { key: 'nutrient', label: '营养素', value: fmt.num(score.nutrientScore, 1), max: 35 },
        { key: 'meal', label: '餐次分布', value: fmt.num(score.mealDistributionScore, 1), max: 20 },
        { key: 'variety', label: '多样性', value: fmt.num(score.varietyScore, 1), max: 15 }
      ]
    };
  },

  buildStatusText(daily, inProgress) {
    if (!daily) return '';
    if (!inProgress) return daily.statusHint || '';
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
