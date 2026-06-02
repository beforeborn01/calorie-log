# Web → 原生微信小程序迁移记录

最后更新：2026-06-01

由于当前小程序为**个人主体**，不能使用 `<web-view>` 内嵌 H5，原先 `calorie-log-miniprogram/` 的壳工程已废弃。现在采用**原生小程序 WXML / WXSS / JS** 复刻核心业务；后端 `calorie-log-server/` 继续复用同一套 `/api/v1/*` 接口。

---

## 当前结论

- 不再使用 `<web-view>`，也不需要配置「业务域名」。
- 小程序后台仍需配置「服务器域名 → request 合法域名」：`https://bcappandgame.com`。
- 登录继续走 `wx.login()` → `POST /api/v1/auth/wechat/miniprogram`。
- Web 端继续保留；小程序端是独立原生实现，二者共享后端和数据。

---

## 已完成的原生小程序改造

### 1. 基础设施

| 模块 | 文件 |
|---|---|
| 运行配置 | `calorie-log-miniprogram/config/env.js` |
| token / profile storage | `utils/storage.js` |
| request 封装、401 refresh、X-Timezone | `utils/request.js` |
| 登录守卫 | `utils/authGuard.js` |
| 日期 / 格式化工具 | `utils/date.js`, `utils/format.js` |
| API service 层 | `services/*.js` |
| 全局样式系统 | `app.wxss` |
| 基础组件 | `components/cl-card`, `components/cl-empty`, `components/cl-stat` |

### 2. 页面与功能

| 功能 | 小程序页面 | 状态 |
|---|---|---|
| 微信一键登录 | `pages/login/login` | 已原生化 |
| 完善 / 编辑资料 | `pages/profile-setup/profile-setup` | 已原生化，支持微信头像选择与昵称建议 |
| 首页饮食闭环 | `pages/home/home` | 已原生化 |
| 添加食物 | `pages/add-food/add-food` | 已原生化 |
| 自定义食物 | `pages/custom-food/custom-food` | 已原生化 |
| 编辑饮食记录 | `pages/record-edit/record-edit` | 已原生化 |
| 历史记录 | `pages/history/history` | 已原生化 |
| 目标设置 | `pages/goal/goal` | 已原生化 |
| 每日统计 | `pages/statistics/statistics` | 已原生化，图表先降级为卡片/列表 |
| 周月报告 | `pages/reports/reports` | 已原生化，含轻量柱状趋势 |
| 体重体脂 | `pages/body/body` | 已原生化，含轻量体重趋势 |
| 我的 | `pages/profile/profile` | 已原生化 |
| 设置 | `pages/settings/settings` | 已原生化，含提醒设置、当前用户绑定/换绑手机号、修改密码 |
| 运动速记 | `pages/training-quick/training-quick` | 已原生化 |
| 运动计划 | `pages/training-plans/training-plans` | 已原生化：多动作创建/编辑/排序、开始、删除、继续活跃会话 |
| 运动中 | `pages/training-active/training-active` | 已原生化简版：组编辑/完成/保存/结束/放弃 |
| 运动历史 | `pages/training-sessions/training-sessions` | 已原生化 |
| 运动统计 | `pages/training-stats/training-stats` | 已原生化 |
| 好友 | `pages/social-friends/social-friends` | 已原生化 |
| 排行榜 | `pages/social-ranking/social-ranking` | 已原生化 |

### 3. 导航结构

原 Web 侧栏改为小程序底部 Tab：

1. 首页：`pages/home/home`
2. 记录：`pages/history/history`
3. 运动：`pages/training-quick/training-quick`
4. 我的：`pages/profile/profile`

其它页面用 `wx.navigateTo` 进入。

---

## 与 Web 版的差异 / 取舍

| Web 实现 | 小程序原生处理 |
|---|---|
| AntD 组件 | 原生 `view/input/picker/switch/button` + WXSS 卡片风格 |
| React Router | `app.json` pages + `wx.navigateTo/switchTab/redirectTo` |
| Zustand | 页面 `data` + `app.globalData` + `wxStorage` |
| AddFoodModal | 独立添加食物页面 |
| Recharts | 原生轻量卡片/列表/柱状趋势；后续如需更复杂交互可接 ECharts/canvas |
| 桌面侧栏 | 底部 Tab + 我的页功能入口 |
| Ctrl/Cmd+K | 首页悬浮「+」按钮 |
| web-view token 注入 | 原生 `wx.login` 登录后 token 写入小程序 storage |

---

## 头像昵称能力

微信一键登录只用于拿 openid/unionid；头像昵称不做静默获取。原生版在完善资料页接入：

- `button open-type="chooseAvatar"`：用户主动选择微信头像；
- `input type="nickname"`：唤起微信昵称建议；
- `POST /api/v1/users/avatar`：上传头像到后端并保存长期 URL。

头像文件保存在后端 `/app/uploads/avatars`，Docker Compose 使用 `app-uploads` volume 持久化。

## 后续建议

1. 用微信开发者工具打开 `calorie-log-miniprogram/` 做编译检查。
2. 在小程序后台配置 request 合法域名：`https://bcappandgame.com`。
3. 真机验证：登录 → 建档 → 添加食物 → 首页刷新 → 目标/统计/体重/运动速记。
4. 若统计体验需要增强，再引入 ECharts 小程序版或 canvas 自绘趋势图。
5. 若运动计划还要完全对齐 Web，可继续补动作搜索分页、更多模板与拖拽手势；当前已支持多动作编辑和上下排序。

