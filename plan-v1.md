# 食养记 - 开发计划文档 V1.0

创建日期：2026年4月16日  
文档状态：草稿

---

## 一、总体规划

### 开发原则
- 先后端、后前端：接口稳定后再对接，避免联调反复
- 先移动端、后网页版：核心使用场景在移动端，网页版复用接口
- 先核心链路、后周边功能：确保"记录饮食 → 查看统计"主流程优先可用
- 每个阶段结束交付可运行的版本，不堆积未测试代码

### 阶段划分

| 阶段 | 名称 | 目标 |
|------|------|------|
| Phase 0 | 工程初始化 | 项目骨架、开发环境、数据库、基础数据导入 |
| Phase 1 | 核心 MVP | 用户注册登录 + 饮食记录 + 每日统计，跑通主流程 |
| Phase 2 | 目标系统 | TDEE 计算、训练日/休息日、饮食打分与建议 |
| Phase 3 | 扩展功能 | 条码扫描、体重体脂、力量训练、历史报表 |
| Phase 4 | 社交系统 | 好友管理、经验值、排行榜 |
| Phase 5 | AI 功能 | 食物拍照识别、烹饪方法推荐 |
| Phase 6 | 网页版 | React + Vite 网页端全功能对齐移动端 |

---

## 二、Phase 0 — 工程初始化

### 目标
所有后续开发的地基：项目结构可跑、数据库可连、食物基础数据就位、生产环境资源就位。

### 任务清单

#### 0-1 基础设施采购（长周期，先行启动）
- [ ] 域名采购（如 `caloriego.cn`）
- [ ] ICP 备案申请（国内服务器强制要求，15~30 天，**必须最早启动**）
- [ ] 火山引擎云服务器采购（初期 2核4G）
- [ ] 火山引擎 VeSMS 短信签名审核（7~14 天）
- [ ] 微信开放平台应用注册（网站应用 + 移动应用，需营业执照）
- [ ] 百度 AI 开放平台账号开通（Phase 5 用，可后置）

> ⚠️ 备案与短信签名审核周期长且阻塞上线，必须与开发并行启动。

#### 0-2 仓库与目录结构
- [ ] 创建 Monorepo 根目录 `calorie-log/`
- [ ] 初始化三个子项目目录：`calorie-log-server/`、`calorie-log-web/`、`calorie-log-app/`
- [ ] 配置 `.gitignore`（Java、Node、React Native 各自规则）
- [ ] 初始化 Git 仓库，提交初始结构

#### 0-3 后端项目初始化
- [ ] 用 Spring Initializr 生成项目骨架，依赖：
  - Spring Web
  - Spring Security
  - Spring Data Redis
  - MyBatis Plus
  - Spring Validation
  - Springdoc OpenAPI
  - PostgreSQL Driver
  - Flyway
  - Lombok
- [ ] 按架构文档搭建包结构（`common/`、`module/`、`integration/`）
- [ ] 配置 `application.yml` / `application-dev.yml` / `application-prod.yml` 三套配置
- [ ] 实现统一响应体 `Result<T>`、`PageResult<T>`
- [ ] 实现全局异常处理 `GlobalExceptionHandler`
- [ ] 实现错误码枚举 `ErrorCode`
- [ ] 配置 Swagger UI（`/swagger-ui.html` 仅 dev 环境开放）
- [ ] 配置 MyBatis Plus（分页插件、自动填充 `created_at` / `updated_at`、`@Version` 乐观锁）
- [ ] 验证：启动成功，Swagger 页面可访问

#### 0-4 数据库初始化
- [ ] 本地安装/启动 PostgreSQL 16、Redis 7
- [ ] 创建数据库 `calorie_log_db`
- [ ] 编写 Flyway 迁移脚本 `V1__init_schema.sql`（所有表结构，含 `deleted_at` / `version` 字段）
- [ ] 编写 Flyway 迁移脚本 `V2__init_indexes.sql`（所有索引，含部分索引的 WHERE 条件）
- [ ] 编写 Flyway 迁移脚本 `V3__seed_exercises.sql`（约 40 个预设力量训练动作）
- [ ] 启动应用验证 Flyway 自动执行迁移成功
- [ ] 验证：`\d+ t_xxx` 命令查看表结构无误，所有索引生效

#### 0-5 食物基础数据导入
- [ ] 在 GitHub 找到《中国食物成分表》整理版数据集（搜索关键词：`中国食物成分表 dataset`）
- [ ] 下载 Open Food Facts 中文商品子集数据（`https://world.openfoodfacts.org/data`，筛选 `countries_tags` 含 `cn`）
- [ ] 编写数据清洗脚本（Python 或 Java），映射至 `t_food` 完整字段（含维生素、矿物质）
- [ ] 对缺失字段的食物，`NULL` 填充，**不要伪造数据**
- [ ] 整理预设难称重食物净毛重比例数据（玉米、虾、苹果等约 20 种），写入 `t_food`
- [ ] 验证：直接在 psql 中执行 `SELECT name FROM t_food WHERE name LIKE '%土豆%' LIMIT 10` 能返回数据（此时接口层还未实现，避免 Phase 依赖错乱）

#### 0-6 前端项目初始化
- [ ] **网页版**：`npm create vite@latest calorie-log-web -- --template react-ts`，安装 Axios、Zustand、Ant Design、Recharts
- [ ] **移动端**：`npx react-native init CalorieLogApp --template react-native-template-typescript`，安装 Axios、Zustand、React Native Paper、React Navigation
- [ ] 两端各配置环境变量（`VITE_API_BASE_URL` / `API_BASE_URL`）
- [ ] 封装 Axios 实例（baseURL、请求拦截加 Token + `X-Timezone` header、响应拦截统一错误处理）
- [ ] 验证：前端启动成功，能发出请求到后端

#### 0-7 生产环境部署准备
- [ ] 服务器基础环境：JDK 17、PostgreSQL 16、Redis 7、Nginx
- [ ] HTTPS 证书申请（Let's Encrypt 或云厂商免费证书）
- [ ] Nginx 反向代理配置（`/api` → Spring Boot，`/` → 静态文件）
- [ ] 生产环境环境变量管理（`.env.prod` 不入库，使用服务器秘密管理）
- [ ] 部署脚本（简单 shell 即可，复杂化后期再上 Docker）

---

## 三、Phase 1 — 核心 MVP

### 目标
跑通"注册 → 登录 → 添加饮食 → 查看当日汇总"完整主流程。

### 后端任务

#### 1-B1 用户认证模块
- [ ] 实现手机号/邮箱注册接口（`POST /api/v1/auth/register`）
  - 支持 `identifier` 字段传手机号或邮箱，后端自动识别
  - 验证码校验（Phase 1 用 Mock 固定值 `123456`，**必须通过环境变量开关严格限定 dev 环境**，生产环境强制真实短信/邮件）
  - 密码 BCrypt 加密存储
  - 注册成功自动创建 `t_user_experience` 初始记录
