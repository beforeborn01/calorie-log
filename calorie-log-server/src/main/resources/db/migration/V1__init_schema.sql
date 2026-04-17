-- ============================================================
-- V1: 初始化所有表结构
-- 按架构文档 architecture-v1.md 第 4.1 节定义
-- ============================================================

-- 用户表
CREATE TABLE t_user (
    id              BIGSERIAL PRIMARY KEY,
    phone           VARCHAR(20),
    email           VARCHAR(100),
    wechat_openid   VARCHAR(100),
    wechat_unionid  VARCHAR(100),
    nickname        VARCHAR(50),
    avatar_url      VARCHAR(500),
    password_hash   VARCHAR(255),
    gender          SMALLINT,
    age             SMALLINT,
    height          DECIMAL(5,1),
    weight          DECIMAL(5,1),
    activity_level  SMALLINT,
    timezone        VARCHAR(50) DEFAULT 'Asia/Shanghai',
    status          SMALLINT DEFAULT 1,
    version         INT DEFAULT 0,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    deleted_at      TIMESTAMP
);

COMMENT ON COLUMN t_user.gender IS '0未知 1男 2女';
COMMENT ON COLUMN t_user.activity_level IS '1极少 2轻度 3中度 4高强度';
COMMENT ON COLUMN t_user.status IS '1正常 0禁用';

-- 用户目标表
CREATE TABLE t_user_goal (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES t_user(id),
    goal_type       SMALLINT NOT NULL,
    bmr             DECIMAL(8,2),
    tdee_base       DECIMAL(8,2),
    target_calories_training  DECIMAL(8,2),
    target_calories_rest      DECIMAL(8,2),
    protein_ratio   DECIMAL(5,2),
    carb_ratio      DECIMAL(5,2),
    fat_ratio       DECIMAL(5,2),
    is_active       BOOLEAN DEFAULT TRUE,
    started_at      TIMESTAMP DEFAULT NOW(),
    ended_at        TIMESTAMP,
    version         INT DEFAULT 0,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

COMMENT ON COLUMN t_user_goal.goal_type IS '1增肌塑型 2减脂增肌';

-- 训练规则表
CREATE TABLE t_training_rule (
    id                 BIGSERIAL PRIMARY KEY,
    user_id            BIGINT NOT NULL UNIQUE REFERENCES t_user(id),
    training_weekdays  SMALLINT[] NOT NULL,
    default_intensity  SMALLINT DEFAULT 2,
    effective_from     DATE NOT NULL DEFAULT CURRENT_DATE,
    version            INT DEFAULT 0,
    created_at         TIMESTAMP DEFAULT NOW(),
    updated_at         TIMESTAMP DEFAULT NOW()
);

COMMENT ON COLUMN t_training_rule.default_intensity IS '1低 2中 3高';

-- 训练计划例外表
CREATE TABLE t_training_exception (
    id                 BIGSERIAL PRIMARY KEY,
    user_id            BIGINT NOT NULL REFERENCES t_user(id),
    exception_date     DATE NOT NULL,
    day_type           SMALLINT NOT NULL,
    training_intensity SMALLINT,
    note               VARCHAR(200),
    created_at         TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, exception_date)
);

COMMENT ON COLUMN t_training_exception.day_type IS '1训练日 2休息日';

-- 食物数据表
CREATE TABLE t_food (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    alias           VARCHAR(200),
    barcode         VARCHAR(50),
    category        VARCHAR(50),
    unit            VARCHAR(20) DEFAULT 'g',
    calories        DECIMAL(8,2),
    protein         DECIMAL(8,2),
    carbohydrate    DECIMAL(8,2),
    fat             DECIMAL(8,2),
    dietary_fiber   DECIMAL(8,2),
    added_sugar     DECIMAL(8,2),
    vitamin_a       DECIMAL(8,2),
    vitamin_b1      DECIMAL(8,2),
    vitamin_b2      DECIMAL(8,2),
    vitamin_c       DECIMAL(8,2),
    vitamin_e       DECIMAL(8,2),
    sodium          DECIMAL(8,2),
    potassium       DECIMAL(8,2),
    calcium         DECIMAL(8,2),
    iron            DECIMAL(8,2),
    zinc            DECIMAL(8,2),
    is_hard_to_weigh BOOLEAN DEFAULT FALSE,
    gross_net_ratio  DECIMAL(5,2),
    data_source     VARCHAR(50),
    created_by      BIGINT REFERENCES t_user(id),
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    deleted_at      TIMESTAMP
);

COMMENT ON COLUMN t_food.data_source IS 'cfct / off / user';

-- 饮食记录表
CREATE TABLE t_diet_record (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES t_user(id),
    record_date     DATE NOT NULL,
    meal_type       SMALLINT NOT NULL,
    food_id         BIGINT REFERENCES t_food(id),
    food_name       VARCHAR(100) NOT NULL,
    quantity        DECIMAL(8,2) NOT NULL,
    gross_quantity  DECIMAL(8,2),
    calories        DECIMAL(8,2) NOT NULL,
    protein         DECIMAL(8,2),
    carbohydrate    DECIMAL(8,2),
    fat             DECIMAL(8,2),
    dietary_fiber   DECIMAL(8,2),
    added_sugar     DECIMAL(8,2),
    add_method      SMALLINT DEFAULT 1,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    deleted_at      TIMESTAMP
);

