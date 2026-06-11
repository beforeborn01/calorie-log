const training = require('../../services/training');
const fmt = require('../../utils/format');

Component({
  properties: {
    show: { type: Boolean, value: false }
  },

  data: {
    loading: false,
    bodyParts: [],      // 目录树
    activeBodyIdx: 0,
    activeBody: null,    // 当前部位（含 subRegions/equipments）
    activeSubId: null,   // 当前小类 id（null=全部）
    activeEquip: '',     // 当前器械（''=全部）
    keyword: '',
    groups: [],          // [{equipment, items:[...]}]
    detailOpen: false,
    detail: null,
    _searchTimer: null,
    _loaded: false
  },

  observers: {
    show(val) {
      if (val && !this.data._loaded) this.loadCatalog();
    }
  },

  methods: {
    async loadCatalog() {
      this.setData({ loading: true });
      try {
        const cat = await training.catalogExercises();
        const bodyParts = (cat && cat.bodyParts) || [];
        this.setData({ bodyParts, _loaded: true });
        if (bodyParts.length) this.selectBodyByIndex(0);
      } catch (e) {
        fmt.showError(e, '加载动作库失败');
      } finally {
        this.setData({ loading: false });
      }
    },

    selectBodyByIndex(idx) {
      const body = this.data.bodyParts[idx];
      if (!body) return;
      this.setData({
        activeBodyIdx: idx,
        activeBody: body,
        activeSubId: null,
        activeEquip: '',
        keyword: ''
      });
      this.loadList();
    },

    onSelectBody(e) {
      this.selectBodyByIndex(Number(e.currentTarget.dataset.idx));
    },

    onSelectSub(e) {
      const id = Number(e.currentTarget.dataset.id);
      this.setData({ activeSubId: this.data.activeSubId === id ? null : id });
      this.loadList();
    },

    onSelectEquip(e) {
      const eq = e.currentTarget.dataset.equip || '';
      this.setData({ activeEquip: this.data.activeEquip === eq ? '' : eq });
      this.loadList();
    },

    onSearchInput(e) {
      const kw = e.detail.value || '';
      this.setData({ keyword: kw });
      if (this.data._searchTimer) clearTimeout(this.data._searchTimer);
      this.data._searchTimer = setTimeout(() => this.loadList(), 250);
    },

    async loadList() {
      const { activeBody, activeSubId, activeEquip, keyword } = this.data;
      if (!activeBody && !keyword) return;
      this.setData({ loading: true });
      try {
        const params = {};
        if (activeBody) params.bodyPart = activeBody.name;
        if (activeSubId) params.subRegionId = activeSubId;
        if (activeEquip) params.equipment = activeEquip;
        if (keyword) params.q = keyword;
        const items = (await training.filterExercises(params)) || [];
        this.setData({ groups: this.groupByEquip(items) });
      } catch (e) {
        fmt.showError(e, '加载动作失败');
      } finally {
        this.setData({ loading: false });
      }
    },

    groupByEquip(items) {
      const groups = [];
      let cur = null;
      items.forEach((it) => {
        const key = it.equipment || '其他';
        if (!cur || cur.equipment !== key) {
          cur = { equipment: key, items: [] };
          groups.push(cur);
        }
        cur.items.push(it);
      });
      return groups;
    },

    async onOpenDetail(e) {
      const id = Number(e.currentTarget.dataset.id);
      this.setData({ loading: true });
      try {
        const detail = await training.getExercise(id);
        this.setData({ detail, detailOpen: true });
      } catch (err) {
        fmt.showError(err, '加载详情失败');
      } finally {
        this.setData({ loading: false });
      }
    },

    closeDetail() {
      this.setData({ detailOpen: false, detail: null });
    },

    // 直接在列表行选中
    onPickRow(e) {
      const id = Number(e.currentTarget.dataset.id);
      const item = this.findItem(id);
      if (item) this.emitSelect(item);
    },

    // 详情面板里确认选中
    onPickFromDetail() {
      if (this.data.detail) this.emitSelect(this.data.detail);
    },

    findItem(id) {
      for (const g of this.data.groups) {
        const hit = g.items.find((x) => x.id === id);
        if (hit) return hit;
      }
      return null;
    },

    emitSelect(exercise) {
      this.triggerEvent('select', { exercise });
      this.setData({ detailOpen: false, detail: null });
      this.triggerEvent('close');
    },

    onClose() {
      this.triggerEvent('close');
    },

    noop() {}
  }
});