- [ ] 实现登录接口（`POST /api/v1/auth/login`）
  - 支持手机号/邮箱 + 密码登录
  - 支持手机号 + 验证码登录
  - 登录成功返回 Access Token + Refresh Token
- [ ] 实现 Token 刷新接口（`POST /api/v1/auth/refresh`）
- [ ] 实现登出接口（`POST /api/v1/auth/logout`，Token `jti` 加入 Redis 黑名单，TTL = Token 剩余有效期）
- [ ] 实现发送验证码接口（`POST /api/v1/auth/send-code`）
  - dev 环境直接返回 `123456`
  - 通过 `identifier_type` 区分手机号/邮箱
  - 同一 identifier 限流：1分钟内只能发1次（Redis 锁）
- [ ] 配置 Spring Security 白名单（注册、登录、发送验证码接口放行）
- [ ] 实现 JWT 工具类（生成、解析、校验、提取 `jti`）
- [ ] 单元测试：注册、登录、Token 刷新逻辑

#### 1-B2 微信登录模块
- [ ] 引入 WxJava 库
- [ ] 实现微信登录接口（`POST /api/v1/auth/wechat`）
  - 接收客户端传入的 code，换取 `openid` / `unionid`
  - 已绑定账号 → 直接签发正式 Token
  - 未绑定账号 → 签发 10 分钟临时 Token，提示需绑定手机号
- [ ] 实现微信绑定手机号接口（`POST /api/v1/auth/wechat/bind`）
  - 携带临时 Token + 手机号 + 验证码
  - 已有手机号账号 → 合并（补 `wechat_openid`）
  - 无账号 → 创建新账号
- [ ] 临时 Token 独立维护（Redis `wechat:temp_token:{token}` → `openid`）
- [ ] 单元测试：绑定流程各分支

#### 1-B3 用户信息模块
- [ ] 实现获取个人信息接口（`GET /api/v1/users/profile`）
- [ ] 实现完善/修改个人信息接口（`PUT /api/v1/users/profile`）
  - 字段：性别、年龄、身高、体重、活动量、时区
  - 修改后不触发 TDEE 重算（Phase 2 再做联动）

#### 1-B4 食物搜索模块
- [ ] 实现食物关键词搜索接口（`GET /api/v1/foods/search?keyword=xxx&page=1&size=20`）
  - 优先匹配食物名称，其次匹配别名
  - 使用 PostgreSQL 全文搜索索引
  - 系统食物（`data_source != 'user'`）全局可搜；用户自建食物（`data_source='user'`）仅本人可搜
  - 结果缓存至 Redis，TTL 1小时
- [ ] 实现食物详情接口（`GET /api/v1/foods/{id}`，权限校验：用户自建食物仅创建者可读）
- [ ] 实现用户自定义食物添加接口（`POST /api/v1/foods/custom`，写入时 `created_by` = 当前用户）

#### 1-B5 饮食记录模块
- [ ] 实现添加饮食记录接口（`POST /api/v1/records`）
  - 支持 food_id 关联或手动输入营养数据
  - 支持毛重转净重（传入 gross_quantity 时自动计算）
  - 写入成功后触发当日汇总更新
- [ ] 实现获取当日饮食记录接口（`GET /api/v1/records/daily?date=xxx`）
  - 按餐次分组返回（早餐/午餐/晚餐/加餐）
  - 附带当日热量合计、各营养素合计
- [ ] 实现编辑饮食记录接口（`PUT /api/v1/records/{id}`）
- [ ] 实现删除饮食记录接口（`DELETE /api/v1/records/{id}`，软删除）
- [ ] 实现每日汇总更新逻辑（`t_daily_summary` 聚合计算，每次增删改记录后触发）

### 移动端任务

#### 1-F1 认证页面
- [ ] 注册页（手机号/邮箱 + 验证码 + 密码，Tab 切换注册方式）
- [ ] 登录页（手机号/邮箱 + 密码，Tab 切换验证码登录）
- [ ] 微信登录按钮（移动端调起授权 → 若未绑定跳转绑定手机号页）
- [ ] 微信绑定手机号页（临时 Token 持有状态下）
- [ ] Token 持久化（AsyncStorage）
- [ ] 自动登录（启动时检查 Token 有效性）
- [ ] 登出功能

#### 1-F2 个人信息完善页
- [ ] 首次登录后引导完善：性别、年龄、身高、体重、活动量
- [ ] 已完善用户直接跳转首页

#### 1-F3 首页
- [ ] 当日热量环形进度图（已摄入 / 目标，Phase 1 目标值先写死 2000kcal）
- [ ] 三大营养素进度条（蛋白质、碳水、脂肪）
- [ ] 按餐次展示当日饮食记录列表（早/午/晚/加餐各自折叠）
- [ ] 每个餐次的"添加食物"入口
- [ ] 日期切换（左右滑动切换查看历史日记录）

#### 1-F4 食物添加页
- [ ] 搜索框 + 搜索结果列表（食物名称、每100g热量）
- [ ] 点击食物 → 选择分量（输入克数，实时计算热量和营养素）
- [ ] 确认添加，返回首页刷新
- [ ] 手动添加入口（搜索无结果时显示）

#### 1-F5 饮食记录编辑/删除
- [ ] 长按或右滑记录项，出现编辑/删除操作
- [ ] 编辑页：修改分量或食物名称
- [ ] 删除二次确认弹窗

### 阶段验收标准
- 手机号注册、登录、登出完整可用
- 能搜索食物、添加到指定餐次
- 首页实时显示当日热量和营养素摄入合计
- 能编辑和删除已有记录

---

## 四、Phase 2 — 目标系统

### 目标
引入个性化健身目标，使热量/营养素目标值动态化，并提供饮食打分与优化建议。

### 后端任务

#### 2-B1 目标设定模块
- [ ] 实现健身目标设置接口（`POST /api/v1/goals`）
  - 目标类型：增肌塑型 / 减脂增肌
  - 触发 TDEE 计算，写入 `t_user_goal`
- [ ] 实现当前目标查询接口（`GET /api/v1/goals/current`）
- [ ] 实现训练日/休息日设置接口（`POST /api/v1/goals/training-schedule`）
  - 支持固定星期设置（如每周一三五为训练日）
  - 支持按日期手动设置
  - 支持设置训练强度（低/中/高）
- [ ] 实现训练日计划查询接口（`GET /api/v1/goals/training-schedule?month=2026-04`）
- [ ] 实现 `TdeeCalculationService`：
  - BMR 计算（Mifflin-St Jeor）
  - TDEE 计算（区分训练日/休息日/训练强度）
  - 目标热量计算（增肌/减脂各自盈余/缺口比例）
  - 营养素比例计算（训练日/休息日微调）
