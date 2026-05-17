# 微信小程序接入 —— 一次到位的清单

最后更新：2026-05-06
负责模块：`calorie-log-web`（被套壳）、`calorie-log-miniprogram/`（壳工程）、`scripts/setup-ssl.sh`、`docker-compose.prod.yml`、`calorie-log-web/nginx*.conf`

> 路线选型：**web-view 套壳**。小程序里只放一个全屏 `<web-view>`，指向我们已部署的 React web。后续如要原生体验再用 Taro 重写。
>
> 这条路成立的硬前提是 **HTTPS + 备案域名**——这是微信小程序后台对 `web-view` 业务域名的强制要求。所以 80% 的工作量在"让现有 prod 能走 HTTPS"，而不是写小程序代码。

---

## 1. 已经做的代码改动

> 全部已通过本地验证：`npm run build`、`docker compose config --quiet`、nginx `-t` 自检 + 自签证书加载、bash `-n` 语法检查、所有 JSON `json.load` 通过。

| 文件 | 干了什么 |
|---|---|
| `calorie-log-web/nginx.conf` | 80 端口加放行 `/.well-known/acme-challenge/` 给 ACME http-01 challenge 用 |
| `calorie-log-web/nginx-ssl.conf` | 新增。443 server 模板（TLS1.2+1.3、HSTS 6mo、SPA + `/api` 反代）。`__DOMAIN__` 占位由 entrypoint 脚本替换 |
| `calorie-log-web/docker-entrypoint.d/10-enable-ssl.sh` | 新增。容器启动时检测 `/etc/nginx/ssl/fullchain.pem`：存在且 `DOMAIN` 已注入则启用 443、并向 80 server 注入"除 challenge 外 301→https"逻辑；否则 nginx 行为完全等同改造前 |
| `calorie-log-web/Dockerfile` | 拷贝上面两个新文件，`EXPOSE 80 443` |
| `docker-compose.prod.yml` | nginx service：暴露 `${WEB_HTTPS_PORT:-8443}:443`、注入 `DOMAIN`、挂载 `./ssl/live → /etc/nginx/ssl:ro` 和 `./ssl/acme-webroot → /var/www/certbot` |
| `.env.prod.example` | 新增 `WEB_HTTPS_PORT`、`DOMAIN` 占位 + 引导到 `setup-ssl.sh` |
| `.gitignore` | 加 `ssl/`，避免证书 / ACME state 入库 |
| `scripts/setup-ssl.sh` | 新增。`issue --domain --email` 用一次性 certbot 容器走 webroot 申请 Let's Encrypt 证书；`renew` 续签后自动 reload nginx；自动写 `.env` 的 `DOMAIN` |
| `scripts/release.sh` | `PUBLIC_BASE_URL` 注释更新，提示 HTTPS 后用 `PUBLIC_BASE_URL=https://… ./scripts/release.sh` 覆盖 |
| `calorie-log-web/src/utils/wxBridge.ts` | 新增。`isMiniprogram()` / `isWeixin()` / `postToMiniprogram()` / `navigateToNative()` / `getEnv()`。浏览器里全部 no-op |
| `calorie-log-web/src/main.tsx` | 启动时若识别到小程序环境，给 `<html>` 加 `in-miniprogram` class，便于 CSS 微调（如隐藏返回按钮） |
| `calorie-log-miniprogram/` | 新增小程序工程骨架：`app.json/js/wxss`、`pages/index/{index.wxml,js,wxss,json}`、`sitemap.json`、`project.config.json`。单页全屏 `<web-view>` 指向 `app.globalData.baseUrl`，支持 `?path=` deeplink |

后端 **CORS 无需改动**（`SecurityConfig.java` 用的是 `setAllowedOriginPatterns("*")`，已经放行 `servicewechat.com`）。

---

## 2. 你（用户）需要做的事

按时间顺序排列；每一步都要做完才能进下一步。

### Step 1 · 准备一个已 ICP 备案的域名 ⚠️ 阻塞项
- 微信小程序后台**只接受已备案的域名**作为 `web-view` 业务域名（境内主体小程序）。
- 火山云有备案入口；个人备案 7-20 工作日，企业 5-15 工作日。**这是整个流程里最长的等待**。
- 备案完成后，把域名 A 记录指向 `115.190.210.138`。

### Step 2 · 火山云安全组放行 80 / 443
- 当前安全组只开了 `8088`。HTTPS + ACME 都需要从公网访问 80：
  - **80**：ACME http-01 challenge 必须走 80（不能改端口）
  - **443**：HTTPS 出口
