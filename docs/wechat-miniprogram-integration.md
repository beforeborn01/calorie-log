# 微信小程序接入记录（已从 web-view 方案切换为原生版）

最后更新：2026-06-01

> 历史说明：本文件最初记录的是 `<web-view>` 套壳方案。由于当前小程序为个人主体，微信不开放内嵌网页能力，套壳方案已废弃。
>
> 当前实现以 `calorie-log-miniprogram/` 为原生 WXML / WXSS / JS 小程序，不再使用 `<web-view>`，最新迁移状态见 [`web-to-miniprogram-migration.md`](web-to-miniprogram-migration.md)。

---

## 当前有效方案

- 小程序形态：原生微信小程序。
- 前端目录：`calorie-log-miniprogram/`。
- 后端目录：`calorie-log-server/`。
- API：继续复用 `/api/v1/*`。
- 登录：`wx.login()` → `POST /api/v1/auth/wechat/miniprogram`。
- 域名配置：只需要在微信公众平台配置「服务器域名 → request 合法域名」为 `https://bcappandgame.com`。
- 不需要、也不能依赖「业务域名」和 `<web-view>`。

---

## 已完成代码

| 模块 | 说明 |
|---|---|
| `app.json` | 原生 pages + TabBar：首页 / 记录 / 运动 / 我的 |
| `config/env.js` | 后端域名和 feature flags |
| `utils/request.js` | `wx.request` 封装、token 注入、401 refresh |
| `utils/storage.js` | token/profile 持久化，兼容旧壳 key |
| `services/*.js` | auth、record、food、goal、statistics、reports、body、training、social、settings API 封装 |
| `pages/login` | 微信一键登录 |
| `pages/home` + `pages/add-food` + `pages/custom-food` | 饮食记录主闭环 |
| `pages/training-*` | 运动速记、计划、运动中、历史、统计 |
| `pages/social-*` | 好友、排行榜 |

---

## 上线检查

1. ECS `.env` 配好：`WECHAT_MA_APP_ID` / `WECHAT_MA_APP_SECRET` / `JWT_SECRET` / 数据库密码。
2. `https://bcappandgame.com` 可访问且后端健康。
3. 微信公众平台配置 request 合法域名：`https://bcappandgame.com`。
4. 微信开发者工具导入 `calorie-log-miniprogram/`。
5. 真机跑通：登录 → 建档 → 添加食物 → 首页刷新 → 运动速记。

