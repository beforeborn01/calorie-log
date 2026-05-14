-- ============================================================
-- V9: 扩展 t_exercise 以承载完整训练元数据（合并自 sports 项目）
--
-- 原 calorie 字段保留：id (BIGSERIAL), name, body_part(中文), is_preset,
--                       created_by, created_at, deleted_at
-- 新增字段（参考 sports）：
--   category VARCHAR(20)         英文分类码（chest/back/legs/shoulders/arms/core/...）
--   primary_muscles VARCHAR(200) 主要肌群
--   secondary_muscles VARCHAR(200) 辅助肌群
--   difficulty SMALLINT          难度 1-5
--   instructions TEXT            动作说明
--   tips TEXT                    要点
--   is_custom BOOLEAN            用户自建还是系统预设
--   updated_at TIMESTAMP         更新时间（用于乐观锁/同步）
--
-- body_part 中文保留，category 英文新增，互补使用：
--   - 前端筛选/排序按 category（统一码值）
--   - 列表展示按 body_part（中文标签）
-- ============================================================

ALTER TABLE t_exercise
    ADD COLUMN category          VARCHAR(20),
    ADD COLUMN primary_muscles   VARCHAR(200),
    ADD COLUMN secondary_muscles VARCHAR(200),
    ADD COLUMN difficulty        SMALLINT DEFAULT 1,
    ADD COLUMN instructions      TEXT,
    ADD COLUMN tips              TEXT,
    ADD COLUMN is_custom         BOOLEAN DEFAULT FALSE,
    ADD COLUMN updated_at        TIMESTAMP DEFAULT NOW();

-- 把 V3 已有的 44 条动作映射出英文 category 和基础元数据
UPDATE t_exercise
SET category = CASE body_part
        WHEN '腿部' THEN 'legs'
        WHEN '胸部' THEN 'chest'
        WHEN '背部' THEN 'back'
        WHEN '肩部' THEN 'shoulders'
        WHEN '手臂' THEN 'arms'
        WHEN '腹部' THEN 'core'
        WHEN '核心' THEN 'core'
        ELSE 'other'
    END,
    primary_muscles = body_part,
    difficulty = 2,
    is_custom = NOT COALESCE(is_preset, FALSE),
    updated_at = NOW()
WHERE category IS NULL;

CREATE INDEX IF NOT EXISTS idx_exercise_category ON t_exercise(category) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_exercise_is_custom ON t_exercise(is_custom) WHERE deleted_at IS NULL;

COMMENT ON COLUMN t_exercise.category IS '英文分类码：chest/back/legs/shoulders/arms/core/cardio/other';
COMMENT ON COLUMN t_exercise.primary_muscles IS '主要肌群（中英混用，逗号分隔）';
COMMENT ON COLUMN t_exercise.is_custom IS '用户自建（TRUE）/ 系统预设（FALSE）';
