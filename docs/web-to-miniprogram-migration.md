# Web → 微信小程序迁移指南

记录把现有 React web 端（`calorie-log-web/`）转换为小程序的关键决策、依赖兼容性、转换策略。

转换的触发条件：上线后决定接入小程序入口，且**完成主体升级**（个人主体小程序不允许 web-view，参考 `launch-checklist.md`）。

如果用户量始终走 H5 + 公众号链接就足够，这份文档不需要执行。

---

## 路线选择

| 路线 | 工作量 | 维护成本 | 推荐度 |
|---|---|---|---|
| Taro + NutUI-React-Taro + echarts-for-taro | ~2-3 周 | 单一代码库可同时出 web/小程序 | ★★★★ |
| 原生小程序（wxml/wxss/js） | ~3-4 周 | 与 web 双份维护 | ★ |
| Remax / Kbone | — | 框架已停更/官方 deprecated | ★ |
| uni-app | ~2-3 周 | 同 Taro 但 Vue 优先 | ★★ |

**推荐 Taro**。下面所有迁移条目都假定 Taro 路线。

---

## 能直接复用的层（约占 40%）

转写时这些**不动**或**改极少**：

| 模块 | 文件 | 复用方式 |
|---|---|---|
| API 调用层 | `src/api/*.ts` | 改底层 `apiGet/apiPost`（见下）后业务调用 0 改动 |
| Zustand store | `src/store/*.ts` | 直接拷过去，Taro 支持 React 生态 |
| TypeScript 类型 | `src/types/*.ts` | 直接拷过去 |
| dayjs / axios（业务调用） / 业务函数 | 散布于各页 | 纯 JS 逻辑，无 DOM 依赖 |
| 后端 (`calorie-log-server/`) | 整套 | 完全不需要动；同一份 API |

---

## 必须重写的层

### 1. UI 组件：antd → NutUI-React-Taro

`package.json` 里 `antd ^6.3.5` + `@ant-design/icons` 全部依赖 DOM，小程序里没有 DOM，**必须替换**。

| antd 组件 | NutUI-React-Taro 对应 | 注意点 |
|---|---|---|
| Button / SketchButton | Button | SketchButton 的 paper-and-ink 风格在 wxss 里复刻有限度 |
| Input / Input.Password | Input | 验证码 6 位 input 注意 maxlength |
| Form | Form | Taro Form 有自己的 validation；现有 antd Form rules 要重写 |
| Modal / Modal.confirm | Dialog | Form-in-Modal 模式建议改成**独立页面** |
| Drawer | Popup（带 placement） | mobile sidebar 用得多 |
| Select / DatePicker / TimePicker | Picker | 小程序 picker 是滚轮式，体验和 antd 完全不同 |
| Table | List + 自渲染 | 小程序无原生 Table |
| Tabs | Tabs | 类似 |
| Tag / Chip / Pill | Tag | sketch 风格难还原 |
| Tooltip / Popconfirm | Popover / Dialog | 移动端少用 |
| Avatar | Avatar | 一致 |
| Progress | Progress | 一致 |
| Spin / Loading | Loading | 一致 |
| Statistic | 自定义 | 用 Text 拼 |
| Empty | Empty | 一致 |

### 2. 图表：recharts → echarts-for-taro

| 用到 recharts 的页 | 文件 | 替换方案 |
|---|---|---|
| 周月报告 | `src/pages/reports/ReportsPage.tsx` | echarts-for-taro 折线图 |
| 每日统计 | `src/pages/statistics/StatisticsPage.tsx` | 同上 + Cell（已 deprecated 警告，迁移时一起处理） |
| 体重体脂 | `src/pages/body/BodyPage.tsx` | 双轴折线图 |
| ChartTheme | `src/components/ChartTheme.ts` | 重写为 echarts option |

### 3. 路由：react-router → app.json pages