- ECS 控制台 → 安全组 → 入方向 → 添加 80/443 TCP `0.0.0.0/0`
- 同时改 `.env` 里的端口：`WEB_PORT=80`、`WEB_HTTPS_PORT=443`

### Step 3 · 把代码部署上去
本地：
```bash
git push                            # 把这次的改动推上去
./scripts/release.sh                # 部署到 ECS
```

上去后 SSH 进 ECS 改 `.env`：
```bash
ssh -i ~/program/volc/volc-meet.pem root@115.190.210.138
cd /root/calorie-log
sed -i 's/^WEB_PORT=.*/WEB_PORT=80/' .env
sed -i 's/^WEB_HTTPS_PORT=.*/WEB_HTTPS_PORT=443/' .env
docker compose -f docker-compose.prod.yml up -d nginx
```

确认 `http://你的域名/` 能打开（此时还没证书）。

### Step 4 · 申请 SSL 证书
在 ECS 上：
```bash
cd /root/calorie-log
./scripts/setup-ssl.sh issue --domain 你的域名 --email 你的邮箱
```

脚本会：
1. 用一次性 certbot 容器走 webroot challenge 申请 Let's Encrypt 证书
2. 把证书拷到 `./ssl/live/{fullchain,privkey}.pem`
3. 自动把 `DOMAIN=你的域名` 写进 `.env`
4. `docker compose restart nginx` —— 重启后 entrypoint 检测到证书 + DOMAIN，启用 443，80 自动 301

成功后访问 `https://你的域名/` 应能看到食养记。`http://你的域名/` 应自动跳转到 `https`。

### Step 5 · 配置自动续签
Let's Encrypt 证书 90 天到期。在 ECS 上加 cron：
```bash
crontab -e
# 每月 1 号凌晨 3 点续签
0 3 1 * * cd /root/calorie-log && ./scripts/setup-ssl.sh renew >> /var/log/cert-renew.log 2>&1
```

### Step 6 · 注册 / 更新微信小程序
- 微信公众平台 → 小程序 → 注册（如未注册）
- 拿到 **AppID** 后填进 `calorie-log-miniprogram/project.config.json` 的 `appid` 字段
- 小程序后台 → 开发管理 → 开发设置 → **业务域名**：添加 `https://你的域名`
  - 同时下载根目录验证文件，放到 web 端 `calorie-log-web/public/<那个文件名>`，重新发布 web，然后再到小程序后台点"已下载"。
- 小程序后台 → 类目：选「工具 / 工具」或「教育 / 在线教育」均可；不要选「医疗」（会过不了审，详见 §4）

### Step 7 · 改小程序工程的 `app.js` 域名
```js
// calorie-log-miniprogram/app.js
globalData: {
  baseUrl: 'https://你的域名'
}
```

### Step 8 · 用微信开发者工具调试 + 上传
1. 安装「微信开发者工具」（mac 版：[https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)）
2. 打开 → 导入项目 → 选 `calorie-log-miniprogram/` 目录 → 填 AppID
3. 编译运行，应能看到食养记 web 套在小程序里
4. 调试通过后点「上传」→ 进小程序后台「版本管理」→ 提交审核

---

## 3. 已知问题 / 限制 / 后续优化

| 问题 | 影响 | 现状 |
|---|---|---|
| **iOS 微信 web-view 对 `<input type="file" capture="environment">` 支持不一致** | `RecognizePage`（拍照识别食物）在 iOS 小程序里可能直接弹"相册/拍照/文件"系统选择器而不是直接调相机 | 暂未做小程序原生 chooseImage 桥接；iOS 用户多走"从相册选择"。后续若必要，在小程序壳加 `web-view` 与 `wx.chooseImage` 之间的桥接（增加约半天工作量） |
| **token 通过 localStorage 持久化** | 小程序 web-view 里不同进入路径可能视作不同会话，登录态偶发丢失 | 当前未观察到该问题；暴露后再处理。备选方案是把 token 走 URL 参数从小程序壳传给 web，但安全性下降 |
| **小程序后退按钮 + web 内的导航栈不一致** | 用户在 web 里点了 3 层后，按手机硬件后退一次会直接退出小程序而非回上一层 web | 微信限制；改善方案是在 web 内监听 `history.popstate` 然后 `wx.miniProgram.postMessage` 通知壳，但跨页消息延迟大效果差。**可接受现状** |
| **首次冷启动慢** | web-view 要请求 `index.html` + 主 chunk + antd（392 KB gzip），4G 下大概 1-2s 白屏 | `index.js` 的 `_ts=` 戳是为了避开 web-view 缓存；后续上预拉机制（`<navigator>` 预热）可优化 |
| **Sketch SVG 在 web-view 性能** | 我们的手绘风样式靠 SVG 渲染；小程序 web-view 是 webkit 包装，比浏览器慢 10-30% | 中低端机有感知。**等用户反馈再优化**，先验证产品 |
| **支付 / 微信原生分享** | web-view 里不能直发 `wx.requestPayment`、`wx.shareAppMessage`；需要靠小程序壳做 | 当前我们没有支付 / 分享需求，暂不做 |
| **HSTS 设了 6 个月** | 万一域名解绑/换证书需要等 HSTS 过期 | 我故意没用 1 年 + preload；上线 4-6 周稳定后再升级 |
| **微信开发者工具调试时 `urlCheck`** | 调试模式可关；上线必须配业务域名白名单 | 已在 `project.config.json` 设 `"urlCheck": true`、`project.private.config.json` 设 `false`（仅本地） |
| **小程序壳 onLoad 重复构造 src** | 我之前一稿写错了（onLoad 双定义），已修正为 Page.onLoad / onWebviewLoad / onError 三个不同方法名 | ✓ 已修复 |