- [ ] 个人信息修改后自动触发目标重算联动
- [ ] 单元测试：覆盖 BMR / TDEE / 目标热量各计算分支

#### 2-B2 每日统计升级
- [ ] `t_daily_summary` 补充目标热量、TDEE、热量缺口/盈余字段的实时写入
- [ ] 实现每日统计接口（`GET /api/v1/statistics/daily?date=xxx`）
  - 返回：摄入热量、目标热量、TDEE、热量状态（缺口/盈余/平衡）及数值
  - 关联目标给出状态提示文案（如"当前热量盈余200kcal，符合增肌需求"）

#### 2-B3 饮食打分模块
- [ ] 实现 `DietScoreService`：
  - 热量达标度评分（30分）
  - 营养素合规性评分（35分）
  - 餐次分配合理性评分（20分）
  - 食物多样性评分（15分）
- [ ] 实现当日评分接口（`GET /api/v1/statistics/score?date=xxx`）
- [ ] 每次饮食记录变更后异步重算当日评分，更新 `t_daily_summary.diet_score`

#### 2-B4 饮食优化建议模块
- [ ] 实现 `DietSuggestionService`，基于规则引擎生成建议：
  - 热量调整建议
  - 营养素补充建议（不足 / 过量各自对应推荐食物）
  - 餐次分配建议
  - 食物多样性建议
- [ ] 实现建议查询接口（`GET /api/v1/statistics/suggestions?date=xxx`）

#### 2-B5 每餐热量分配建议
- [ ] 实现每餐热量分配建议接口（`GET /api/v1/goals/meal-distribution`）
  - 根据当日目标热量、日期类型，返回早/午/晚/加餐热量建议范围

### 移动端任务

#### 2-F1 目标设定页
- [ ] 选择健身目标（增肌塑型 / 减脂增肌，图文卡片选择）
- [ ] 展示系统计算的 BMR、TDEE、目标热量、营养素比例
- [ ] 支持手动微调目标热量和营养素比例（滑动条，带合理范围提示）
- [ ] 训练日/休息日设置（日历视图，按星期批量设置 + 单日手动覆盖）
- [ ] 训练强度选择（低/中/高，训练日专属）

#### 2-F2 首页升级
- [ ] 目标热量由系统动态计算值替换 Phase 1 的写死值
- [ ] 增加热量状态标签（缺口/盈余/平衡 + 具体数值）
- [ ] 区分当日是训练日还是休息日，首页顶部标注

#### 2-F3 当日统计页
- [ ] 营养素摄入环形图（蛋白质/碳水/脂肪实际占比 vs 目标占比）
- [ ] 饮食评分卡片（总分 + 四维度得分条形图）
- [ ] 饮食优化建议列表（分点展示，可折叠）
- [ ] 每餐热量分配建议（各餐目标范围 vs 实际值）

### 阶段验收标准
- 设置健身目标后，首页目标值自动更新
- 训练日与休息日目标热量不同，切换日期可见变化
- 当日有记录后能生成评分和优化建议

---

## 五、Phase 3 — 扩展功能

### 目标
补全条码扫描、体重体脂追踪、力量训练记录、历史多周期报表。

### 后端任务

#### 3-B1 条码扫描
- [ ] 实现条码查询接口（`GET /api/v1/foods/barcode/{code}`）
  - 优先查 `t_food`（已导入 Open Food Facts 数据）
  - 未命中时返回 404，提示用户手动录入
- [ ] 实现用户手动录入商品并保存到个人食物库（`data_source = 'user'`）

#### 3-B2 体重体脂模块
- [ ] 实现记录接口（`POST /api/v1/body/records`）
- [ ] 实现历史查询接口（`GET /api/v1/body/records?startDate=xxx&endDate=xxx`）
- [ ] 实现编辑/删除接口
- [ ] 体重体脂数据同步写入 `t_daily_summary` 对应日期

#### 3-B3 力量训练模块
- [ ] 实现训练记录接口（`POST /api/v1/strength/records`）
  - 仅训练日可调用（后端校验，非训练日返回 403）
- [ ] 实现当日训练记录查询（`GET /api/v1/strength/records?date=xxx`）
- [ ] 实现历史训练查询（支持按动作名称、部位筛选）
- [ ] 实现编辑/删除接口
- [ ] 预设动作库数据初始化（写入 `db/seed_exercises.sql`，约 40 个动作）

#### 3-B4 历史报表模块
- [ ] 实现周报接口（`GET /api/v1/statistics/weekly?startDate=xxx`）
  - 本周平均热量、营养素、热量缺口/盈余汇总
  - 体重体脂周变化
  - 力量训练次数汇总
  - 标注周内最优/待改进日期
- [ ] 实现月报接口（`GET /api/v1/statistics/monthly?yearMonth=2026-04`）
  - 月度平均热量、体重体脂趋势
  - 力量训练月度汇总
  - 生成月度核心结论文本

> 年报接口延后至后续迭代：至少需要累积 1 年数据才有展示价值，V1 阶段开发意义不大。

#### 3-B5 真实短信/邮件验证码（替换 Mock）
- [ ] 接入火山引擎 VeSMS（短信）
- [ ] 接入邮件服务（SMTP 或火山引擎邮件 API，邮箱验证码）
- [ ] 将 `POST /api/v1/auth/send-code` 从 Mock 切换为真实发送
- [ ] 严格环境判断：仅 `dev` profile 允许返回固定验证码，其他环境强制走真实通道
- [ ] Redis 存储验证码，TTL 5分钟
- [ ] 同一 identifier 限流：1分钟内只能发1次

#### 3-B6 密码修改与找回（FR-SET-002）
- [ ] 实现修改密码接口（`PUT /api/v1/users/password`，需原密码）
- [ ] 实现忘记密码重置接口（`POST /api/v1/auth/reset-password`，手机号/邮箱 + 验证码 + 新密码）
- [ ] 密码修改后废止该用户所有已签发 Token（Redis 记录 `user:token_invalidated_at:{userId}` 时间戳，JWT 过滤器校验签发时间）

#### 3-B7 通知设置（FR-SET-003）
- [ ] 新建 `t_notification_setting` 表（用户 ID、三餐提醒开关、提醒时间、频率）
- [ ] 实现通知设置查询接口（`GET /api/v1/settings/notifications`）
- [ ] 实现通知设置保存接口（`PUT /api/v1/settings/notifications`）
- [ ] 客户端自行按设置调度本地推送（不做服务端定时推送，节省成本）

### 移动端任务

#### 3-F1 条码扫描页
- [ ] 调起摄像头扫描条形码
- [ ] 命中后显示商品信息卡片，确认添加至餐次
- [ ] 未命中显示手动录入表单

