# 食养记 - 系统架构设计文档 V1.0

创建日期：2026年4月16日  
文档状态：草稿

---

## 1. 整体架构概览

```
┌─────────────────────────────────────────────────────┐
│                     客户端层                          │
│   ┌─────────────────┐      ┌─────────────────┐      │
│   │  移动端 App      │      │    网页版         │      │
│   │ React Native    │      │  React + Vite   │      │
│   │ (iOS / Android) │      │  (SPA)          │      │
│   └────────┬────────┘      └────────┬────────┘      │
└────────────┼───────────────────────┼────────────────┘
             │         HTTPS         │
┌────────────▼───────────────────────▼────────────────┐
│                    服务端层（单体）                    │
│              Spring Boot 3.x (Java 17)              │
│                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │用户管理   │ │饮食记录   │ │目标设定   │            │
│  │模块      │ │模块      │ │模块      │            │
│  └──────────┘ └──────────┘ └──────────┘            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │数据统计   │ │社交互动   │ │基础设置   │            │
│  │模块      │ │模块      │ │模块      │            │
│  └──────────┘ └──────────┘ └──────────┘            │
└──────────────────────────────────────────────────────┘
             │                       │
┌────────────▼──────┐   ┌────────────▼────────────────┐
│   PostgreSQL 16   │   │         Redis 7              │
│  - 用户数据        │   │  - JWT Token 黑名单          │
│  - 饮食记录        │   │  - 排行榜 Sorted Set         │
│  - 食物数据库      │   │  - 接口缓存（食物数据）       │
│  - 统计数据        │   │  - 会话限流                  │
└───────────────────┘   └─────────────────────────────┘
             │
┌────────────▼──────────────────────────────────────┐
│               外部服务                              │
│  微信开放平台 │ 百度菜品AI │ VeSMS短信 │ LLM API      │
└───────────────────────────────────────────────────┘
```

---

## 2. 技术选型

### 2.1 客户端

| 端 | 技术 | 说明 |
|----|------|------|
| 移动端 | React Native 0.74+ | 一套代码编译 iOS / Android |
| 网页版 | React 18 + Vite 5 | SPA，登录后的数据操作型应用，无 SEO 需求 |
| 移动端状态管理 | Zustand | 轻量，适合中型应用 |
| 网页端状态管理 | Zustand | 与移动端统一，共享部分 store 逻辑 |
| HTTP 客户端 | Axios | 统一封装请求拦截、Token 刷新 |
| 图表库 | Victory Native（移动端） / Recharts（Web） | |
| UI 组件 | React Native Paper（移动端） / Ant Design（Web） | |

### 2.2 服务端

| 类目 | 技术 | 版本 |
|------|------|------|
| 语言 | Java | 17 LTS |
| 框架 | Spring Boot | 3.x |
| ORM | MyBatis Plus | 3.5.x |
| 认证 | Spring Security + JWT | JJWT 0.12.x |
| 数据库 | PostgreSQL | 16 |
| 缓存 | Redis | 7.x（via Spring Data Redis） |
| 定时任务 | Spring Scheduler | 内置 |
| 参数校验 | Spring Validation（Hibernate Validator） | 内置 |
| API 文档 | Springdoc OpenAPI（Swagger UI） | 2.x |
| 数据库迁移 | Flyway | 10.x |
| 日志 | SLF4J + Logback | 内置 |

> V1 阶段不引入对象存储。用户头像微信登录直接沿用微信头像 URL，手机号注册使用默认头像；食物拍照识别图片以 Base64 直传 AI 接口，无需持久化。

### 2.3 外部服务依赖

| 服务 | 用途 | 备注 |
|------|------|------|
| 微信开放平台 | 微信登录（移动端授权 + 网页扫码） | 接入 WxJava 库 |
| 百度 AI 开放平台 | 食物拍照识别（菜品识别接口） | Phase 5 阶段实现 |
| LLM API（豆包 / DeepSeek 择一） | 烹饪方法推荐 | Phase 5 阶段实现；国内应用不直连 Claude |
| Open Food Facts | 商品条形码数据（开源，可下载全量数据本地化） | 补充中国商品数据 |
| 火山引擎 VeSMS | 注册/登录验证码短信 | 与云服务器同云厂商 |
| 小米开放平台 | 运动健康数据导入 | 后续迭代，V1 不实现 |

---

## 3. 服务端项目结构