| 当前 SPA route | 转 Taro 后 pages 目录 |
|---|---|
| `/` | `pages/home/index` |
| `/login` | `pages/login/index` |
| `/register` / `/reset-password` | `pages/auth-register/index` / `pages/auth-reset/index` |
| `/profile` / `/profile/setup` | `pages/profile/index` / `pages/profile-setup/index` |
| `/history` | `pages/history/index` |
| `/goal` | `pages/goal/index` |
| `/statistics` | `pages/statistics/index` |
| `/body` | `pages/body/index` |
| `/strength` | `pages/sport-quick/index`（运动速记） |
| `/training/plans` | `pages/sport-plans/index` |
| `/training/active/:sessionId` | `pages/sport-active/index?id=` |
| `/training/history` | `pages/sport-history/index` |
| `/training/stats` | `pages/sport-stats/index` |
| `/reports` | `pages/reports/index` |
| `/settings` | `pages/settings/index` |
| `/friends` / `/ranking` | `pages/friends/index` / `pages/ranking/index` |
| `/recognize` / `/cooking` / `/favorites` | 默认 feature flag 关闭，转写时一并跳过 |

所有 `useNavigate / useLocation / Link` 改为：
```js
import Taro from '@tarojs/taro'
Taro.navigateTo({ url: '/pages/xxx/index?id=123' })
Taro.redirectTo({ url: '...' })   // 不在历史栈
Taro.reLaunch({ url: '...' })     // 清栈
```

### 4. 网络层：axios → 双端 adapter

`src/api/client.ts` 当前用 axios。转写时：

- 抽出 `apiGet / apiPost / apiPut / apiDelete` 接口签名不动
- 底层实现两份：
  - `client.web.ts`：保留 axios
  - `client.taro.ts`：用 `Taro.request`，token 注入和 401 刷新逻辑搬过来
- 用 `process.env.TARO_ENV` 或构建期分支选实现

### 5. Storage：localStorage → Taro 包装

```ts
// storage.ts
export const storage = {
  get: (k) => /* TARO ? Taro.getStorageSync(k) : localStorage.getItem(k) */,
  set: (k, v) => ...,
  remove: (k) => ...,
}
```

业务侧（如 `tokenStore` in `client.ts`）改用这个抽象。

### 6. 全局快捷键

`AppLayout.tsx:95` 监听 `Ctrl/Cmd+K` 唤起添加食物——**小程序里删掉**。改用首页固定的"+"快捷按钮。

### 7. 设计系统降级

`DESIGN.md` 的纸感 / 钢笔风格在 wxss 里实现受限：

| 设计元素 | wxss 兼容性 | 处理 |
|---|---|---|
| `oklch()` 色值 | ❌ 不支持 | 全部换 hex / rgb |
| SVG `<filter>`（钢笔涂鸦） | ❌ web-view 才有 | 装饰元素移除，仅保留色调 |
| `backdrop-filter` | ❌ 部分不支持 | 改半透明背景 |
| `scribble-u` 涂鸦下划线 | ❌ 依赖 SVG | 改 border-bottom dashed |
| `1.5px dashed` 边框 | ✅ | 保留 |
| 圆角 / 阴影 | ✅ | 保留 |
| 自定义字体（hand / display） | ⚠️ | 字体文件需上传到 CDN，wxss 引用绝对 URL |

### 8. 弃用清单

| 删除项 | 原因 |
|---|---|
| `utils/wxBridge.ts` | web-view 套壳遗留；Taro 项目里直接用 `Taro.*` |
| `calorie-log-miniprogram/`（壳工程） | 转 Taro 后 wx 客户端从 Taro build 产物里来；旧壳废弃 |

---

## 后端不变项

转写小程序**不影响后端**：

- API 路径不变（`/api/v1/*`）
- HTTPS 域名不变（`https://bcappandgame.com`）
- 小程序登录走 `POST /api/v1/auth/wechat/miniprogram`（已配齐 `WECHAT_MA_APP_ID/SECRET`）
- 数据库表结构不变

---

## 工作流建议

1. **新建 `calorie-log-taro/` 目录**，独立于 web 工程
2. 用 `taro init` 选 React + TypeScript
3. 第一周：
   - 拷贝 `src/api/`、`src/store/`、`src/types/` 到 Taro 工程
   - 抽 `storage` / `client` 双端 adapter
   - 跑通登录页 + 首页（不带图表）
4. 第二周：把剩余 12 个核心页面按重要性逐个移植，UI 用 NutUI
5. 第三周：图表（reports/statistics/body）+ 联调 + 真机测试

---

## 相关文档

- [launch-checklist.md](launch-checklist.md) —— 上线开关、个人主体限制
- [DESIGN.md](../calorie-log-web/DESIGN.md) —— 现有设计规范
- [training-webview-miniprogram.md](training-webview-miniprogram.md) —— web-view 套壳实施记录（已废弃，因主体限制不可用）