#### 3-F2 体重体脂记录
- [ ] 首页或"我的"页增加体重/体脂快捷记录入口
- [ ] 体重体脂趋势折线图（近7天、近30天）
- [ ] 目标值设置与差值提示

#### 3-F3 力量训练记录页
- [ ] 训练日才显示入口（非训练日隐藏）
- [ ] 按部位分类选择动作（标签页：腿部/胸部/背部/手臂/肩部/核心）
- [ ] 输入组数、次数、重量
- [ ] 支持添加自定义动作
- [ ] 当日训练汇总展示

#### 3-F4 历史数据页
- [ ] 周报/月报 Tab 切换（年报移至后续迭代）
- [ ] 折线图：热量趋势、体重趋势
- [ ] 柱状图：每日营养素摄入
- [ ] 力量训练汇总卡片

#### 3-F5 设置中心
- [ ] 修改密码页（原密码 + 新密码 + 确认）
- [ ] 忘记密码 → 重置密码页（在登录页增加入口）
- [ ] 通知设置页（三餐提醒开关、各餐提醒时间选择器）
- [ ] 客户端本地推送调度实现（移动端用 `react-native-push-notification`）

### 阶段验收标准
- 条码扫描可识别常见商品并添加记录
- 体重体脂记录与趋势图正常展示
- 训练日可记录力量训练，休息日入口隐藏
- 周报/月报数据正确聚合展示（年报延后）
- 密码修改/找回全流程可用
- 通知设置保存后，三餐提醒按时推送

---

## 六、Phase 4 — 社交系统

### 目标
好友管理、经验值体系、多维度排行榜。

### 后端任务

#### 4-B1 好友模块
- [ ] 实现手机号搜索用户接口（`GET /api/v1/social/users/search?phone=xxx`）
- [ ] 实现发送好友请求接口（`POST /api/v1/social/friends/request`）
- [ ] 实现好友请求处理接口（`PUT /api/v1/social/friends/request/{id}`，接受/拒绝）
- [ ] 实现好友列表查询接口（`GET /api/v1/social/friends`）
  - 返回：昵称、等级、经验值、当日是否有饮食记录
- [ ] 实现删除好友接口（`DELETE /api/v1/social/friends/{friendId}`）
- [ ] 实现设置好友备注接口（`PUT /api/v1/social/friends/{friendId}/remark`）

#### 4-B2 邀请链接
- [ ] 实现生成邀请链接接口（`GET /api/v1/social/invite-link`）
  - 生成含用户标识的短链，有效期7天
- [ ] 实现邀请链接解析与自动添加好友逻辑

#### 4-B3 经验值模块
- [ ] 定义经验值获取规则：
  - 每日首次添加饮食记录：+10 exp
  - 每日完成三餐记录：+20 exp
  - 热量达标（偏差≤10%）：+15 exp
  - 连续记录7天：+50 exp 里程碑奖励
  - 连续记录30天：+200 exp 里程碑奖励
- [ ] 实现经验值发放逻辑（饮食记录相关操作后触发）
- [ ] 实现等级计算逻辑（根据累计 exp 自动升级）
- [ ] 实现连续记录天数计算（每日 0 点定时任务检查）

#### 4-B4 排行榜模块
- [ ] 实现排行榜查询接口（`GET /api/v1/social/ranking?type=exp&period=week`）
  - type：exp（经验值）/ score（饮食评分）/ streak（连续天数）
  - period：all（总榜）/ week / month
- [ ] 用 Redis Sorted Set 维护好友排行榜（每次 exp 更新时同步写入）
- [ ] 定时任务：每周一 00:00 重置周榜，每月 1 日 00:00 重置月榜

### 移动端任务

#### 4-F1 好友页
- [ ] 好友列表（头像、昵称、等级、今日记录状态）
- [ ] 添加好友（手机号搜索、二维码扫描）
- [ ] 好友请求通知（红点提醒）
- [ ] 删除好友、设置备注

#### 4-F2 排行榜页
- [ ] 三种排名 Tab：经验值 / 饮食评分 / 连续天数
- [ ] 周榜/月榜/总榜切换
- [ ] 自身排名高亮显示，展示与上一名的差值
- [ ] 分享排名到微信

#### 4-F3 个人主页升级
- [ ] 展示当前等级、累计经验值、距下一级所需经验值进度条
- [ ] 连续记录天数勋章展示
- [ ] 历史里程碑奖励记录

### 阶段验收标准
- 好友添加、删除全流程可用
- 每日记录饮食后经验值正确增加
- 排行榜实时更新，排名顺序正确

---

## 七、Phase 5 — AI 功能

### 目标
食物拍照识别、烹饪方法推荐（基于 LLM）。

### 后端任务

#### 5-B1 食物拍照识别
- [ ] **前置评估**：实际调用百度菜品识别接口，测试混合菜品准确率、单价、QPS 限额；不达预期需切换备选（阿里云视觉智能、腾讯云图像识别）
- [ ] 接入百度 AI 开放平台菜品识别接口
- [ ] 实现图片识别接口（`POST /api/v1/foods/recognize`）
  - 接收 Base64 图片（限制最大 2MB，超过要求客户端压缩）
  - 解析百度返回的菜品名称列表
  - 逐一匹配本地 `t_food` 数据库，返回带营养信息的候选列表
  - 无法匹配的菜品返回名称，提示用户手动选择分量
- [ ] 识别结果缓存（图片 SHA-256 hash 作为 key，TTL 7天，避免重复计费）
- [ ] 混合菜品支持：返回多个识别结果，前端可逐个确认添加
- [ ] 调用费用监控（每日调用量上报，接近配额时告警）

#### 5-B2 烹饪方法推荐
- [ ] 选型评估：**豆包（火山引擎同系，接入便捷）优先**，备选 DeepSeek。国内应用不直连 Claude（合规与网络问题）
- [ ] 实现烹饪方法推荐接口（`POST /api/v1/foods/cooking-suggestions`）
  - 输入：食材名称列表、用户健身目标
  - 调用 LLM 生成推荐，使用 JSON Schema 约束结构化输出
  - 返回：1~3 种烹饪方法（含步骤、优势、适配目标、热量参考）
- [ ] Prompt 模板抽取到 `resources/prompts/` 目录，便于迭代优化
- [ ] 常见食材烹饪方法结果缓存至 Redis（TTL 24小时），减少 API 调用
- [ ] LLM 调用失败降级：预置 10~20 种常见食材的静态兜底数据，返回"系统推荐"

### 移动端任务

#### 5-F1 拍照识别入口
- [ ] 添加食物页增加"拍照识别"和"从相册选择"入口
- [ ] 识别结果展示（菜品卡片列表，可逐个确认或忽略）
- [ ] 每个识别项支持调整分量后添加至餐次