```
calorie-log-server/
├── src/main/java/com/calorieLog/
│   ├── CalorieLogApplication.java          # 启动类
│   │
│   ├── common/                             # 公共基础设施
│   │   ├── result/
│   │   │   ├── Result.java                 # 统一响应体 { code, message, data }
│   │   │   └── PageResult.java             # 分页响应体
│   │   ├── exception/
│   │   │   ├── GlobalExceptionHandler.java # 全局异常处理
│   │   │   ├── BizException.java           # 业务异常
│   │   │   └── ErrorCode.java              # 错误码枚举
│   │   ├── config/
│   │   │   ├── SecurityConfig.java         # Spring Security 配置
│   │   │   ├── RedisConfig.java
│   │   │   ├── MyBatisPlusConfig.java       # 分页插件等
│   │   │   └── SwaggerConfig.java
│   │   └── utils/
│   │       ├── JwtUtils.java
│   │       ├── NutritionCalculator.java    # BMR / TDEE / 营养素计算工具类
│   │       └── DateUtils.java
│   │
│   ├── module/
│   │   ├── user/                           # 用户管理模块
│   │   │   ├── controller/
│   │   │   │   ├── AuthController.java     # 注册、登录、微信OAuth
│   │   │   │   └── UserController.java     # 个人信息
│   │   │   ├── service/
│   │   │   │   ├── AuthService.java
│   │   │   │   └── UserService.java
│   │   │   ├── mapper/
│   │   │   │   └── UserMapper.java
│   │   │   ├── entity/
│   │   │   │   └── User.java
│   │   │   └── dto/
│   │   │       ├── RegisterDTO.java
│   │   │       ├── LoginDTO.java
│   │   │       └── UserProfileDTO.java
│   │   │
│   │   ├── goal/                           # 目标设定模块
│   │   │   ├── controller/
│   │   │   │   └── GoalController.java
│   │   │   ├── service/
│   │   │   │   ├── GoalService.java
│   │   │   │   └── TdeeCalculationService.java  # TDEE 计算核心逻辑
│   │   │   ├── mapper/
│   │   │   │   ├── UserGoalMapper.java
│   │   │   │   └── TrainingScheduleMapper.java
│   │   │   ├── entity/
│   │   │   │   ├── UserGoal.java
│   │   │   │   └── TrainingSchedule.java
│   │   │   └── dto/
│   │   │
│   │   ├── food/                           # 食物数据模块
│   │   │   ├── controller/
│   │   │   │   └── FoodController.java     # 搜索、条码查询
│   │   │   ├── service/
│   │   │   │   ├── FoodService.java
│   │   │   │   └── FoodRecognitionService.java  # 拍照识别（调外部AI）
│   │   │   ├── adapter/
│   │   │   │   └── FoodDataAdapter.java    # 抽象层，隔离数据来源
│   │   │   ├── mapper/
│   │   │   │   └── FoodMapper.java
│   │   │   └── entity/
│   │   │       └── Food.java
│   │   │
│   │   ├── record/                         # 饮食记录模块
│   │   │   ├── controller/
│   │   │   │   └── DietRecordController.java
│   │   │   ├── service/
│   │   │   │   ├── DietRecordService.java
│   │   │   │   └── GrossNetWeightService.java   # 毛重转净重计算
│   │   │   ├── mapper/
│   │   │   │   └── DietRecordMapper.java
│   │   │   └── entity/
│   │   │       └── DietRecord.java
│   │   │
│   │   ├── statistics/                     # 数据统计与分析模块
│   │   │   ├── controller/
│   │   │   │   └── StatisticsController.java
│   │   │   ├── service/
│   │   │   │   ├── StatisticsService.java
│   │   │   │   ├── DietScoreService.java        # 饮食打分
│   │   │   │   ├── DietSuggestionService.java   # 饮食优化建议
│   │   │   │   ├── BodyDataService.java         # 体重/体脂记录
│   │   │   │   └── StrengthTrainingService.java # 力量训练记录
│   │   │   ├── mapper/
│   │   │   └── entity/
│   │   │
│   │   ├── social/                         # 社交互动模块
│   │   │   ├── controller/
│   │   │   │   └── SocialController.java
│   │   │   ├── service/
│   │   │   │   ├── FriendService.java
│   │   │   │   └── RankingService.java     # 排行榜（依赖 Redis Sorted Set）
│   │   │   └── mapper/
│   │   │
│   │   └── setting/                        # 基础设置模块
│   │       ├── controller/
│   │       └── service/
│   │
│   └── integration/                        # 外部服务集成
│       ├── wechat/
│       │   └── WechatOAuthService.java
│       ├── sms/
│       │   └── SmsService.java
│       ├── ai/
│       │   └── FoodImageRecognitionClient.java  # 百度AI调用
│       └── xiaomi/
│           └── XiaomiHealthClient.java          # 小米运动健康API（后续迭代，暂不实现）
│
├── src/main/resources/
│   ├── application.yml
│   ├── application-dev.yml
│   ├── application-prod.yml
│   ├── mapper/                             # MyBatis XML（复杂查询）
│   └── db/
│       └── migration/                      # Flyway 数据库迁移脚本
│           ├── V1__init_schema.sql
│           ├── V2__init_indexes.sql
│           └── V3__seed_exercises.sql
│
└── src/test/
```

