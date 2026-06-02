const authGuard = require('../../utils/authGuard');
const dateUtil = require('../../utils/date');
const fmt = require('../../utils/format');
const bodyApi = require('../../services/body');

Page({
  data: {
    date: dateUtil.today(),
    weight: '',
    bodyFat: '',
    trend: null,
    records: [],
    cards: [],
    chartPoints: [],
    saving: false,
    loading: false
  },
  onLoad() { authGuard.ensureToken(); this.load(); },
  onDateChange(e) { this.setData({ date: e.detail.value }); },
  onInput(e) { this.setData({ [e.currentTarget.dataset.field]: e.detail.value }); },
  async load() {
    this.setData({ loading: true });
    try {
      const end = dateUtil.today();
      const start = dateUtil.addDays(end, -30);
      const trend = await bodyApi.getBodyTrend(start, end);
      const rawRecords = trend.records || [];
      const records = rawRecords.slice().reverse();
      const weights = rawRecords.map((r) => Number(r.weight)).filter((v) => !Number.isNaN(v) && v > 0);
      const minW = weights.length ? Math.min(...weights) : 0;
      const maxW = weights.length ? Math.max(...weights) : 0;
      const chartPoints = rawRecords
        .filter((r) => r.weight != null)
        .map((r) => {
          const w = Number(r.weight);
          const height = maxW === minW ? 60 : Math.round(20 + ((w - minW) / (maxW - minW)) * 100);
          return { date: String(r.recordDate).slice(5), value: fmt.num(w, 1), height };
        });
      const cards = [
        { label: '体重变化', value: fmt.num(trend.weightChange, 1), unit: 'kg' },
        { label: '体脂变化', value: fmt.num(trend.bodyFatChange, 1), unit: '%' },
        { label: '记录数', value: String(trend.records ? trend.records.length : 0), unit: '条' }
      ];
      this.setData({ trend, records, cards, chartPoints });
    } catch (e) { fmt.showError(e, '加载体重趋势失败'); }
    finally { this.setData({ loading: false }); }
  },
  async onSubmit() {
    if (!this.data.weight && !this.data.bodyFat) return fmt.toast('请填写体重或体脂');
    this.setData({ saving: true });
    try {
      await bodyApi.saveBodyRecord({
        recordDate: this.data.date,
        weight: this.data.weight === '' ? undefined : Number(this.data.weight),
        bodyFat: this.data.bodyFat === '' ? undefined : Number(this.data.bodyFat)
      });
      fmt.toast('已保存', 'success');
      this.setData({ weight: '', bodyFat: '' });
      this.load();
    } catch (e) { fmt.showError(e, '保存失败'); }
    finally { this.setData({ saving: false }); }
  },
  onDelete(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({ title: '删除记录？', confirmColor: '#B0413E', success: async (res) => {
      if (!res.confirm) return;
      try { await bodyApi.deleteBodyRecord(id); fmt.toast('已删除', 'success'); this.load(); }
      catch (err) { fmt.showError(err, '删除失败'); }
    }});
  }
});
