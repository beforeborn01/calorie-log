const authGuard = require('../../utils/authGuard');
const fmt = require('../../utils/format');
const settings = require('../../services/settings');
const auth = require('../../services/auth');
const storage = require('../../utils/storage');

const FREQ = ['daily', 'weekday', 'weekend'];
const FREQ_LABELS = ['每天', '工作日', '周末'];

Page({
  data: {
    loading: false,
    saving: false,
    setting: null,
    profile: null,
    freqLabels: FREQ_LABELS,
    freqIndex: 0,
    phoneBind: { phone: '', verifyCode: '' },
    sendingCode: false,
    bindingPhone: false,
    password: { oldPassword: '', newPassword: '' },
    changing: false
  },

  onLoad() {
    authGuard.ensureToken();
    this.load();
  },

  async load() {
    this.setData({ loading: true });
    try {
      const [setting, profile] = await Promise.all([
        settings.getNotificationSetting(),
        auth.getProfile().catch(() => null)
      ]);
      this.setData({
        setting,
        profile,
        freqIndex: Math.max(0, FREQ.indexOf(setting.frequency || 'daily')),
        'phoneBind.phone': profile && profile.phone ? profile.phone : this.data.phoneBind.phone
      });
    } catch (e) {
      fmt.showError(e, '加载设置失败');
    } finally {
      this.setData({ loading: false });
    }
  },

  onSwitch(e) { this.setData({ [`setting.${e.currentTarget.dataset.field}`]: !!e.detail.value }); },
  onTime(e) { this.setData({ [`setting.${e.currentTarget.dataset.field}`]: e.detail.value }); },
  onFreq(e) { const idx = Number(e.detail.value); this.setData({ freqIndex: idx, 'setting.frequency': FREQ[idx] }); },
  onPwdInput(e) { this.setData({ [`password.${e.currentTarget.dataset.field}`]: e.detail.value }); },
  onBindInput(e) { this.setData({ [`phoneBind.${e.currentTarget.dataset.field}`]: e.detail.value }); },

  async onSave() {
    this.setData({ saving: true });
    try {
      await settings.saveNotificationSetting(this.data.setting);
      fmt.toast('已保存', 'success');
    } catch (e) {
      fmt.showError(e, '保存失败');
    } finally {
      this.setData({ saving: false });
    }
  },

  async onSendBindCode() {
    const phone = String(this.data.phoneBind.phone || '').trim();
    if (!/^1\d{10}$/.test(phone)) return fmt.toast('请输入正确手机号');
    this.setData({ sendingCode: true });
    try {
      await auth.sendCode(phone, 'wechat_bind');
      fmt.toast('验证码已发送', 'success');
    } catch (e) {
      fmt.showError(e, '发送失败');
    } finally {
      this.setData({ sendingCode: false });
    }
  },

  async onBindPhone() {
    const phone = String(this.data.phoneBind.phone || '').trim();
    const verifyCode = String(this.data.phoneBind.verifyCode || '').trim();
    if (!/^1\d{10}$/.test(phone)) return fmt.toast('请输入正确手机号');
    if (!verifyCode) return fmt.toast('请输入验证码');
    this.setData({ bindingPhone: true });
    try {
      await auth.bindCurrentPhone(phone, verifyCode);
      storage.remove(storage.NEED_BIND_PHONE_KEY);
      fmt.toast('手机号已绑定', 'success');
      this.setData({ 'phoneBind.verifyCode': '' });
      this.load();
    } catch (e) {
      fmt.showError(e, '绑定失败');
    } finally {
      this.setData({ bindingPhone: false });
    }
  },

  async onChangePassword() {
    const p = this.data.password;
    if (!p.oldPassword || !p.newPassword) return fmt.toast('请填写原密码和新密码');
    this.setData({ changing: true });
    try {
      await settings.changePassword(p.oldPassword, p.newPassword);
      storage.clearAll();
      fmt.toast('密码已修改，请重新登录', 'success');
      wx.reLaunch({ url: '/pages/login/login?from=logout' });
    } catch (e) {
      fmt.showError(e, '修改失败');
    } finally {
      this.setData({ changing: false });
    }
  }
});