---

## 4. 数据库设计

### 4.1 核心表结构

#### 用户表 `t_user`
```sql
CREATE TABLE t_user (
    id              BIGSERIAL PRIMARY KEY,
    phone           VARCHAR(20),
    email           VARCHAR(100),
    wechat_openid   VARCHAR(100),
    wechat_unionid  VARCHAR(100),
    nickname        VARCHAR(50),
    avatar_url      VARCHAR(500),
    password_hash   VARCHAR(255),
    gender          SMALLINT,           -- 0未知 1男 2女
    age             SMALLINT,
    height          DECIMAL(5,1),       -- cm
    weight          DECIMAL(5,1),       -- kg
    activity_level  SMALLINT,           -- 1极少 2轻度 3中度 4高强度
    timezone        VARCHAR(50) DEFAULT 'Asia/Shanghai', -- 用户时区，用于 record_date 界定
    status          SMALLINT DEFAULT 1, -- 1正常 0禁用
    version         INT DEFAULT 0,      -- 乐观锁版本号
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    deleted_at      TIMESTAMP
);
-- 唯一性约束仅对未删除用户生效，避免注销后手机号无法复用
CREATE UNIQUE INDEX uk_user_phone ON t_user(phone) WHERE deleted_at IS NULL AND phone IS NOT NULL;
CREATE UNIQUE INDEX uk_user_email ON t_user(email) WHERE deleted_at IS NULL AND email IS NOT NULL;
CREATE UNIQUE INDEX uk_user_wechat_openid ON t_user(wechat_openid) WHERE deleted_at IS NULL AND wechat_openid IS NOT NULL;
```

#### 用户目标表 `t_user_goal`

> 设计说明：同一用户仅保留一条有效目标（`is_active=true`）；切换目标时，旧目标不删除，改为 `is_active=false` 并记录 `ended_at`，便于追溯。通过部分唯一索引保证并发安全。

```sql
CREATE TABLE t_user_goal (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES t_user(id),
    goal_type       SMALLINT NOT NULL,  -- 1增肌塑型 2减脂增肌
    bmr             DECIMAL(8,2),
    tdee_base       DECIMAL(8,2),
    target_calories_training  DECIMAL(8,2),  -- 训练日目标热量
    target_calories_rest      DECIMAL(8,2),  -- 休息日目标热量
    protein_ratio   DECIMAL(5,2),       -- 蛋白质占比 %
    carb_ratio      DECIMAL(5,2),       -- 碳水占比 %
    fat_ratio       DECIMAL(5,2),       -- 脂肪占比 %
    is_active       BOOLEAN DEFAULT TRUE,
    started_at      TIMESTAMP DEFAULT NOW(),
    ended_at        TIMESTAMP,          -- 目标切换时填充
    version         INT DEFAULT 0,      -- 乐观锁版本号
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);
-- 每个用户至多一条 active 目标
CREATE UNIQUE INDEX uk_user_goal_active ON t_user_goal(user_id) WHERE is_active = TRUE;
```

#### 训练计划规则表 `t_training_rule`

> 设计说明：拆分为"规则表 + 例外表"两层结构。  
> - 规则表存周期性规律（如每周一三五为训练日），一个用户通常 1 条记录  
> - 例外表存单日覆盖（如某天临时改为休息日），按需增长  
> 查询某日日期类型时：先查例外表，无则按规则表推断。避免按天存 365 条记录的浪费。

```sql
CREATE TABLE t_training_rule (
    id                 BIGSERIAL PRIMARY KEY,
    user_id            BIGINT NOT NULL UNIQUE REFERENCES t_user(id),
    training_weekdays  SMALLINT[] NOT NULL,  -- 训练日的星期数组，如 {1,3,5} 表示周一三五
    default_intensity  SMALLINT DEFAULT 2,   -- 默认训练强度 1低 2中 3高
    effective_from     DATE NOT NULL DEFAULT CURRENT_DATE, -- 规则生效起始日
    version            INT DEFAULT 0,
    created_at         TIMESTAMP DEFAULT NOW(),
    updated_at         TIMESTAMP DEFAULT NOW()
);
```

