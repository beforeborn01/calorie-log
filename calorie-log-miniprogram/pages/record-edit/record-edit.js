const recordApi = require('../../services/record');
const fmt = require('../../utils/format');

Page({
  data: {
    record: null,
    mealOptions: ['早餐', '午餐', '晚餐', '加餐'],
    form: {
      foodName: '',
      mealType: 1,
      quantity: '',
      grossQuantity: '',
      calories: '',
      protein: '',
      carbohydrate: '',
      fat: ''
    },
    saving: false
  },

  onLoad() {
    const r = wx.getStorageSync('clog_edit_record');
    if (!r || !r.id) {
      fmt.toast('未找到记录');
      wx.navigateBack();
      return;
    }
    this.setData({
      record: r,
      form: {
        foodName: r.foodName || '',
        mealType: Number(r.mealType || 1),
        quantity: r.quantity == null ? '' : String(r.quantity),
        grossQuantity: r.grossQuantity == null ? '' : String(r.grossQuantity),
        calories: r.calories == null ? '' : String(r.calories),
        protein: r.protein == null ? '' : String(r.protein),
        carbohydrate: r.carbohydrate == null ? '' : String(r.carbohydrate),
        fat: r.fat == null ? '' : String(r.fat)
      }
    });
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`form.${field}`]: e.detail.value });
  },

  onMealChange(e) {
    this.setData({ 'form.mealType': Number(e.detail.value) + 1 });
  },

  async onSubmit() {
    const r = this.data.record;
    const f = this.data.form;
    if (!f.foodName.trim()) return fmt.toast('请填写名称');
    if (!Number(f.quantity) && !Number(f.grossQuantity)) return fmt.toast('请填写净重或毛重');
    this.setData({ saving: true });
    try {
      await recordApi.updateRecord(r.id, {
        foodName: String(f.foodName).trim(),
        mealType: Number(f.mealType),
        quantity: f.quantity === '' ? undefined : Number(f.quantity),
        grossQuantity: f.grossQuantity === '' ? undefined : Number(f.grossQuantity),
        calories: f.calories === '' ? undefined : Number(f.calories),
        protein: f.protein === '' ? undefined : Number(f.protein),
        carbohydrate: f.carbohydrate === '' ? undefined : Number(f.carbohydrate),
        fat: f.fat === '' ? undefined : Number(f.fat)
      });
      getApp().globalData.refreshHome = true;
      fmt.toast('已保存', 'success');
      setTimeout(() => wx.navigateBack(), 350);
    } catch (e) {
      fmt.showError(e, '保存失败');
    } finally {
      this.setData({ saving: false });
    }
  },

  onDelete() {
    const r = this.data.record;
    wx.showModal({
      title: '删除记录？',
      content: r.foodName,
      confirmColor: '#B0413E',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await recordApi.deleteRecord(r.id);
          getApp().globalData.refreshHome = true;
          fmt.toast('已删除', 'success');
          setTimeout(() => wx.navigateBack(), 350);
        } catch (e) {
          fmt.showError(e, '删除失败');
        }
      }
    });
  }
});