COMMENT ON COLUMN t_diet_record.meal_type IS '1早餐 2午餐 3晚餐 4加餐';
COMMENT ON COLUMN t_diet_record.add_method IS '1搜索 2手动 3拍照 4扫码 5收藏 6烹饪推荐';

-- 每日汇总表
CREATE TABLE t_daily_summary (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT NOT NULL REFERENCES t_user(id),
    summary_date        DATE NOT NULL,
    day_type            SMALLINT,
    total_calories      DECIMAL(8,2),
    total_protein       DECIMAL(8,2),
    total_carb          DECIMAL(8,2),
    total_fat           DECIMAL(8,2),
    total_fiber         DECIMAL(8,2),
    target_calories     DECIMAL(8,2),
    tdee                DECIMAL(8,2),
    calorie_gap         DECIMAL(8,2),
    diet_score          DECIMAL(5,2),
    food_variety_count  SMALLINT,
    version             INT DEFAULT 0,
    updated_at          TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, summary_date)
);

-- 体重体脂记录表
CREATE TABLE t_body_record (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES t_user(id),
    record_date DATE NOT NULL,
    weight      DECIMAL(5,1),
    body_fat    DECIMAL(5,2),
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW(),
    deleted_at  TIMESTAMP,
    UNIQUE(user_id, record_date)
);

-- 力量训练动作库
CREATE TABLE t_exercise (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    body_part       VARCHAR(50) NOT NULL,
    is_preset       BOOLEAN DEFAULT FALSE,
    created_by      BIGINT REFERENCES t_user(id),
    created_at      TIMESTAMP DEFAULT NOW(),
    deleted_at      TIMESTAMP
);

-- 力量训练记录
CREATE TABLE t_strength_record (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES t_user(id),
    record_date     DATE NOT NULL,
    exercise_id     BIGINT NOT NULL REFERENCES t_exercise(id),
    sets            SMALLINT,
    reps_per_set    SMALLINT,
    weight          DECIMAL(6,2),
    note            VARCHAR(200),
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    deleted_at      TIMESTAMP
);

-- 好友请求表
CREATE TABLE t_friend_request (
    id              BIGSERIAL PRIMARY KEY,
    from_user_id    BIGINT NOT NULL REFERENCES t_user(id),
    to_user_id      BIGINT NOT NULL REFERENCES t_user(id),
    message         VARCHAR(200),
    status          SMALLINT DEFAULT 0,
    handled_at      TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(from_user_id, to_user_id, status)
);

COMMENT ON COLUMN t_friend_request.status IS '0待确认 1已接受 2已拒绝 3已过期';

-- 好友关系表
CREATE TABLE t_friendship (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES t_user(id),
    friend_id   BIGINT NOT NULL REFERENCES t_user(id),
    remark      VARCHAR(50),
    created_at  TIMESTAMP DEFAULT NOW(),
    deleted_at  TIMESTAMP,
    UNIQUE(user_id, friend_id)
);

-- 用户经验值表
CREATE TABLE t_user_experience (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT UNIQUE NOT NULL REFERENCES t_user(id),
    total_exp       BIGINT DEFAULT 0,
    level           SMALLINT DEFAULT 1,
    continuous_days SMALLINT DEFAULT 0,
    last_record_date DATE,
    version         INT DEFAULT 0,
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- 经验值流水表
CREATE TABLE t_user_exp_log (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES t_user(id),
    exp_change      INT NOT NULL,
    reason_code     VARCHAR(50) NOT NULL,
    reason_detail   VARCHAR(200),
    created_at      TIMESTAMP DEFAULT NOW()
);

-- 烹饪方法收藏表
CREATE TABLE t_cooking_favorite (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES t_user(id),
    food_name       VARCHAR(100) NOT NULL,
    cooking_method  VARCHAR(50) NOT NULL,
    content         JSONB NOT NULL,
    created_at      TIMESTAMP DEFAULT NOW(),
    deleted_at      TIMESTAMP,
    UNIQUE(user_id, food_name, cooking_method)
);

-- 饮食建议保存表
CREATE TABLE t_diet_suggestion_saved (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES t_user(id),
    suggestion_date DATE NOT NULL,
    content         JSONB NOT NULL,
    created_at      TIMESTAMP DEFAULT NOW(),
    deleted_at      TIMESTAMP
);

-- 通知设置表（预埋 Phase 3 用）
CREATE TABLE t_notification_setting (
    id                   BIGSERIAL PRIMARY KEY,
    user_id              BIGINT UNIQUE NOT NULL REFERENCES t_user(id),
    breakfast_enabled    BOOLEAN DEFAULT TRUE,
    breakfast_time       TIME DEFAULT '08:00',
    lunch_enabled        BOOLEAN DEFAULT TRUE,
    lunch_time           TIME DEFAULT '12:00',
    dinner_enabled       BOOLEAN DEFAULT TRUE,
    dinner_time          TIME DEFAULT '18:30',
    frequency            VARCHAR(20) DEFAULT 'daily',
    updated_at           TIMESTAMP DEFAULT NOW()
);
