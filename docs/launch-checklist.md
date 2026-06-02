# 上线功能开关清单

记录上线时**有意关闭 / 未放出**的功能，以及后续打开它们需要做什么。

主开关位于 `calorie-log-web/src/config/features.ts`。菜单按 flag 过滤；**路由仍然保留**，灰度时直链可打开。

---

## 已关闭的菜单项

### `aiRecognize` — 拍照识别 (`/recognize`)

- **关闭原因**：后端走 `MockFoodRecognitionService`，按图片 hash 返回写死的候选；未配置百度 AI 凭据。
- **代码位置**：
  - 菜单注册：`calorie-log-web/src/layout/AppLayout.tsx` `NAV_ALL`
  - 页面：`calorie-log-web/src/pages/ai/RecognizePage.tsx`
  - 服务端 mock：`calorie-log-server/src/main/java/com/calorielog/module/ai/service/MockFoodRecognitionService.java`
- **重开条件**：
  1. 申请百度 AI 开放平台「菜品识别」接口凭据，填入 `.env.prod`：`BAIDU_AI_API_KEY` / `BAIDU_AI_SECRET_KEY`
  2. 实现真实 `FoodRecognitionService`（目前只有 Mock 实现）
  3. 验证 mock 标记不再返回，删除 `RecognizePage.tsx` 内 `result?.mocked` 那个 Tag
  4. 将 `features.ts` 中 `aiRecognize` 改为 `true`

### `aiCooking` — 烹饪推荐 (`/cooking`)

- **关闭原因**：后端走 `MockCookingSuggestionService`，按食材类别匹配静态方法库；未接入 LLM。
- **代码位置**：
  - 页面：`calorie-log-web/src/pages/ai/CookingPage.tsx`（页面 Alert 自己也写明"开发环境使用静态兜底数据"）
  - 服务端 mock：`calorie-log-server/src/main/java/com/calorielog/module/ai/service/MockCookingSuggestionService.java`
  - LLM 配置：`calorie-log-server/src/main/java/com/calorielog/module/ai/llm/LlmConfig.java`（豆包 client 已有，缺凭据）
- **重开条件**：
  1. 配置豆包（或其它 LLM）endpoint / api key / model 到 `.env.prod`
  2. 接入真实 `CookingSuggestionService`（基于 LLM）
  3. 移除 `CookingPage.tsx` 底部"开发环境使用静态兜底数据"的 Alert 文案
  4. 将 `features.ts` 中 `aiCooking` 改为 `true`

### `aiFavorites` — 烹饪收藏 (`/favorites`)

- **关闭原因**：本身可用，但唯一入口是 `/cooking`。`aiCooking` 关着的时候，`/favorites` 只会是一个永远空的页面。
- **重开条件**：与 `aiCooking` 一起开启。

---

## 上线阻断项（不归 feature flag 管，必须处理）

### 验证码（灰度期已知风险）

- **现状**：`calorie-log-server/src/main/java/com/calorielog/module/user/service/VerifyCodeService.java` 仍带 `TODO: integrate with SmsService / MailService`；commit `e82510a` 显式说明 prod 启用了固定验证码 `123456`。
- **影响**：任意手机号 + `123456` 即可登录任意账号。
- **本次决定（灰度阶段）**：保持现状，靠灰度名单收敛风险面，不公开放量。
- **本次已收尾**：登录/注册/找回密码页面的 `测试码: xxxxxx` toast 已移除。
- **正式放量前必做**：接入真实短信（火山云 SMS，`.env.prod.example` 有 `VOLC_SMS_*` 占位），或临时隐藏验证码登录 tab 只保留密码登录。

### 网页版微信扫码登录（已下线）

- **现状**：H5 网页扫码登录入口、二维码轮询接口和 mock 确认接口已移除。
- **保留项**：`WechatOAuthService` 只保留小程序 `wx.login → code2Session` 能力。
- **原因**：当前小程序采用原生实现，不再依赖 web-view；网页扫码登录也不是小程序上线前置条件。

---

## PRD 中已写但 v1 不实现

### 条码扫描（PRD Phase 3）

