const foodApi = require('../../services/food');
const recordApi = require('../../services/record');
const dateUtil = require('../../utils/date');
const fmt = require('../../utils/format');

function compute(food, quantity) {
  if (!food || !quantity) return null;
  const scale = Number(quantity) / 100;
  return {
    calories: fmt.num(Number(food.calories || 0) * scale),
    protein: fmt.num(Number(food.protein || 0) * scale, 1),
    carb: fmt.num(Number(food.carbohydrate || 0) * scale, 1),
    fat: fmt.num(Number(food.fat || 0) * scale, 1)
  };
}

Page({
  data: {
    date: dateUtil.today(),
    mealType: 1,
    mealLabel: '早餐',
    keyword: '',
    list: [],
    loading: false,
    selected: null,
    quantity: 100,
    isGross: false,
    computed: null
  },

  onLoad(options) {
    const date = options && options.date ? options.date : dateUtil.today();
    const mealType = Number(options && options.mealType ? options.mealType : 1);
    this.setData({ date, mealType, mealLabel: fmt.mealLabel(mealType) });
  },

  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  async onSearch() {
    const keyword = String(this.data.keyword || '').trim();
    if (!keyword) return fmt.toast('请输入食物关键词');
    this.setData({ loading: true, selected: null });
    try {
      const resp = await foodApi.searchFood(keyword, 1, 30);
      this.setData({ list: resp.list || [] });
    } catch (e) {
      fmt.showError(e, '搜索失败');
    } finally {
      this.setData({ loading: false });
    }
  },

  onChoose(e) {
    const index = Number(e.currentTarget.dataset.index);
    const selected = this.data.list[index];
    this.setData({ selected, quantity: 100, isGross: false, computed: compute(selected, 100) });
  },

  onQuantityInput(e) {
    const quantity = Number(e.detail.value || 0);
    this.setData({ quantity, computed: compute(this.data.selected, quantity) });
  },

  onToggleGross() {
    this.setData({ isGross: !this.data.isGross });
  },

  async onConfirm() {
    const f = this.data.selected;
    const q = Number(this.data.quantity);
    if (!f) return fmt.toast('请先选择食物');
    if (!q || q <= 0) return fmt.toast('请输入分量');
    try {
      await recordApi.createRecord({
        recordDate: this.data.date,
        mealType: this.data.mealType,
        foodId: f.id,
        quantity: this.data.isGross ? undefined : q,
        grossQuantity: this.data.isGross ? q : undefined,
        addMethod: 1
      });
      getApp().globalData.refreshHome = true;
      fmt.toast('已添加', 'success');
      setTimeout(() => wx.navigateBack(), 350);
    } catch (e) {
      fmt.showError(e, '添加失败');
    }
  },

  onGoCustom() {
    wx.navigateTo({ url: `/pages/custom-food/custom-food?date=${this.data.date}&mealType=${this.data.mealType}&keyword=${encodeURIComponent(this.data.keyword || '')}` });
  }
});