---

## 4. 微信审核避坑

我们的产品有两个潜在违规高风险点：

1. **「热量」「卡路里」「减肥」「增肌」等词** —— 不直接违规，但被分类到「医疗 / 健康」会触发资质审查。
   - 解法：小程序简介、关键词、首页文案里**避免出现「减肥 / 减脂 / 治疗」**，用「饮食记录 / 训练打卡 / 自我管理」替代。
   - 类目选「工具」或「教育 / 在线教育」，不选「医疗」。

2. **「评分 / 建议」功能** —— 如果文案里出现"专业建议""医生推荐"会被打回。
   - 解法：在 web 端加一行小字 disclaimer：「记录与建议仅供个人参考，不构成医疗意见」（之前给你的小程序简介里已写）。

3. **AI 图片识别** —— 用户上传图片会被微信扫描，正常美食图没问题；但要在「用户协议」里加一行"上传内容由用户自行负责"。

---

## 5. 验收清单（部署 HTTPS 后跑一遍）

```bash
# 1. HTTP 自动跳转
curl -I http://你的域名/
# 期望：HTTP/1.1 301，Location: https://你的域名/

# 2. ACME 路径不跳转
curl -I http://你的域名/.well-known/acme-challenge/x
# 期望：HTTP/1.1 404（而非 301）—— 证明续签时 challenge 能走 80

# 3. HTTPS 正常
curl -I https://你的域名/
# 期望：HTTP/2 200

# 4. /api 反代
curl https://你的域名/api/v1/auth/send-code -H 'Content-Type: application/json' \
  -d '{"identifier":"13900000099","scene":"register"}'
# 期望：{"code":200,...,"data":{"sent":true,"code":"123456"}}

# 5. 证书评级（可选）
# 浏览器访问 https://www.ssllabs.com/ssltest/analyze.html?d=你的域名
# 期望：A 级以上
```

---

## 6. 微信一键登录（小程序 wx.login）

### 已经做的

| 位置 | 干了什么 |
|---|---|
| `pom.xml` | 加 `weixin-java-miniapp` 依赖（与已有 `weixin-java-mp` 同版本 4.6.7.B） |
| `WxMaConfig.java` | 新增。注入 `WxMaService` bean，提供 `isConfigured()` |
| `WechatOAuthService.java` | 新增 `miniprogramCode2Session(jsCode)`：调 `getUserService().getSessionInfo` 拿 openid + unionid；未配凭据时 dev mock / prod 拒 |
| `WechatAuthService.java` | 新增 `loginByMiniprogramCode(code)`：openid 命中 → 直接发 token；未命中 → 自动建 user（无 phone）→ 发 token；返回 `{token, needBindPhone}` |
| `AuthController.java` | 新增 `POST /api/v1/auth/wechat/miniprogram` |
| `SecurityConfig.java` | 把上面接口加到 WHITELIST（不需 token 即可访问） |
| `ErrorCode.java` | 新增 `WECHAT_CODE_INVALID(42004)` / `WECHAT_NOT_CONFIGURED(42005)` |
| `application.yml` | 新增 `wechat.ma.app-id` / `wechat.ma.app-secret`（环境变量 `WECHAT_MA_APP_ID/SECRET`） |
| `docker-compose.prod.yml` + `.env.prod.example` | 透传上面两个环境变量 |
| `calorie-log-miniprogram/pages/login/` | **新增小程序原生登录页**：`wx.login` → 调后端 → token 写 storage + redirect 到 `pages/index` 带 URL 参数 |
| `calorie-log-miniprogram/app.json` | 把 `pages/login/login` 加在第一位（启动入口） |
| `calorie-log-miniprogram/pages/index/index.js` | 把所有 query 透传到 web-view URL；`onMessage` 接收 web 端 `{type:'logout'}` 时清 storage + reLaunch 回登录页 |
| `calorie-log-web/src/main.tsx` | 启动时读 URL 参数 `?token=&refresh=&needBindPhone=`，写入 localStorage / sessionStorage 后 `replaceState` 清 URL |
| `calorie-log-web/src/store/auth.ts` | logout 时 `postToMiniprogram({type:'logout'})` |
| `calorie-log-web/src/utils/wxBridge.ts` | 加 `redirectToNative(path)` |
| `calorie-log-web/src/pages/auth/LoginPage.tsx` | 在小程序环境里把"微信扫码登录"按钮换成"微信一键登录"，点击 redirect 到 `/pages/login/login?from=logout` |
| `calorie-log-web/src/pages/home/HomePage.tsx` | 顶部加"未绑定手机号"软提醒 Alert（来自 sessionStorage），可关闭，链到设置页 |

