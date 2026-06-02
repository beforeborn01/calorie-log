const authGuard = require('../../utils/authGuard');
const fmt = require('../../utils/format');
const social = require('../../services/social');

const TYPES = ['exp', 'score', 'streak'];
const TYPE_LABELS = ['经验', '评分', '连续记录'];
const PERIODS = ['all', 'week', 'month'];
const PERIOD_LABELS = ['总榜', '本周', '本月'];

Page({
  data: { typeLabels: TYPE_LABELS, periodLabels: PERIOD_LABELS, typeIndex: 0, periodIndex: 0, ranking: null, entries: [], loading: false },
  onLoad() { authGuard.ensureToken(); this.load(); },
  onTypeChange(e) { this.setData({ typeIndex: Number(e.detail.value) }); this.load(); },
  onPeriodChange(e) { this.setData({ periodIndex: Number(e.detail.value) }); this.load(); },
  async load() {
    this.setData({ loading: true });
    try {
      const ranking = await social.getRanking(TYPES[this.data.typeIndex], PERIODS[this.data.periodIndex]);
      this.setData({ ranking, entries: ranking.entries || [] });
    } catch (e) { fmt.showError(e, '加载排行榜失败'); }
    finally { this.setData({ loading: false }); }
  }
});