#### 训练计划例外表 `t_training_exception`

```sql
CREATE TABLE t_training_exception (
    id                 BIGSERIAL PRIMARY KEY,
    user_id            BIGINT NOT NULL REFERENCES t_user(id),
    exception_date     DATE NOT NULL,
    day_type           SMALLINT NOT NULL,  -- 1训练日 2休息日
    training_intensity SMALLINT,           -- 覆盖该日训练强度
    note               VARCHAR(200),
    created_at         TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, exception_date)
);
CREATE INDEX idx_training_exception_user_date ON t_training_exception(user_id, exception_date);
```

#### 食物数据表 `t_food`

数据来源：
- **基础食材**：导入《中国食物成分表》整理版数据（GitHub 可获取，约 1500~2000 条，含热量、蛋白质、碳水、脂肪、膳食纤维等）
- **条形码商品**：导入 Open Food Facts 开源数据库全量数据，本地化存储，避免实时请求外部 API

```sql
CREATE TABLE t_food (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    alias           VARCHAR(200),           -- 别名，用于搜索
    barcode         VARCHAR(50),            -- 条形码（商品专属）
    category        VARCHAR(50),            -- 食物分类
    unit            VARCHAR(20) DEFAULT 'g',

    -- 三大宏量
    calories        DECIMAL(8,2),           -- 每100g热量 kcal
    protein         DECIMAL(8,2),           -- 蛋白质 g
    carbohydrate    DECIMAL(8,2),           -- 碳水 g
    fat             DECIMAL(8,2),           -- 脂肪 g
    dietary_fiber   DECIMAL(8,2),           -- 膳食纤维 g
    added_sugar     DECIMAL(8,2),           -- 添加糖 g（用于打分超标扣分）

    -- 维生素（基础类，每100g）
    vitamin_a       DECIMAL(8,2),           -- μg RAE
    vitamin_b1      DECIMAL(8,2),           -- mg
    vitamin_b2      DECIMAL(8,2),           -- mg
    vitamin_c       DECIMAL(8,2),           -- mg
    vitamin_e       DECIMAL(8,2),           -- mg

    -- 矿物质（基础类，每100g）
    sodium          DECIMAL(8,2),           -- 钠 mg
    potassium       DECIMAL(8,2),           -- 钾 mg
    calcium         DECIMAL(8,2),           -- 钙 mg
    iron            DECIMAL(8,2),           -- 铁 mg
    zinc            DECIMAL(8,2),           -- 锌 mg

    -- 毛重/净重
    is_hard_to_weigh BOOLEAN DEFAULT FALSE, -- 是否难称重食物（需毛重转净重）
    gross_net_ratio  DECIMAL(5,2),          -- 净毛重比例（难称重食物）

    -- 归属与来源
    data_source     VARCHAR(50),            -- cfct（食物成分表）/ off（Open Food Facts）/ user（用户自建）
    created_by      BIGINT REFERENCES t_user(id), -- data_source='user' 时必填，仅创建者可搜到

    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    deleted_at      TIMESTAMP
);
CREATE INDEX idx_food_name ON t_food USING gin(to_tsvector('simple', name));
CREATE INDEX idx_food_barcode ON t_food(barcode) WHERE deleted_at IS NULL;
CREATE INDEX idx_food_created_by ON t_food(created_by) WHERE data_source = 'user';
```

#### 饮食记录表 `t_diet_record`
```sql
CREATE TABLE t_diet_record (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES t_user(id),
    record_date     DATE NOT NULL,  -- 按用户时区界定的当地日期
    meal_type       SMALLINT NOT NULL,  -- 1早餐 2午餐 3晚餐 4加餐
    food_id         BIGINT REFERENCES t_food(id),
    food_name       VARCHAR(100) NOT NULL,  -- 冗余存储，防止食物数据变更影响历史记录
    quantity        DECIMAL(8,2) NOT NULL,  -- 食用量（净重，g）
    gross_quantity  DECIMAL(8,2),           -- 毛重（g，难称重食物）
    calories        DECIMAL(8,2) NOT NULL,
    protein         DECIMAL(8,2),
    carbohydrate    DECIMAL(8,2),
    fat             DECIMAL(8,2),
    dietary_fiber   DECIMAL(8,2),
    added_sugar     DECIMAL(8,2),
    add_method      SMALLINT DEFAULT 1, -- 1搜索 2手动 3拍照 4扫码 5收藏 6烹饪推荐
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    deleted_at      TIMESTAMP
);
CREATE INDEX idx_diet_record_user_date ON t_diet_record(user_id, record_date) WHERE deleted_at IS NULL;
```