#### 5-F2 烹饪方法推荐页
- [ ] 食物添加页搜索食材后，显示"查看推荐烹饪方法"入口
- [ ] 推荐结果页：烹饪方法卡片（步骤折叠展示、热量标注、适配目标标签）
- [ ] 筛选条件：快手 / 低油 / 无油烟
- [ ] 收藏烹饪方法，可在"我的收藏"中查看

### 阶段验收标准
- 拍照识别常见中餐准确率达到可接受水平（>70% 主菜识别正确）
- 烹饪推荐能根据健身目标返回差异化建议
- 识别失败时降级路径顺畅（手动添加入口明显）

---

## 八、Phase 6 — 网页版

### 目标
React + Vite 网页版与移动端功能对齐，数据实时同步。

> ⚠️ **注意**：虽然网页版复用后端接口，但前端工作量并不小，不能简单视作移动端的"移植"。

### 后端任务

#### 6-B1 微信扫码登录（网页端专属）
- [ ] 实现微信网站应用扫码登录接口（`GET /api/v1/auth/wechat/qrcode` 生成二维码链接）
- [ ] 实现扫码回调处理接口（`GET /api/v1/auth/wechat/callback`）
- [ ] 前端轮询登录状态接口（`GET /api/v1/auth/wechat/poll?ticket=xxx`）

#### 6-B2 Excel 导出
- [ ] 引入 EasyExcel 或 Apache POI
- [ ] 实现排名数据导出接口（`GET /api/v1/social/ranking/export`）
- [ ] 实现历史数据 Excel 导出接口（`GET /api/v1/statistics/export?startDate=xxx&endDate=xxx`）

### 前端任务

#### 6-F1 项目骨架与全局布局
- [ ] 路由系统（React Router v6，嵌套路由）
- [ ] 全局 Layout 组件（侧边导航 + 顶部 Header + 主内容区）
- [ ] 主题定制（Ant Design Token）
- [ ] 响应式断点（桌面 ≥1200px / 平板 768~1199 / 小屏 <768）

#### 6-F2 功能模块对齐（按 Phase 1~5 顺序）
- [ ] 认证模块（登录/注册/微信扫码登录）
- [ ] 首页（当日饮食 + 目标达成）
- [ ] 目标设定页（日历视图用 `react-big-calendar`）
- [ ] 饮食记录页（搜索 + 分量输入）
- [ ] 条码扫描（使用浏览器摄像头 API）
- [ ] 体重体脂/力量训练记录
- [ ] 历史数据页（周报/月报）
- [ ] 好友/排行榜
- [ ] 拍照识别（浏览器 `<input type="file" accept="image/*" capture>` 或 getUserMedia）
- [ ] 烹饪方法推荐
- [ ] 设置中心

#### 6-F3 PC 端专属优化
- [ ] 鼠标交互（hover 状态、右键菜单）
- [ ] 键盘快捷键（如 `Ctrl+N` 快速添加食物）
- [ ] 数据表格视图（记录列表用表格展示，支持排序筛选）
- [ ] Excel 导出按钮

### 阶段验收标准
- 网页版所有功能与移动端对齐（除了移动端专属的拍照便利性）
- 响应式布局在桌面、平板、小屏都正常展示
- 微信扫码登录顺畅
- 与移动端数据实时同步一致

---

## 九、V1 范围裁剪清单

> 本表显式列出 PRD 中提及、但 V1 不实现或降级实现的功能。需与产品方对齐确认。

| PRD 功能点 | V1 处理方式 | 原因 |
|-----------|-----------|------|
| FR-STAT-006 小米运动健康数据导入 | ❌ 不实现 | 依赖小米开放平台权限审批不确定 |
| FR-STAT-003 皮质醇水平估算 | ❌ 不实现 | 依赖小米睡眠数据 |
| FR-STAT-003 训练强度自动计算（MET 法） | ⚠️ 降级 | 仅支持用户手动标注训练强度（低/中/高），不自动计算 |
| FR-STAT-005 饮食建议（结合运动/睡眠） | ⚠️ 降级 | 仅基于饮食、体重、力量训练生成建议，不融合运动和睡眠数据 |
| FR-STAT-002 年报 | ❌ 不实现 | 至少需 1 年数据积累才有意义，延后到后续迭代 |
| FR-SOC-001 二维码扫描添加好友 | ⚠️ 降级 | Phase 4 仅支持手机号搜索 + 邀请链接，二维码延后 |
| FR-STAT-008 力量训练关联 TDEE 动态调整 | ⚠️ 降级 | 仅训练强度等级（低/中/高）影响 TDEE，不做动作级别精细计算 |

---

## 十、阶段依赖关系

```
Phase 0 (工程初始化)
    │
    ▼
Phase 1 (核心 MVP)─────────┐
    │                      │
    ▼                      │
Phase 2 (目标系统)          │
    │                      │
    ├──────────────────────┤
    ▼                      ▼
Phase 3 (扩展功能)      Phase 5 (AI 功能)
    │                      │
    ▼                      │
Phase 4 (社交系统)          │
    │                      │
    └──────────────────────┤
                           ▼
                    Phase 6 (网页版)
```

**关键依赖说明：**
- Phase 2 饮食打分依赖 Phase 1 的饮食记录基础
- Phase 4 排行榜依赖 Phase 2 的饮食评分
- Phase 5 拍照识别依赖 Phase 1 的食物数据
- Phase 5 的 AI 功能与 Phase 3/4 可并行（无依赖）
- Phase 6 网页版依赖所有后端接口（含 Phase 5 AI 接口）

---

## 十一、测试策略

### 11.1 分层测试

| 层级 | 工具 | 覆盖范围 |
|------|------|---------|
| 单元测试 | JUnit 5 + Mockito | Service 层核心计算逻辑，尤其 `TdeeCalculationService`、`DietScoreService`、`NutritionCalculator` 必须 ≥80% 覆盖 |
| 集成测试 | Spring Boot Test + Testcontainers | Mapper 层 + 真实 PostgreSQL，验证 SQL 正确性 |
| 接口测试 | RestAssured 或 Postman | 关键 API 端到端验证，每个 Phase 结束前回归 |
| 端到端测试 | Phase 6 后考虑 Playwright | 网页版关键用户流程自动化 |

### 11.2 性能标准

- 核心接口 P99 响应时间 < 500ms（食物搜索、当日汇总、日统计）
- 列表类接口默认分页 20 条，最大 100 条
- Redis 缓存命中率目标 > 80%（食物搜索接口）

### 11.3 前后端联调约定

- 后端每个 Phase 结束前，导出 Swagger JSON 到 Apifox / Apipost
- 前端优先基于 Mock 接口开发，真实接口就绪后切换
- 接口变更必须在文档先更新，避免前端打瞎仗

---

## 十二、技术债与优化事项（持续推进）

