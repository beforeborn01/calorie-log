const authGuard = require('../../utils/authGuard');
const fmt = require('../../utils/format');
const social = require('../../services/social');

Page({
  data: {
    friends: [],
    requests: [],
    phone: '',
    searchResult: null,
    requestMessage: '',
    loading: false
  },
  onLoad() { authGuard.ensureToken(); this.load(); },
  async load() {
    this.setData({ loading: true });
    try {
      const [friends, requests] = await Promise.all([social.listFriends().catch(() => []), social.listFriendRequests('incoming').catch(() => [])]);
      this.setData({ friends, requests });
    } catch (e) { fmt.showError(e, '加载好友失败'); }
    finally { this.setData({ loading: false }); }
  },
  onInput(e) { this.setData({ [e.currentTarget.dataset.field]: e.detail.value }); },
  async onSearch() {
    const phone = String(this.data.phone || '').trim();
    if (!phone) return fmt.toast('请输入手机号');
    try { const searchResult = await social.searchUser(phone); this.setData({ searchResult }); }
    catch (e) { fmt.showError(e, '搜索失败'); }
  },
  async onSendRequest() {
    const r = this.data.searchResult;
    if (!r || !r.userId) return;
    try { await social.sendFriendRequest(r.userId, this.data.requestMessage); fmt.toast('已发送申请', 'success'); this.setData({ searchResult: null, requestMessage: '' }); this.load(); }
    catch (e) { fmt.showError(e, '发送失败'); }
  },
  onHandle(e) {
    const id = e.currentTarget.dataset.id;
    const action = e.currentTarget.dataset.action;
    wx.showModal({ title: action === 'accept' ? '接受好友申请？' : '拒绝好友申请？', success: async (res) => {
      if (!res.confirm) return;
      try { await social.handleFriendRequest(id, action); fmt.toast('已处理', 'success'); this.load(); }
      catch (err) { fmt.showError(err, '处理失败'); }
    }});
  },
  onDeleteFriend(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({ title: '删除好友？', confirmColor: '#B0413E', success: async (res) => {
      if (!res.confirm) return;
      try { await social.deleteFriend(id); fmt.toast('已删除', 'success'); this.load(); }
      catch (err) { fmt.showError(err, '删除失败'); }
    }});
  }
});
