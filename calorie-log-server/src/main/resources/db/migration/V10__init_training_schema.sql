-- ============================================================
-- V10: 训练计划 / 执行 / 统计 / PR 表（合并自 sports 项目）
--
-- 设计要点：
-- * 全部使用 BIGSERIAL 主键，与 calorie 现有风格统一
-- * exercise_id 引用 t_exercise.id（BIGINT）
-- * 用户字段统一叫 user_id（calorie 内已有该命名习惯）
-- * t_workout_session 一开始就内嵌 source / raw_text（合并 sports V5）
-- * t_strength_record 不动 —— 保留为"日记式快记"入口，与本套并存
-- ============================================================

-- 训练计划
CREATE TABLE t_workout_plan (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT NOT NULL REFERENCES t_user(id),
    name                VARCHAR(100) NOT NULL,
    description         TEXT,
    type                VARCHAR(20) NOT NULL DEFAULT 'strength',
    estimated_duration  INT,                       -- 预计时长（分钟）
    is_template         BOOLEAN DEFAULT FALSE,
    version             INT DEFAULT 0,
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW(),
    deleted_at          TIMESTAMP
);

COMMENT ON COLUMN t_workout_plan.type IS 'strength / cardio / mobility / mixed';
COMMENT ON COLUMN t_workout_plan.is_template IS '是否作为模板（true 可被他人复制）';

-- 计划下的动作（排序列表）
CREATE TABLE t_workout_plan_exercise (
    id              BIGSERIAL PRIMARY KEY,
    plan_id         BIGINT NOT NULL REFERENCES t_workout_plan(id) ON DELETE CASCADE,
    exercise_id     BIGINT NOT NULL REFERENCES t_exercise(id),
    sets            SMALLINT NOT NULL,
    reps            SMALLINT,
    weight          DECIMAL(6,2),
    rest_seconds    INT NOT NULL DEFAULT 60,
    notes           VARCHAR(500),
    sort_order      SMALLINT NOT NULL DEFAULT 0
);

-- 训练会话（一次实际或计划中的训练）
CREATE TABLE t_workout_session (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES t_user(id),
    plan_id         BIGINT REFERENCES t_workout_plan(id),
    name            VARCHAR(100) NOT NULL,
    status          VARCHAR(16) NOT NULL DEFAULT 'planned',  -- planned / in_progress / completed / abandoned
    start_time      TIMESTAMP NOT NULL,
    end_time        TIMESTAMP,
    duration        INT,                              -- 实际时长（秒）
    total_volume    DECIMAL(12,2) DEFAULT 0,          -- 总训练量 kg·rep
    notes           TEXT,
    tab_id          VARCHAR(64),                      -- 多端 tab 标识，配合离线队列
    source          VARCHAR(16) DEFAULT 'manual',     -- plan / manual / quick_log
    raw_text        TEXT,                             -- quick_log 时的原文
    version         INT DEFAULT 0,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    deleted_at      TIMESTAMP
);

COMMENT ON COLUMN t_workout_session.source IS 'plan/manual/quick_log';
COMMENT ON COLUMN t_workout_session.raw_text IS '补录原文（quick_log 才会有）';

-- 会话内的动作（排序）
CREATE TABLE t_exercise_session (
    id              BIGSERIAL PRIMARY KEY,
    session_id      BIGINT NOT NULL REFERENCES t_workout_session(id) ON DELETE CASCADE,
    exercise_id     BIGINT NOT NULL REFERENCES t_exercise(id),
    planned_sets    SMALLINT NOT NULL,
    notes           VARCHAR(500),
    sort_order      SMALLINT NOT NULL DEFAULT 0
);

-- 完成的组（每组一行）
CREATE TABLE t_completed_set (
    id                  BIGSERIAL PRIMARY KEY,
    exercise_session_id BIGINT NOT NULL REFERENCES t_exercise_session(id) ON DELETE CASCADE,
    set_number          SMALLINT NOT NULL,
    reps                SMALLINT NOT NULL DEFAULT 0,
    weight              DECIMAL(6,2) NOT NULL DEFAULT 0,
    rpe                 SMALLINT,                     -- 自感强度 1-10
    is_completed        BOOLEAN DEFAULT FALSE,
    completed_at        TIMESTAMP
);

COMMENT ON COLUMN t_completed_set.rpe IS '自感用力程度 1-10（可选）';

-- 用户训练聚合统计（按用户 1 行）
CREATE TABLE t_user_stats (
    user_id             BIGINT PRIMARY KEY REFERENCES t_user(id),
    total_workouts      INT DEFAULT 0,
    total_volume        DECIMAL(14,2) DEFAULT 0,
    current_streak      INT DEFAULT 0,
    longest_streak      INT DEFAULT 0,
    weekly_average      DECIMAL(5,2) DEFAULT 0,
    last_workout_date   TIMESTAMP,
    version             INT DEFAULT 0,
    updated_at          TIMESTAMP DEFAULT NOW()
);

-- 个人最佳记录（按用户 + 动作）
CREATE TABLE t_personal_record (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES t_user(id),
    exercise_id     BIGINT NOT NULL REFERENCES t_exercise(id),
    weight          DECIMAL(6,2) NOT NULL,
    recorded_at     TIMESTAMP NOT NULL,
    session_id      BIGINT REFERENCES t_workout_session(id),
    updated_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, exercise_id)
);

-- 索引
CREATE INDEX idx_plan_user ON t_workout_plan(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_plan_template ON t_workout_plan(is_template) WHERE deleted_at IS NULL;
CREATE INDEX idx_plan_exercise_plan ON t_workout_plan_exercise(plan_id);
CREATE INDEX idx_session_user ON t_workout_session(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_session_status ON t_workout_session(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_session_start ON t_workout_session(start_time DESC);
CREATE INDEX idx_session_source ON t_workout_session(user_id, source);
CREATE INDEX idx_exercise_session_session ON t_exercise_session(session_id);
CREATE INDEX idx_completed_set_exercise_session ON t_completed_set(exercise_session_id);
CREATE INDEX idx_pr_user ON t_personal_record(user_id);