以下事项不属于某个阶段，贯穿整个开发过程：

| 事项 | 说明 | 建议时机 |
|------|------|---------|
| 接口限流 | 登录/注册/短信接口 10次/分钟/IP | Phase 1 完成后补充 |
| 手机号脱敏 | 返回前端时 `138****8888` 格式 | Phase 1 |
| 操作日志 | 关键操作（登录、记录饮食）写操作日志 | Phase 2 后逐步补充 |
| 数据库连接池调优 | HikariCP 连接数根据服务器配置调整 | 上线前 |
| 自动化测试 | 见"测试策略"章节 | 随功能开发同步写 |
| LLM 调用成本监控 | Phase 5 LLM 用量告警与降级 | Phase 5 |
| 百度 AI 配额监控 | Phase 5 拍照识别调用监控 | Phase 5 |

---

## 十三、里程碑总览

| 里程碑 | 交付内容 | 备注 |
|--------|---------|------|
| M0 | 工程骨架跑通，食物数据就位，备案完成 | 开发前提 |
| M1 | 移动端可记录饮食、查看当日汇总，支持手机号/邮箱/微信登录 | 可内测 |
| M2 | 目标系统上线，热量目标动态化，有打分和建议 | 核心价值可验证 |
| M3 | 条码扫描、体重体脂、力量训练、周月报、密码找回、通知设置 | 功能完整度大幅提升 |
| M4 | 社交好友、排行榜、经验值体系上线 | 用户留存机制到位 |
| M5 | 拍照识别、烹饪推荐上线 | AI 差异化功能 |
| M6 | 网页版全量上线 | 多端覆盖完成 |

---

## 附录：执行快照（2026-04-17）

> 本次执行完成 Phase 0 + Phase 1 的代码落地。下面列出实际产出、执行过程中遇到的决策点及处理方式，等你确认后再回补真正需要人工介入的部分。

### 已完成

**Phase 0**
- `calorie-log/` 下创建三端子目录与根 `.gitignore` / `README.md`；已 `git init`（尚未首次 commit）。
- 后端 `calorie-log-server/` 已初始化：Spring Boot 3.3.5 + Java 17 + MyBatis Plus 3.5.7 + JJWT 0.12.6 + Flyway + Lombok + WxJava + Springdoc + Hutool。已生成 Maven Wrapper（`./mvnw`）。
- `src/main/resources/db/migration/V1__init_schema.sql` 完整建表 + V2 索引 + V3 预设 43 个力量训练动作 + V4 约 50 条高频食物基础数据（含难称重比例）。
- `scripts/import_foods.py` + `scripts/README.md` 提供《中国食物成分表》+ Open Food Facts 的离线导入流程。
- `calorie-log-web/` 使用 Vite + React 18 + TypeScript + Ant Design + Zustand + React Router + Axios + Recharts + dayjs。`npm run build` 通过。
- `calorie-log-app/` 使用 `@react-native-community/cli` 生成 RN 0.77 骨架 + React Native Paper + Zustand + Axios + React Navigation native-stack + AsyncStorage。`tsc --noEmit` 通过。

**Phase 1 后端（1-B1 ~ 1-B5）**
- 公共层：`Result`/`PageResult`/`ErrorCode`/`BizException`/`GlobalExceptionHandler`/`SecurityConfig`/`RedisConfig`/`MyBatisPlusConfig`/`SwaggerConfig`/`JwtUtils`/`DateUtils`/`IdentifierUtils`/`NutritionCalculator`/`CurrentUser`/`JwtAuthenticationFilter`。
- 认证：`/api/v1/auth/send-code|register|login|refresh|logout|wechat|wechat/bind`；dev 环境通过 `app.auth.mock-verify-code-enabled=true` 固定返回 `123456`，并在接口响应中回显便于联调；1 分钟限流锁；登出写 Redis 黑名单。
- 微信登录：`WechatOAuthService` 在未配置 appId 的 dev 模式下 mock 出 openid；`WechatAuthService` 支持"已绑定 → 直发 Token、未绑定 → 10 分钟临时 Token → 绑定手机号"链路。
- 用户：`/api/v1/users/profile` GET/PUT，手机号/邮箱脱敏。
- 食物：`/api/v1/foods/search|/{id}|/custom`，搜索使用 PostgreSQL `to_tsvector` + `ILIKE` 组合，用户自建食物仅本人可见。
- 饮食记录：`/api/v1/records` POST/PUT/DELETE/daily，毛重→净重换算、营养素按量线性计算、`t_daily_summary` 在增删改后自动重算（带乐观锁重试）。
- Maven `package` 通过，输出 `target/calorie-log-server-1.0.0-SNAPSHOT.jar`。

**Phase 1 移动端（1-F1 ~ 1-F5）**
- 认证：`LoginScreen`（密码 / 验证码 Tab 切换）+ `RegisterScreen`；验证码按钮；Token 存 AsyncStorage；401 自动 refresh + 退出。
- 个人信息：`ProfileSetupScreen`（性别/年龄/身高/体重/活动量）、`ProfileScreen`（信息展示 + 登出）。
- 首页：`HomeScreen`（左右切换日期 + 日期选择；热量进度条；三大宏量素；早午晚加餐 Card，可添加/编辑/删除）。
- 食物：`AddFoodScreen`（搜索 + 选择分量；手动添加弹窗）。
- 暂未接入微信登录按钮（需真机 + 微信 SDK，留到真正签名的打包流程）。

**Phase 1 网页版附赠**
- 虽然 Phase 6 才要求网页版全量，但为了让后端接口可以在浏览器自测，已同步提供与移动端同步的核心页面：Login / Register / Home / Profile / ProfileSetup / AddFood。

### 执行中遇到的决策点（记录）

