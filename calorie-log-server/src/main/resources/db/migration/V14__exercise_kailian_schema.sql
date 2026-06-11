-- ============================================================
-- V14: 动作库结构升级 —— 对齐"开练"抓取资料（部位→细分→器械→动作 + 结构化详情）
--
-- 背景：原 t_exercise 是扁平表（单层 category），seed 数据来自 free-exercise-db
-- 英文机翻，质量低。现以开练 506 条高质量动作完全替换，并引入：
--   * equipment        粗粒度器械（筛选维度 + MET 键）：自重/杠铃/哑铃/史密斯/器械/绳索/弹力带/小工具/跑步机...
--   * equipment_detail 细粒度器械（展示）：壶铃/药球/波速球/泡沫轴...（小工具的展开）
--   * target_muscle    目标肌（开练 target，如"中下胸"）
--   * detail_sections  结构化详情 JSONB：[{title:"步骤",items:[...]},{title:"呼吸",...},...]
--   * met              代谢当量，导入时按"大类×器械 + 人工 override"算好，供 session 消耗估算
--   * 小类(sub_region) 维度：一个动作可属多个小类（上胸/中下胸...），多对多
--
-- 开发阶段，旧数据全部清空重建（含引用 t_exercise 的训练表）。
-- ============================================================

-- 1) 清空旧数据（CASCADE 连带清掉 plan_exercise / exercise_session / completed_set /
--    personal_record / strength_record 等子表；开发期可接受）
TRUNCATE TABLE
    t_workout_plan,
    t_workout_session,
    t_strength_record,
    t_exercise
    RESTART IDENTITY CASCADE;

-- 2) 扩展 t_exercise
ALTER TABLE t_exercise
    ADD COLUMN equipment        VARCHAR(20),   -- 粗粒度器械（中文，筛选 + MET 键）
    ADD COLUMN equipment_detail VARCHAR(20),   -- 细粒度器械（中文，展示，可空）
    ADD COLUMN target_muscle    VARCHAR(40),   -- 目标肌（开练 target）
    ADD COLUMN detail_sections  JSONB,         -- 结构化详情（步骤/呼吸/动作感觉/常见问题）
    ADD COLUMN met              DECIMAL(4,1);  -- 代谢当量（导入时算好，可在库内微调）

COMMENT ON COLUMN t_exercise.equipment        IS '粗粒度器械：自重/杠铃/哑铃/史密斯/器械/绳索/弹力带/小工具/跑步机/椭圆机/...（筛选 + MET 键）';
COMMENT ON COLUMN t_exercise.equipment_detail IS '细粒度器械：壶铃/药球/波速球/泡沫轴...（小工具的展开，可空）';
COMMENT ON COLUMN t_exercise.target_muscle    IS '目标肌（开练 target，如"中下胸"）';
COMMENT ON COLUMN t_exercise.detail_sections  IS '结构化详情 JSONB：[{title,items:[...]}]';
COMMENT ON COLUMN t_exercise.met              IS '代谢当量 MET，用于 kcal = MET × 体重 × 时长';

-- 3) 小类（细分部位）维度
CREATE TABLE t_sub_region (
    id        BIGSERIAL PRIMARY KEY,
    body_part VARCHAR(20) NOT NULL,   -- 所属大类英文码（chest/back/legs/...）
    name_cn   VARCHAR(20) NOT NULL,   -- 中文细分名（上胸/中下胸/...）
    sort      SMALLINT DEFAULT 0,
    UNIQUE(body_part, name_cn)
);
COMMENT ON TABLE t_sub_region IS '动作库细分部位（小类）：隶属某个大类，如 chest→上胸/中下胸';

CREATE TABLE t_exercise_sub_region (
    exercise_id   BIGINT NOT NULL REFERENCES t_exercise(id) ON DELETE CASCADE,
    sub_region_id BIGINT NOT NULL REFERENCES t_sub_region(id) ON DELETE CASCADE,
    PRIMARY KEY(exercise_id, sub_region_id)
);
COMMENT ON TABLE t_exercise_sub_region IS '动作 ↔ 小类 多对多（一个动作可归到多个细分）';

-- 4) 索引
CREATE INDEX idx_exercise_equipment ON t_exercise(equipment) WHERE deleted_at IS NULL;
CREATE INDEX idx_exercise_sub_region_sub ON t_exercise_sub_region(sub_region_id);
CREATE INDEX idx_sub_region_body_part ON t_sub_region(body_part);
