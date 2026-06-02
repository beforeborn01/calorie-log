const foodApi = require('../../services/food');
const recordApi = require('../../services/record');
const dateUtil = require('../../utils/date');
const fmt = require('../../utils/format');

const CATEGORY_OPTIONS = ['谷薯主食', '肉禽蛋水产', '蔬菜', '水果', '豆类', '奶及奶制品', '坚果', '油脂调味', '零食饮料', '其他'];

Page({
  data: {
    date: dateUtil.today(),
    mealType: 1,
    categoryOptions: CATEGORY_OPTIONS,
    categoryIndex: -1,
    isHardToWeigh: false,
    saving: false,
    form: {
      name: '', alias: '', calories: '', protein: '', carbohydrate: '', fat: '', logQuantity: ''
    }
  },

  onLoad(options) {
    this.setData({
      date: options && options.date ? options.date : dateUtil.today(),
      mealType: Number(options && options.mealType ? options.mealType : 1),
      'form.name': options && options.keyword ? decodeURIComponent(options.keyword) : ''
    });
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`form.${field}`]: e.detail.value });
  },

  onCategoryChange(e) {
    this.setData({ categoryIndex: Number(e.detail.value) });
  },

  onHardChange(e) {
    this.setData({ isHardToWeigh: !!e.detail.value });
  },

  async onSubmit() {
    const f = this.data.form;
    if (!String(f.name || '').trim()) return fmt.toast('请填写食物名称');
    if (!Number(f.calories)) return fmt.toast('请填写每100g热量');
    this.setData({ saving: true });
    try {
      const food = await foodApi.createCustomFood({
        name: String(f.name).trim(),
        alias: String(f.alias || '').trim() || undefined,
        category: this.data.categoryIndex >= 0 ? CATEGORY_OPTIONS[this.data.categoryIndex] : undefined,
        calories: Number(f.calories),
        protein: f.protein === '' ? undefined : Number(f.protein),
        carbohydrate: f.carbohydrate === '' ? undefined : Number(f.carbohydrate),
        fat: f.fat === '' ? undefined : Number(f.fat),
        isHardToWeigh: this.data.isHardToWeigh
      });
      const q = Number(f.logQuantity || 0);
      if (q > 0) {
        await recordApi.createRecord({
          recordDate: this.data.date,
          mealType: this.data.mealType,
          foodId: food.id,
          quantity: q,
          addMethod: 2
        });
        getApp().globalData.refreshHome = true;
        fmt.toast('已补录并记录', 'success');
        setTimeout(() => wx.navigateBack({ delta: 2 }), 350);
      } else {
        fmt.toast('已补录到食物库', 'success');
        setTimeout(() => wx.navigateBack(), 350);
      }
    } catch (e) {
      fmt.showError(e, '补录失败');
    } finally {
      this.setData({ saving: false });
    }
  }
});
