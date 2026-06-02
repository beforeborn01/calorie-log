const auth = require('../../services/auth');
const fmt = require('../../utils/format');

const GENDER_OPTIONS = ['未设置', '男', '女'];
const ACTIVITY_OPTIONS = fmt.ACTIVITY_LABELS;

Page({
  data: {
    loading: false,
    saving: false,
    uploadingAvatar: false,
    edit: false,
    displayAvatar: '',
    avatarTempPath: '',
    form: {
      nickname: '',
      avatarUrl: '',
      gender: 0,
      age: '',
      height: '',
      weight: '',
      activityLevel: 2,
      timezone: 'Asia/Shanghai'
    },
    genderOptions: GENDER_OPTIONS,
    activityOptions: ACTIVITY_OPTIONS
  },

  onLoad(options) {
    this.setData({ edit: options && options.edit === '1' });
    this.loadProfile();
  },

  async loadProfile() {
    this.setData({ loading: true });
    try {
      const p = await auth.getProfile();
      this.setData({
        displayAvatar: fmt.assetUrl(p.avatarUrl),
        avatarTempPath: '',
        form: {
          nickname: p.nickname || '',
          avatarUrl: p.avatarUrl || '',
          gender: p.gender == null ? 0 : p.gender,
          age: p.age || '',
          height: p.height || '',
          weight: p.weight || '',
          activityLevel: p.activityLevel || 2,
          timezone: p.timezone || 'Asia/Shanghai'
        }
      });
    } catch (e) {
      fmt.showError(e, '加载资料失败');
    } finally {
      this.setData({ loading: false });
    }
  },

  onChooseAvatar(e) {
    const avatarUrl = e && e.detail && e.detail.avatarUrl;
    if (!avatarUrl) return;
    this.setData({ displayAvatar: avatarUrl, avatarTempPath: avatarUrl });
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`form.${field}`]: e.detail.value });
  },

  onGenderChange(e) {
    this.setData({ 'form.gender': Number(e.detail.value) });
  },

  onActivityChange(e) {
    this.setData({ 'form.activityLevel': Number(e.detail.value) + 1 });
  },

  async onSubmit() {
    const f = this.data.form;
    if (!String(f.nickname || '').trim()) return fmt.toast('请填写昵称');
    if (!f.age || Number(f.age) <= 0) return fmt.toast('请填写年龄');
    if (!f.height || Number(f.height) <= 0) return fmt.toast('请填写身高');
    if (!f.weight || Number(f.weight) <= 0) return fmt.toast('请填写体重');
    this.setData({ saving: true });
    try {
      let avatarUrl = f.avatarUrl || '';
      if (this.data.avatarTempPath) {
        this.setData({ uploadingAvatar: true });
        const profileWithAvatar = await auth.uploadAvatar(this.data.avatarTempPath);
        avatarUrl = profileWithAvatar.avatarUrl || avatarUrl;
        this.setData({ uploadingAvatar: false, avatarTempPath: '', displayAvatar: fmt.assetUrl(avatarUrl) });
      }
      await auth.updateProfile({
        nickname: String(f.nickname).trim(),
        avatarUrl: avatarUrl || undefined,
        gender: Number(f.gender),
        age: Number(f.age),
        height: Number(f.height),
        weight: Number(f.weight),
        activityLevel: Number(f.activityLevel),
        timezone: f.timezone || 'Asia/Shanghai'
      });
      fmt.toast('资料已保存', 'success');
      if (this.data.edit) wx.navigateBack();
      else wx.switchTab({ url: '/pages/home/home' });
    } catch (e) {
      this.setData({ uploadingAvatar: false });
      fmt.showError(e, '保存失败');
    } finally {
      this.setData({ saving: false });
    }
  }
});