- 数据库与后端 `Food.barcode` / `findByBarcode` 已有，前端**无入口**。
- 决定：v1 不实现。后续要做时新建任务，不视为 bug。

---

## 力量训练 → 运动管理（已重构）

- 老 `/strength`：按动作快记一组组数，写 `t_strength_record`，**不计入卡路里**。
- 新 `/training/plans`：完整计划-会话-统计闭环，写 `t_workout_session+`，计入卡路里。
- 上线动作：
  - 前端 `/strength` 重构为「运动速记」表单 → 调 `POST /training/sessions` 写一个 `status=completed, source=quick_form` 的 mini-session。**与计划数据互通、自动计入今日运动消耗**。
  - 后端 `GET /training/sessions?date=` 加按日过滤，供运动速记列表使用。
  - 菜单分组：侧栏新增二级菜单「运动管理」 → 运动速记 / 计划 / 历史 / 统计。
  - UI 文案：用户可见的"训练"统一改为"运动"（代码模块名 training/、API 路径 /training/*、PRD、CLAUDE.md 不动）。
- 遗留：
  - **老 `t_strength_record` 表**：写入接口仍在（`/api/v1/strength/records`），但前端已不再调用。下个版本可清理控制器/DTO/Mapper，再下下版本 drop 表。
  - **周月报告**（`PeriodReportService.java:114-118`）仍读 `t_strength_record`，新数据不反映在那里。下个 release 改为读新表。
  - 老数据：按用户决定，**不迁移、不显示**。

---

## 微信小程序上线（原生版首次发布）

### 项目固定信息

- AppID：`wx817fc1d01ac853c7`（已写入 `calorie-log-miniprogram/project.config.json`）
- 生产域名：`https://bcappandgame.com`
- 后端宿主：ECS 自部署，`docker-compose.prod.yml`
- 小程序形态：**原生 WXML / WXSS / JS**，不再使用 `<web-view>`。

### 已完成（本仓库已就绪）

- `calorie-log-miniprogram/` 已由 web-view 壳改为原生小程序。
- `app.json` 已配置底部 Tab：首页 / 记录 / 运动 / 我的。
- 已接入 `wx.login` → `/api/v1/auth/wechat/miniprogram`。
- 已封装 `wx.request`、token refresh、storage、service 层。
- 已原生化饮食记录主链路、目标、统计、体重、运动、社交、设置等页面；完善资料页支持微信头像选择与昵称建议；设置页支持提醒配置、当前用户绑定/换绑手机号、修改密码；图表类页面采用轻量卡片/列表/柱状趋势展示。

### 待人工操作（按顺序）

1. **ECS 上配 `.env`**：复制 `.env.prod.example` → `.env`，必填：
   - `DOMAIN=bcappandgame.com`
   - `POSTGRES_PASSWORD` / `REDIS_PASSWORD` / `JWT_SECRET`
   - `WECHAT_MA_APP_ID=wx817fc1d01ac853c7`
   - `WECHAT_MA_APP_SECRET=<去微信公众平台拿>`
2. **DNS + 端口**：A 记录 `bcappandgame.com → ECS 公网 IP`；安全组放行 80 / 443。
3. **起服务 + HTTPS**：`docker compose -f docker-compose.prod.yml up -d --build`，并用 `scripts/setup-ssl.sh` 签发/续签证书。头像文件会落到 `app-uploads` Docker volume。
4. **健康检查**：
   - `curl -I https://bcappandgame.com` → 200
   - `curl https://bcappandgame.com/actuator/health` → `{"status":"UP"}`
5. **微信公众平台 → 开发 → 开发管理 → 开发设置**：
   - 只需配置「服务器域名 → request 合法域名」：`https://bcappandgame.com`。
   - 原生版**不需要**配置「业务域名」，也不依赖 web-view。
6. **微信开发者工具**：导入 `calorie-log-miniprogram/`，编译运行，测试「微信一键登录 → 建档 → 首页」。
7. **真机预览**：安卓 + iOS 跑通核心链路：饮食记录、目标、统计、体重、运动速记。
8. **提交审核**：类目建议「工具 / 效率管理」，文案避免医疗/治疗承诺；页面保留“仅供个人参考，不构成医疗意见”的表述。

### 常见卡点

| 现象 | 多半原因 |
|---|---|
| 登录卡转圈 / “网络异常” | request 合法域名没配，或 ECS 443 没开 |
| 后端日志 `wechat.ma.app-id 未配置` | `.env` 缺 `WECHAT_MA_APP_ID/SECRET` |
| 模拟器请求被拦 | 开发者工具 → 详情 → 本地设置 → 勾“ 不校验合法域名 ”（仅调试期） |
| 页面字段保存失败 | 先看后端 `Result.message`，大概率是资料未完善或参数校验失败 |

## 重要发现：个人主体小程序不能 web-view

**时间**：2026-06-01。

**事实**：微信官方文档 [domain.html](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/domain.html) 明确：
> "目前小程序内嵌网页能力暂不开放给个人类型账号和小游戏账号。"

**影响**：当前 `wx817fc1d01ac853c7` 是个人主体小程序，**业务域名入口在公众平台不可见**，**web-view 套壳方案不可执行**。本仓库的 `calorie-log-miniprogram/` 壳工程因此无法上线。

**应对路线（已选择）**：

| 路线 | 工作量 | 成本 | 何时回归小程序 |
|---|---|---|---|
| **A. 升级个体工商户主体** | 注册电子营业执照 + 微信主体变更 | ¥300/年微信认证费 | 完成后业务域名直接可配，**代码 0 改动** |
| **B. 只发 H5** | 0 | 0 | 不发小程序，纯 `https://bcappandgame.com` H5 + 可选公众号入口 |
| **C. 原生小程序重写（当前路线）** | 2-3 周全职 | 0 | 无需主体升级（不用 web-view）；已在 `calorie-log-miniprogram/` 落地 |

**当前选择**：C 已启动并落地为原生小程序（非 Taro），详见 [docs/web-to-miniprogram-migration.md](web-to-miniprogram-migration.md)。

---

## 2026-06-01 转写前盘点（ABCDE 已完成）

为了让"H5 能稳定灰度 + 万一启动 Taro 重写时不带债"，做了一轮清理：

| 项 | 改动 |
|---|---|
| **A** | nginx 容器 healthcheck 假阳性修复：80 server 加 `/healthz` 不被 redirect，docker-compose healthcheck 改用此端点 |
| **B** | 周月报告（`PeriodReportService`）的"力量运动"数据源从老表 `t_strength_record` 切到新表 `t_workout_session + t_exercise_session + t_completed_set`；新增 `countTrainingDaysInRange / aggregateVolumeInRange` mapper 方法，按 `sessionDay()` 归属日（end_time 优先回退 start_time）聚合 |
| **C** | 删 H5 网页扫码登录：前端 `LoginPage` 移除扫码按钮 + 二维码 Modal + 轮询逻辑；删 `src/api/wechat.ts`；后端 `AuthController` 移除 `/wechat`、`/wechat/qrcode`、`/wechat/poll`、`/wechat/mock-confirm`；删 `WechatQrLoginService` / `WechatPollResponse` / `WechatQrCodeResponse` / `WechatLoginRequest` / `WechatLoginResponse`；`WechatOAuthService.exchangeCode()` 移除（公众号 OAuth TODO 一并清掉，剩 `miniprogramCode2Session` 给小程序用） |
| **D** | 新增/更新 [docs/web-to-miniprogram-migration.md](web-to-miniprogram-migration.md) —— 原生小程序转写状态、复用边界、后续建议 |
| **E** | 本文档增补「个人主体限制」+「ABCDE 完成项」两节 |

### 还遗留的事

- **验证码 123456**：本次按用户决定**保持不变**。正式放量前必修。
- **老 `t_strength_record` 表**：写入接口仍在（`/api/v1/strength/records`），但前端不再调用，新数据全部走 `t_workout_session`。下个版本可删 controller/DTO/Mapper，再下下版本 drop 表。
- **AntD 4 个 deprecated 警告**：`direction / valueStyle / destroyOnClose / Cell` 等，跟随 antd 6 升级带来的，不影响功能。要做就批量改一次。
- **`calorie-log-miniprogram/`**：已从 web-view 壳改为原生小程序；旧 `pages/index` web-view 已移除。