### 登录链路图

```
冷启动小程序
   ↓
pages/login/login.onLoad 检查 storage 里有无 token
   ├── 有 → wx.redirectTo /pages/index/index?token=…&refresh=…
   └── 无 → 显示登录按钮
              ↓ 用户点击
        wx.login → jscode
              ↓
        wx.request POST /api/v1/auth/wechat/miniprogram { code: jscode }
              ↓
        后端 WxJava code2Session → openid → 命中或新建 User → 发 JWT
              ↓
        wx.setStorageSync 把 token / refresh 存壳 storage
              ↓
        wx.redirectTo /pages/index/index?token=…&refresh=…&needBindPhone=…
              ↓
        web-view 加载 https://你的域名/?token=…&refresh=…&needBindPhone=1
              ↓
        web 端 main.tsx 读 URL 注 localStorage + sessionStorage，replaceState 清 URL
              ↓
        正常进入 React 应用，HomePage 顶部展示"未绑定手机号"软提醒
```

### 你需要做的事

按时间顺序：

1. **小程序后台拿 `AppID` 和 `AppSecret`**：开发管理 → 开发设置
2. **填进 ECS `.env`**：
   ```
   WECHAT_MA_APP_ID=wxabc...
   WECHAT_MA_APP_SECRET=...
   ```
3. **填进小程序工程 `app.js`**：
   ```js
   globalData: { baseUrl: 'https://你的域名' }
   ```
4. **小程序后台 → 开发管理 → 开发设置 → 服务器域名 → request 合法域名**：加 `https://你的域名`
   - 注意：web-view 用的是「业务域名」，wx.request 用的是「服务器域名 → request」，是**两套白名单**，都要填
5. **重新部署**：`./scripts/release.sh`（拉到新代码 + 新环境变量）
6. **微信开发者工具里调试**：用真机预览，点"微信一键登录"，应能看到顶部"未绑定手机号"红条

### 已知限制

| 问题 | 影响 | 现状 |
|---|---|---|
| **个人主体拿不到手机号** | "一键登录"无法自动绑手机号；用户跨设备登录可能看到不同账号（但只要都用同一微信，按 openid 命中是同一账号） | 软提醒，不阻塞使用 |
| **unionid 默认为 null** | 个人小程序无法发开放平台账号；将来如果开多个小程序无法做账号互通 | 接受现状；将来升级为企业主体后 `getSessionInfo` 会返 unionid，代码已自动回填 |
| **wx.login 的 jscode 5 分钟一次性** | 用户一直停在登录页不点按钮再点击会拿到新 jscode，旧的会失效；目前没有加倒计时 | 浏览器后退 → 再点击 → 自动重新 wx.login，无需特殊处理 |
| **postMessage 是异步聚合** | web 端 logout 后通知小程序壳清 storage + 跳登录页**不是即时**的；主链路改用 redirectToNative（同步）兜底 | 已实现：LoginPage 在小程序里点"微信一键登录"会立即 redirectTo `/pages/login/login?from=logout`，触发 storage 清理 |

## 7. 整个改动可回退

如果出现任何问题想退回纯 HTTP：
```bash
ssh ECS
cd /root/calorie-log
sed -i 's/^DOMAIN=.*/DOMAIN=/' .env
docker compose -f docker-compose.prod.yml up -d nginx
```
DOMAIN 留空时 entrypoint 不启用 SSL，行为完全等同改造前。`./ssl/` 目录不删，下次重启随时可恢复。