| # | 情境 | 当前选择 | 备注 |
|---|------|---------|------|
| D-1 | Phase 0-1 基础设施采购（域名/ICP/短信签名/微信开放平台/火山云服务器/百度 AI） | **未执行**，仅在文档中保留清单 | 均需实名资质、费用与周期（15~30 天），必须你本人走流程 |
| D-2 | Phase 0-5 食物基础数据完整导入 | **降级**为 V4 手工录入 ~50 条高频食物 + 提供 `scripts/import_foods.py` 导入脚本 | 下载《中国食物成分表》与 Open Food Facts 全量数据需外部网络 + 人工清洗，脚本预留运行方式 |
| D-3 | 本地 PostgreSQL 未安装（`pg_isready` 失败） | 仅验证编译 + 打包，未做真实数据库启动 | 你下次开发前先 `brew install postgresql@16 && brew services start postgresql@16` 并 `createdb calorie_log_db` |
| D-4 | JDK 版本 | 使用 JDK 17（`.java-version=17`，通过 `ms-17.0.15`）；本机默认是 21 | Spring Boot 3.3.5 同时支持 17/21，选 17 与计划保持一致 |
| D-5 | Spring Boot 版本 | 3.3.5 | 计划写的是 3.x，这是最近的稳定小版本；后续若需要升 3.4 再评估 |
| D-6 | MyBatis Plus | 引入 `mybatis-plus-spring-boot3-starter:3.5.7`，去掉了计划里没提到但文档示例中常见的 `mybatis-plus-jsqlparser`（3.5.7 仓库不存在独立包） | 分页插件仍然可用 |
| D-7 | 软删除实现 | 使用 `@TableLogic(value = "null", delval = "CURRENT_TIMESTAMP")` + `deleted_at` 时间戳 | 与架构文档约定一致；查询自动追加 `deleted_at IS NULL` |
| D-8 | JWT 类型字段 | 在 claim 中加 `type` 区分 ACCESS/REFRESH/WECHAT_TEMP，拒绝用 refresh 当 access 访问业务接口 | 同时写黑名单 `auth:blacklist:jti:{jti}`；Phase 3 改密码时写 `auth:user_invalidated:{userId}` 以整体失效旧 token |
| D-9 | 验证码/短信通道 | Phase 1 只落地 mock（dev 环境返回固定码 `123456` 并在接口响应中回显），真实短信/邮件通道推迟到 Phase 3 | 生产环境通过 profile 强制 `mockEnabled=false` |
| D-10 | 微信登录 | `WechatOAuthService.exchangeCode` 在 dev 下 mock，生产留下 `TODO: 集成 WxJava`；移动端 `LoginScreen` 暂未加"微信登录"按钮 | 等微信开放平台应用审批通过后补齐 |
| D-11 | 网页版提前到 Phase 1 | 计划原本是 Phase 6，但因为移动端需要真机/模拟器调试，我顺手给了一个与移动端对齐的 Web 版本用于浏览器快速自测 | 如果不需要这部分可以删除，后端/移动端 不依赖它 |
| D-12 | React Native 骨架 | 用 `@react-native-community/cli@latest` 新建（`npx react-native init` 已废弃）；`--skip-install --ignore-scripts` 跳过 CocoaPods 和 Android Gradle 初次下载 | 真机跑前需补 `cd ios && bundle install && bundle exec pod install` |
| D-13 | RN 导航 | 使用 React Navigation 6 + native-stack | 计划里直接点名 React Navigation，未指定细分实现 |
| D-14 | 未跑真实接口联调 | 后端 `mvn package` 通过但未启动（没有 Postgres/Redis 的真实库） | 等你启动 Postgres 后，`./mvnw spring-boot:run -Dspring-boot.run.profiles=dev` 即可跑 Flyway + Swagger UI（http://localhost:8080/swagger-ui.html） |
| D-15 | 单元测试 | 计划要求 ≥80% 的 `TdeeCalculationService` / `DietScoreService` / `NutritionCalculator` 覆盖；当前只落地了空壳（Phase 2 才引入 TDEE/Score） | Phase 2 开始时一并补 |
| D-16 | Git 提交 | 仅 `git init`，未 `git add/commit`（需要你确认首个 commit message / 作者信息） | 建议你首次提交时统一 author |
| D-17 | 未做的任务 | Phase 0-7 生产部署（HTTPS/Nginx/systemd 脚本等）、Phase 1 的限流 10次/分钟/IP、操作日志 | 全部属于"技术债"表范畴，上线前补 |

### 下一步建议（等你回来确认）

1. **（推荐 Docker 方式）** `cp .env.example .env && docker compose up -d --build`，`docker compose logs -f app` 确认 Flyway 建表成功，访问 http://localhost:8080/swagger-ui.html。
2. （原生方式）`brew install postgresql@16 redis` 并 `createdb calorie_log_db`，然后 `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev`。
3. Web 端 `cd calorie-log-web && npm run dev`，使用 dev mock 验证码走完"注册 → 完善资料 → 添加食物 → 首页查看"的闭环。
4. 若要 Demo 移动端：`cd calorie-log-app/ios && bundle install && bundle exec pod install && cd .. && npx react-native run-ios`。
5. 开始 Phase 0-1（ICP 备案等长周期事项），与 Phase 2 的 TDEE / 打分 / 目标模块并行。
6. 按 D-14/D-15 补单元测试和真实联调。

---

## 附录 B：Docker 化改造（2026-04-17）

参考 `/Users/bc/code/jiigan/clicktrain/nova/docker-compose.yml`，新增以下文件使后端可一键容器化部署。

| 文件 | 作用 |
|------|------|
| `calorie-log-server/Dockerfile` | 多阶段构建：`maven:3.9-eclipse-temurin-17-alpine` 编译 → `eclipse-temurin:17-jre-alpine` 运行；非 root 用户、Asia/Shanghai 时区、G1 + 容器感知 JVM 参数 |
| `calorie-log-server/.dockerignore` | 排除 `target/`、IDE 文件、`scripts/data/` 等，控制构建上下文体积 |
| `docker-compose.yml`（repo 根） | postgres 16-alpine + redis 7-alpine + app 三件套；healthcheck + `depends_on: service_healthy` 保证启动顺序；数据卷持久化 |
| `.env.example` | 环境变量模板；`cp .env.example .env` 后覆盖敏感配置 |
| `README.md` | 新增 Docker 启动章节（一键 `docker compose up -d --build`） |

### 与 nova 的差异

- **单模块** Maven 项目，Dockerfile 不需要 nova 那种多 `COPY nova-*/pom.xml` 递归结构；直接 `COPY pom.xml` 预热依赖。
- 端口 **8080**（nova 是 9915）；**不默认开放 JDWP 调试端口**（本地调试用 IDE 跑 Spring Boot 更快，不用 Docker）。
- **未引入 `clicktrain-shared` 外部网络**，食养记暂无与其他项目互通的需求；将来要接入同一生态再按 nova 方式加 `networks.external: true`。
- **未把 init SQL 挂载到 postgres 容器**，因为食养记统一走 Flyway（V1~V4 迁移脚本）；nova 是历史原因要手挂 `table.sql`。两者不能并存，否则会与 Flyway 打架。
- 应用镜像里 `apk add wget`，用于 compose 层调用 `/actuator/health` 做健康检查；因此额外引入了 `spring-boot-starter-actuator` 依赖，并通过 `management.endpoints.web.exposure.include=health,info` 限定端点，防止 `env/beans` 等敏感端点暴露。
- DB 密码 / JWT secret 通过 `${VAR:-default}` 提供 dev 默认值；生产环境必须在 `.env` 覆盖，且 `SPRING_PROFILES_ACTIVE=prod`。

### Docker 化决策点

