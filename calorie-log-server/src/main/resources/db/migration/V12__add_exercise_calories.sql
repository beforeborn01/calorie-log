-- ============================================================
-- V12: 在每日汇总加"运动消耗"列，打通训练 → 净赤字
--
-- 用法：训练 session 完成时按 MET × 体重(kg) × 时长(小时) 算出消耗，
-- 累加到 t_daily_summary.exercise_calories（按 summary_date 聚合）
--
-- 净赤字 = total_calories - (tdee + exercise_calories)
-- 已有的 calorie_gap 字段保持其原语义（与目标的差），不重命名
-- ============================================================

ALTER TABLE t_daily_summary
    ADD COLUMN exercise_calories DECIMAL(8,2) DEFAULT 0;

COMMENT ON COLUMN t_daily_summary.exercise_calories
    IS '当日运动总消耗 kcal（来自 t_workout_session 完成时累计）';