#### 每日汇总表 `t_daily_summary`
```sql
-- 预聚合表：每次饮食记录增删改时实时更新，避免统计接口全量聚合
-- 使用 version 字段做乐观锁，避免并发写入脏数据
CREATE TABLE t_daily_summary (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT NOT NULL REFERENCES t_user(id),
    summary_date        DATE NOT NULL,
    day_type            SMALLINT,           -- 1训练日 2休息日
    total_calories      DECIMAL(8,2),
    total_protein       DECIMAL(8,2),
    total_carb          DECIMAL(8,2),
    total_fat           DECIMAL(8,2),
    total_fiber         DECIMAL(8,2),
    target_calories     DECIMAL(8,2),
    tdee                DECIMAL(8,2),
    calorie_gap         DECIMAL(8,2),       -- 缺口（负）/ 盈余（正）
    diet_score          DECIMAL(5,2),       -- 饮食评分
    food_variety_count  SMALLINT,           -- 当日食物种类数
    version             INT DEFAULT 0,      -- 乐观锁
    updated_at          TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, summary_date)
);
```

#### 体重体脂记录表 `t_body_record`
```sql
CREATE TABLE t_body_record (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES t_user(id),
    record_date DATE NOT NULL,
    weight      DECIMAL(5,1),   -- kg
    body_fat    DECIMAL(5,2),   -- %
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW(),
    deleted_at  TIMESTAMP,
    UNIQUE(user_id, record_date)
);
```

#### 力量训练动作库表 `t_exercise`

> 设计说明：独立的动作库表，预设动作 + 用户自定义动作统一管理，避免同名重复。`t_strength_record` 通过 `exercise_id` 外键引用。

```sql
CREATE TABLE t_exercise (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    body_part       VARCHAR(50) NOT NULL,   -- 腿部 / 胸部 / 背部 / 手臂 / 肩部 / 核心
    is_preset       BOOLEAN DEFAULT FALSE,  -- true=系统预设 false=用户自定义
    created_by      BIGINT REFERENCES t_user(id), -- 自定义动作的创建者
    created_at      TIMESTAMP DEFAULT NOW(),
    deleted_at      TIMESTAMP
);
-- 预设动作全局唯一；用户自定义动作在自己范围内唯一
CREATE UNIQUE INDEX uk_exercise_preset_name ON t_exercise(name) WHERE is_preset = TRUE AND deleted_at IS NULL;
CREATE UNIQUE INDEX uk_exercise_user_name ON t_exercise(created_by, name) WHERE is_preset = FALSE AND deleted_at IS NULL;
```

#### 力量训练记录表 `t_strength_record`
```sql
CREATE TABLE t_strength_record (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES t_user(id),
    record_date     DATE NOT NULL,
    exercise_id     BIGINT NOT NULL REFERENCES t_exercise(id),
    sets            SMALLINT,
    reps_per_set    SMALLINT,
    weight          DECIMAL(6,2),       -- kg
    note            VARCHAR(200),
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    deleted_at      TIMESTAMP
);
CREATE INDEX idx_strength_record_user_date ON t_strength_record(user_id, record_date) WHERE deleted_at IS NULL;
```

#### 好友请求表 `t_friend_request`

> 设计说明：好友请求独立存储，避免与已建立的关系混淆。状态包括待确认/已接受/已拒绝/已过期。

```sql
CREATE TABLE t_friend_request (
    id              BIGSERIAL PRIMARY KEY,
    from_user_id    BIGINT NOT NULL REFERENCES t_user(id),
    to_user_id      BIGINT NOT NULL REFERENCES t_user(id),
    message         VARCHAR(200),        -- 请求附带的打招呼留言
    status          SMALLINT DEFAULT 0,  -- 0待确认 1已接受 2已拒绝 3已过期
    handled_at      TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(from_user_id, to_user_id, status)  -- 避免重复发送（同一状态下唯一）
);
CREATE INDEX idx_friend_request_to_status ON t_friend_request(to_user_id, status);
```

#### 好友关系表 `t_friendship`

> 说明：双向关系，A 加 B 成功后同时插入 (A,B) 和 (B,A) 两条记录，查询简化

