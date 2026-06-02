# 训练页小程序实现记录（原生版）

最后更新：2026-06-01

> 历史说明：本文件最初记录训练页在 web-view 套壳中的体验问题。当前个人主体小程序不能使用 web-view，训练页已改为原生页面。

---

## 当前原生页面

| 功能 | 页面 |
|---|---|
| 运动速记 | `calorie-log-miniprogram/pages/training-quick/training-quick` |
| 运动计划 | `calorie-log-miniprogram/pages/training-plans/training-plans` |
| 运动中 | `calorie-log-miniprogram/pages/training-active/training-active` |
| 运动历史 | `calorie-log-miniprogram/pages/training-sessions/training-sessions` |
| 运动统计 / PR | `calorie-log-miniprogram/pages/training-stats/training-stats` |

---

## 当前处理策略

1. **计时器**：运动中页面使用 `startTime` 的绝对时间计算已训练时长，而不是依赖纯递增计数；切后台再回来会按当前时间重算。
2. **组数据保存**：完成组时自动保存；用户也可以手动点“保存”。
3. **结束训练**：结束前先保存当前 session，再调用 `/training/sessions/{id}/finish`，由后端计算总容量和 PR。
4. **放弃训练**：调用 `/training/sessions/{id}/abort`，后端状态统一写 `abandoned`。
5. **运动速记**：表单速记会创建 `status=completed, source=quick_form` 的训练会话，自动纳入当日运动消耗。

---

## 真机验证清单

- [ ] 运动速记：选择动作 → 填组数/次数/重量 → 保存 → 当日列表出现。
- [ ] 自定义动作：新建动作 → 保存速记 → 刷新后动作可复用。
- [ ] 运动计划：新建计划 → 开始运动 → 进入运动中页面。
- [ ] 运动中：修改 reps/weight → 完成组 → 自动保存。
- [ ] 切到微信后台 1 分钟后回来：计时仍正确。
- [ ] 结束运动：跳到历史页，统计页 PR / 训练次数更新。
- [ ] 放弃运动：记录状态为 abandoned，不计入完成统计。

