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

### 网页版微信扫码登录（灰度期保持现状）

- **现状**：`WechatOAuthService.java:52` 仍有 `TODO: 集成 WxJava 公众号 OAuth`。未配置 `WECHAT_APP_ID` 时走 mock，UI 会出现"Dev 模式 · 模拟扫码确认"。
- **本次决定**：暂不处理。生产环境若配齐 `WECHAT_APP_ID`，会避开 dev 文案；若没配，需要后续选择「补完 WxJava 集成」或「移除网页扫码按钮」。
- **代码位置**：`calorie-log-web/src/pages/auth/LoginPage.tsx` 第 184-197 行。

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

## 微信小程序上线（首次发布）

### 项目固定信息

- AppID：`wx817fc1d01ac853c7`（已写入 `calorie-log-miniprogram/project.config.json`）
- 生产域名：`https://bcappandgame.com`（已写入 `calorie-log-miniprogram/app.js` 的 `baseUrl`）
- 后端宿主：ECS 自部署，`docker-compose.prod.yml`
- HTTPS：`scripts/setup-ssl.sh issue --domain bcappandgame.com --email <你邮箱>`，证书放在 `./ssl/live/`

### 已完成（本仓库已就绪）

- `project.config.json` 填好 AppID
- `app.js` 填好 baseUrl
- 登录页占位的「用户协议 / 隐私政策」按钮已隐藏（避免审核驳回；正式文案补齐后在 `pages/login/login.wxml` 恢复 `terms` 块）

### 待人工操作（按顺序）

1. **ECS 上配 `.env`**：复制 `.env.prod.example` → `.env`，**必填**：
   - `DOMAIN=bcappandgame.com`
   - `POSTGRES_PASSWORD` / `REDIS_PASSWORD` / `JWT_SECRET`（强密码、至少 64 字符）
   - `WECHAT_MA_APP_ID=wx817fc1d01ac853c7`
   - `WECHAT_MA_APP_SECRET=<去微信公众平台拿>`
   - 其它（`VOLC_SMS_*` / `BAIDU_AI_*` / `WECHAT_APP_ID/SECRET`）按 launch 决议**留空**
2. **DNS + 端口**：A 记录 `bcappandgame.com → ECS 公网 IP`；安全组放行 80 / 443
3. **起服务**：`docker compose -f docker-compose.prod.yml up -d --build`
4. **签 HTTPS**：`./scripts/setup-ssl.sh issue --domain bcappandgame.com --email <邮箱>`
5. **健康检查**：
   - `curl -I https://bcappandgame.com` → 200
   - `curl https://bcappandgame.com/actuator/health` → `{"status":"UP"}`
   - 浏览器打开 `https://bcappandgame.com` → 能登录 / 看到首页能量闭环
6. **微信公众平台 → 开发 → 开发管理 → 开发设置**：
   - **服务器域名 → request 合法域名**：加 `https://bcappandgame.com`
   - **业务域名**：加 `https://bcappandgame.com`（需要下载校验文件上传到 ECS web 根路径再点验证）
7. **微信开发者工具**：导入 `calorie-log-miniprogram/`，AppID 自动读到；编译运行 → 测「微信一键登录 → 跳首页」
8. **真机预览**：右上「预览」生成二维码，自己手机扫码跑通完整流程（安卓 + iOS）
9. **提交审核**：
   - 类目建议「工具 / 效率管理」（避开「健康」类目的资质要求）
   - 提供测试账号、功能简述
   - 协议/隐私文案先在公众平台填模板链接；后续补齐再在 `login.wxml` 放出 terms 块
10. **审核通过后 → 发布**

### 常见卡点

| 现象 | 多半原因 |
|---|---|
| 真机白屏 / "页面无法显示" | 业务域名没配（步骤 6） |
| 登录卡转圈 / "网络异常" | 服务器域名没配 或 ECS 443 没开 |
| 后端日志 `wechat.ma.app-id 未配置` | `.env` 缺 `WECHAT_MA_APP_ID/SECRET`（步骤 1） |
| 模拟器请求被拦 | 开发者工具 → 详情 → 本地设置 → 勾「不校验合法域名」（仅调试期，真机不生效） |