```sql
CREATE TABLE t_friendship (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES t_user(id),
    friend_id   BIGINT NOT NULL REFERENCES t_user(id),
    remark      VARCHAR(50),
    created_at  TIMESTAMP DEFAULT NOW(),
    deleted_at  TIMESTAMP,
    UNIQUE(user_id, friend_id)
);
CREATE INDEX idx_friendship_user ON t_friendship(user_id) WHERE deleted_at IS NULL;
```

#### 用户经验值表 `t_user_experience`
```sql
CREATE TABLE t_user_experience (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT UNIQUE NOT NULL REFERENCES t_user(id),
    total_exp       BIGINT DEFAULT 0,
    level           SMALLINT DEFAULT 1,
    continuous_days SMALLINT DEFAULT 0,      -- 连续记录天数
    last_record_date DATE,
    version         INT DEFAULT 0,           -- 乐观锁，防止并发加经验值脏写
    updated_at      TIMESTAMP DEFAULT NOW()
);
```

#### 经验值流水表 `t_user_exp_log`

> 设计说明：每次经验值变动落流水，用于展示里程碑记录、等级提升历史、对账

```sql
CREATE TABLE t_user_exp_log (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES t_user(id),
    exp_change      INT NOT NULL,            -- 正数增加，预留负数扣除
    reason_code     VARCHAR(50) NOT NULL,    -- first_record_today / complete_three_meals / streak_7 / ...
    reason_detail   VARCHAR(200),
    created_at      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_user_exp_log_user_time ON t_user_exp_log(user_id, created_at DESC);
```

#### 烹饪方法收藏表 `t_cooking_favorite`

```sql
CREATE TABLE t_cooking_favorite (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES t_user(id),
    food_name       VARCHAR(100) NOT NULL,   -- 食材名称
    cooking_method  VARCHAR(50) NOT NULL,    -- 烹饪方法名称（如"清蒸"）
    content         JSONB NOT NULL,          -- 完整方法详情（步骤、热量参考、优势等）
    created_at      TIMESTAMP DEFAULT NOW(),
    deleted_at      TIMESTAMP,
    UNIQUE(user_id, food_name, cooking_method)
);
```

#### 饮食建议保存表 `t_diet_suggestion_saved`

> 对应 PRD FR-STAT-005 "支持保存建议至个人中心"

```sql
CREATE TABLE t_diet_suggestion_saved (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES t_user(id),
    suggestion_date DATE NOT NULL,           -- 生成该建议时的日期
    content         JSONB NOT NULL,          -- 建议内容（分点结构化）
    created_at      TIMESTAMP DEFAULT NOW(),
    deleted_at      TIMESTAMP
);
CREATE INDEX idx_diet_suggestion_user_date ON t_diet_suggestion_saved(user_id, suggestion_date DESC) WHERE deleted_at IS NULL;
```

### 4.2 数据库设计原则

1. **历史数据冗余存储**：`t_diet_record` 中冗余食物名称、热量、营养素数值，确保食物数据库更新不影响历史记录
2. **每日汇总预计算**：`t_daily_summary` 作为汇总缓存表，避免统计接口每次全量聚合
3. **软删除**：用户、食物、饮食记录、好友关系、训练记录等核心数据统一用 `deleted_at` 字段软删除，保留数据完整性；对应查询索引一律加 `WHERE deleted_at IS NULL` 条件
4. **索引策略**：饮食记录按 `(user_id, record_date)` 建联合索引，食物名称使用 PostgreSQL 全文搜索索引
5. **并发控制**：`t_user_goal`、`t_user_experience`、`t_daily_summary`、`t_user`、`t_training_rule` 等会被并发读改写的表增加 `version` 字段，采用 MyBatis Plus 的 `@Version` 乐观锁注解；重试次数上限 3 次，失败返回业务错误
6. **时区处理**：所有 `DATE` 类型字段（`record_date`、`summary_date` 等）按用户时区（`t_user.timezone`）界定"当天"；后端接收客户端请求时必须要求传入时区或由用户配置推断，禁止使用服务器本地时区
7. **数据迁移工具**：使用 Flyway，所有建表和变更脚本放入 `src/main/resources/db/migration/`，版本号形如 `V1__init_schema.sql`、`V2__add_vitamins.sql`，禁止手工修改生产库结构

---

## 5. API 设计规范

### 5.1 URL 规范