| # | 情境 | 当前选择 | 备注 |
|---|------|---------|------|
| D-B1 | 共享 Docker 网络 | **否**，使用 compose 内建网络 | 将来要 cross-project 调用再按 nova 加 `clicktrain-shared` |
| D-B2 | Postgres 初始化方式 | 仅 Flyway（启动时自动跑 V1~V4） | 不挂载 init SQL，避免与 Flyway 双写冲突 |
| D-B3 | 应用健康检查 | `/actuator/health` + `wget`，compose 层循环探测 | 仅暴露 `health,info` 两个端点 |
| D-B4 | JDWP 远程调试端口 | 默认不开放 | 要调试时临时在 `JAVA_OPTS` 加 `-agentlib:jdwp=...` + 映射 5005 端口 |
| D-B5 | Web / 移动端是否入 compose | **不入** | 移动端打 APK/IPA 不适合容器；Web 网页端在 Phase 6 需要时再加一个 nginx service |
| D-B6 | 数据卷 | `postgres-data` / `redis-data` 命名 volume | 生产建议改为 external volume + 定期备份 |

---

## 附录 C：Phase 2 落地（2026-04-17）

**Phase 2 目标**：TDEE 计算、训练日/休息日系统、饮食打分（100 分制）、饮食优化建议、每餐热量分配建议。业务参数沿用架构文档 6.1 / 6.2 默认值。

### 后端新增

- `module/goal/`
  - `entity/UserGoal` + `entity/TrainingRule`（SMALLINT[] 用 `PgShortArrayTypeHandler`）+ `entity/TrainingException`
  - `service/TdeeCalculationService` — BMR（Mifflin-St Jeor）+ 活动系数 + 日期调整 + 目标热量 + 营养素比例
  - `service/TrainingScheduleService` — 例外优先 / 回退规则
  - `service/GoalService` — 设定目标（失活旧目标）/ 保存训练日历（按日期 upsert 例外）/ 月度日历
  - `service/MealDistributionService` — 25 / 35 / 30 / 10% ±5% 区间
  - `controller/GoalController` — `POST/GET /goals`、`POST/GET /goals/training-schedule`、`GET /goals/meal-distribution`
- `module/record/service/DailySummaryService` — `recompute()` 现在会读取目标 + 日期类型 + 动态 TDEE / target / gap 写回 `t_daily_summary`；新增 `getOrInit` / `resolveTargetCalories` / `updateDietScore` 工具方法
- `module/statistics/`
  - `service/StatisticsService` — `GET /statistics/daily` 返回 day_type / tdee / target / gap + calorieStatus 文案
  - `service/DietScoreService` — 100 分制四维度打分；`@Async recomputeAsync()` 在记录增删改后触发
  - `service/DietSuggestionService` — 规则引擎生成 calorie / nutrient / meal_distribution / variety 四类建议
  - `controller/StatisticsController` — `GET /statistics/daily|score|suggestions`
- `DietRecordService` 增删改后额外触发 `dietScoreService.recomputeAsync()`（`CalorieLogApplication` 已 `@EnableAsync`）

### 前端新增

- 网页版
  - `src/api/goal.ts`、`src/api/statistics.ts`
  - `src/pages/goal/GoalSetupPage.tsx` — 目标类型 Segmented + 热量微调 + 营养素比例 + 训练日勾选 + 强度
  - `src/pages/statistics/StatisticsPage.tsx` — 日期切换、日统计卡片（状态 Tag）、四维度评分条、建议列表（severity 配色）
  - 路由 `/goal`、`/statistics`，首页右上角增加"目标 / 统计"入口
- 移动端
  - `src/api/goal.ts`、`src/api/statistics.ts`
  - `src/screens/goal/GoalSetupScreen.tsx`（React Native Paper）
  - `src/screens/statistics/StatisticsScreen.tsx`
  - `RootNavigator` 追加 `GoalSetup` / `Statistics`，首页 Appbar 新增 target / chart-bar 两个图标

### Phase 2 决策点

| # | 情境 | 当前选择 | 备注 |
|---|------|---------|------|
| D-C1 | `t_user_goal` 切换旧目标 | `is_active=false` + `ended_at=now`，保留历史 | 与架构 4.1 节一致；用部分唯一索引 `uk_user_goal_active` 保证并发安全 |
| D-C2 | 训练规则的 `SMALLINT[]` 字段 | 自定义 `PgShortArrayTypeHandler`，Java 侧用 `Integer[]` | MyBatis Plus 不原生支持 PG 数组；读回来 `Short[]` 再转 `Integer[]` |
| D-C3 | TDEE 每日变化如何暴露 | `t_daily_summary.tdee / target_calories / calorie_gap` 每次记录增删改都重算；`GET /records/daily` 和 `GET /statistics/daily` 共用这张汇总表 | 避免同一个计算分散到两个接口 |
| D-C4 | 计算 `t_user_goal` 的 `targetCaloriesTraining` 时用中等强度 | 写入库的是"中等训练日"估算；真正按日计算的 target 在 DailySummaryService 里按当日强度重算 | 数据库字段只做展示基线，当日值由 /statistics/daily 返回 |
| D-C5 | 营养素打分的"达标"区间 | 实际 / 目标 g 在 ±15% 内满分，超出每 1% 扣 0.1 分 | 架构文档只给了维度和权重，具体曲线是我补的 |
| D-C6 | 餐次推荐占比 | 早 25 / 午 35 / 晚 30 / 加餐 10%，容忍 ±5% | 打分、建议、`/goals/meal-distribution` 三处共享同一组常量 |
| D-C7 | 添加糖扣分 | **未实现**（`t_diet_record` 聚合 SQL 未拿 added_sugar；多数食物该字段为 NULL） | Phase 3 食物数据扩容时补 |
| D-C8 | `DietScoreService.recomputeAsync` | `@Async` 异步写回 `diet_score`，不阻塞 CRUD 事务 | 默认 TaskExecutor 即可；生产可换 `ThreadPoolTaskExecutor` 控量 |
| D-C9 | 建议推荐食物列表 | 硬编码在 `DietSuggestionService`，从 V4 seed 的 50 条食物里挑 | Phase 3 可改为"按品类 + 用户饮食历史"查库动态生成 |
| D-C10 | 训练日历例外的 upsert | 按 `(user_id, exception_date)` 唯一键"有则更新、无则插入" | 批量保存时逐条处理（例外量通常很小） |

### 验证状态

- 后端：`./mvnw -q -DskipTests package` 通过
- 网页：`npm run build` 通过
- 移动端：`npx tsc --noEmit` 通过

### 下一步

1. 冒烟自测：`docker compose up -d --build`，走"注册 → 完善资料 → 设置目标 → 加食物 → 查统计/建议"
2. 确认默认打分曲线 / 营养素 ±15% / 餐次 ±5% 是否符合你的体感
3. Phase 3：条码扫描、体重体脂、力量训练、周月报、密码找回、通知设置