```
基础路径：/api/v1

用户认证：  POST   /api/v1/auth/register
           POST   /api/v1/auth/login
           POST   /api/v1/auth/wechat
           POST   /api/v1/auth/logout

用户信息：  GET    /api/v1/users/profile
           PUT    /api/v1/users/profile

目标设定：  GET    /api/v1/goals/current
           POST   /api/v1/goals
           GET    /api/v1/goals/training-schedule
           POST   /api/v1/goals/training-schedule

食物：      GET    /api/v1/foods/search?keyword=xxx
           GET    /api/v1/foods/barcode/{code}
           POST   /api/v1/foods/recognize  (图片识别)

饮食记录：  GET    /api/v1/records/daily?date=2026-04-16
           POST   /api/v1/records
           PUT    /api/v1/records/{id}
           DELETE /api/v1/records/{id}

统计：      GET    /api/v1/statistics/daily?date=xxx
           GET    /api/v1/statistics/weekly?startDate=xxx
           GET    /api/v1/statistics/monthly?yearMonth=2026-04
           GET    /api/v1/statistics/score?date=xxx

体身数据：  POST   /api/v1/body/records
           GET    /api/v1/body/records?startDate=xxx&endDate=xxx

力量训练：  POST   /api/v1/strength/records
           GET    /api/v1/strength/records?date=xxx

社交：      GET    /api/v1/social/friends
           POST   /api/v1/social/friends/request
           GET    /api/v1/social/ranking?type=exp&period=week
```

### 5.2 统一响应格式

```json
{
  "code": 200,
  "message": "success",
  "data": { ... }
}
```

错误响应：
```json
{
  "code": 40001,
  "message": "用户名或密码错误",
  "data": null
}
```

### 5.3 认证方式

- 请求头：`Authorization: Bearer <JWT Token>`
- Token 有效期：Access Token 2小时，Refresh Token 7天
- Token 刷新：`POST /api/v1/auth/refresh`

---

## 6. 关键业务逻辑说明

### 6.1 TDEE 计算流程

```
输入：用户基础信息 + 当日日期类型 + 训练强度

1. BMR（Mifflin-St Jeor）
   男：BMR = 10×体重 + 6.25×身高 - 5×年龄 - 161
   女：BMR = 10×体重 + 6.25×身高 - 5×年龄 + 5

2. 基础活动系数
   极少运动：1.2 / 轻度：1.375 / 中度：1.55 / 高强度：1.725

3. 日期类型系数调整
   训练日：+0.1（低强度）或 +0.2（中高强度）
   休息日：-0.1

4. TDEE = BMR × (基础活动系数 + 日期调整)

5. 目标热量
   增肌塑型：训练日 TDEE×1.175，休息日 TDEE×1.125
   减脂增肌：训练日 TDEE×0.875，休息日 TDEE×0.825
```

### 6.2 饮食评分计算（100分制）

```
热量达标度（30分）
  偏差 ≤10%  → 30分
  偏差 10~20% → 线性扣分至15分
  偏差 >20%  → 15分以下

营养素合规性（35分）
  蛋白质/碳水/脂肪/膳食纤维各达标 +8~9分
  添加糖超标 -5~10分

餐次分配合理性（20分）
  各餐次热量占比在建议范围内满分
  单餐偏差过大线性扣分

食物多样性（15分）
  ≥12种  → 15分
  8~11种 → 10分
  5~7种  → 6分
  <5种   → 3分
```

### 6.3 排行榜实现（Redis Sorted Set）

```
Key 命名规范：
  好友总经验值排名：ranking:exp:friends:{userId}
  周饮食评分排名：  ranking:score:week:{weekKey}:friends:{userId}
  连续记录天数：    ranking:streak:friends:{userId}

每日登录/记录后触发更新：
  ZADD ranking:exp:friends:{userId} {exp} {friendUserId}

查询排名：
  ZREVRANK ranking:exp:friends:{userId} {selfUserId}

定时任务：
  每周一 00:00 重置周排名
  每月一日 00:00 重置月排名
```

---

## 7. 非功能性设计

### 7.1 安全

- 密码使用 BCrypt 加密存储，禁止明文
- JWT 密钥通过环境变量注入，不写入代码
- 接口限流：登录/注册/短信接口 10次/分钟/IP（Redis + 令牌桶）
- SQL 注入：MyBatis Plus 参数化查询，禁止拼接 SQL
- 敏感数据（手机号）返回前端时脱敏为 `138****8888` 格式
- **JWT 黑名单策略**：登出时将 Token 的 `jti` 写入 Redis，TTL 设为 Token 剩余有效期，到期自动清理，避免内存无限增长

### 7.2 性能

- 食物搜索结果缓存至 Redis，TTL 1小时
- 每日汇总数据预计算，避免实时聚合
- 数据库连接池：HikariCP（Spring Boot 默认）
- 分页查询统一使用 MyBatis Plus 分页插件，禁止全量查询后内存分页

### 7.3 并发控制

- 关键的读改写场景（经验值累加、每日汇总更新、目标切换、用户信息修改）使用 MyBatis Plus 的 `@Version` 乐观锁
- Service 层捕获 `OptimisticLockingException`，最多重试 3 次，仍失败则返回业务错误码 `CONCURRENT_MODIFICATION`
- 排行榜 Redis Sorted Set 写入使用 `ZADD`（幂等），无需额外锁

### 7.4 时区处理

- 用户表 `timezone` 字段存储 IANA 时区字符串（如 `Asia/Shanghai`）
- 客户端请求涉及日期的接口（如查询当日统计）必须在请求体或 header `X-Timezone` 中携带时区，后端以此界定 `record_date`
- 历史数据的 `record_date` 不会因用户后续修改时区而变动

### 7.5 数据同步

- 移动端与网页版共用同一套后端 API，数据天然一致
- 客户端每次进入首页强制拉取最新数据，不做本地缓存（V1阶段）

### 7.6 数据库迁移

- 使用 Flyway 管理 schema 变更
- 目录结构：`src/main/resources/db/migration/V{序号}__{描述}.sql`
- 禁止手工修改生产库；禁止修改已经部署过的 migration 文件，新增变更必须新增文件
- 每次部署前 CI 自动校验 migration 文件完整性

### 7.7 微信登录账号绑定流程

1. 客户端完成微信授权，拿到 `openid` / `unionid`
2. 后端检查 `t_user.wechat_openid` 是否存在：
   - 已存在 → 直接签发 Access Token + Refresh Token，登录完成
   - 不存在 → 签发一个短期（10分钟）的临时 Token，返回前端提示"需绑定手机号"
3. 前端携带临时 Token 调用 `POST /api/v1/auth/wechat/bind`，提交手机号 + 验证码
4. 后端校验验证码后：
   - 如果该手机号已有账号 → 将微信信息追加到现有账号（合并）
   - 如果该手机号无账号 → 创建新账号并写入微信信息
5. 返回正式 Token，登录完成
6. 临时 Token 在 Redis 中单独维护，过期或绑定成功后立即失效

---

## 8. 开发环境与部署

### 8.1 本地开发

```bash
# 环境要求
JDK 17+
PostgreSQL 16
Redis 7.x
Node.js 20+（前端）

# 后端启动
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev

# 前端启动（Web）
cd calorie-log-web && npm run dev

# 移动端
cd calorie-log-app && npx react-native start
```

### 8.2 配置文件结构

```yaml
# application.yml（公共配置）
spring:
  datasource:
    url: ${DB_URL}
    username: ${DB_USER}
    password: ${DB_PASSWORD}
  redis:
    host: ${REDIS_HOST}
    port: 6379

jwt:
  secret: ${JWT_SECRET}
  access-token-expiry: 7200    # 2小时
  refresh-token-expiry: 604800 # 7天

wechat:
  app-id: ${WECHAT_APP_ID}
  app-secret: ${WECHAT_APP_SECRET}

# 火山引擎短信
volcengine:
  sms:
    access-key-id: ${VOLC_ACCESS_KEY_ID}
    access-key-secret: ${VOLC_ACCESS_KEY_SECRET}
    sign-name: ${VOLC_SMS_SIGN_NAME}

# 百度AI（P1阶段启用）
baidu:
  ai:
    api-key: ${BAIDU_AI_API_KEY}
    secret-key: ${BAIDU_AI_SECRET_KEY}
```

### 8.3 项目仓库结构建议

```
calorie-log/
├── calorie-log-server/    # Spring Boot 后端
├── calorie-log-web/       # React + Vite 网页版
├── calorie-log-app/       # React Native 移动端
└── calorie-log-shared/    # 共享类型定义（可选，TypeScript）
```

---

## 9. 已确认事项与决策记录

| 事项 | 决策 |
|------|------|
| 食物营养数据库 | 自建：导入《中国食物成分表》（基础食材）+ Open Food Facts（条码商品），合规零成本 |
| 条码数据库 | Open Food Facts 全量数据本地化，不依赖实时外部 API |
| 对象存储 | V1 不引入，微信用户沿用微信头像，拍照识别图片 Base64 直传 AI 接口 |
| 云服务商 | 火山引擎（云服务器 + VeSMS 短信） |
| 小米运动健康 | 移出 V1，后续迭代实现 |
| 服务器规格 | 初期 2核4G 云服务器，按需扩容 |
