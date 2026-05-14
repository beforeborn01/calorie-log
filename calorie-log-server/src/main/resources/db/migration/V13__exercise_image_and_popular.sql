-- ============================================================
-- V13: 动作图片 URL + is_popular 标签
--
-- image_url：动作演示图（可以是远程 URL 或 /assets/exercises/<id>.jpg 之类）
--            为 NULL 时前端回退到默认占位
-- is_popular：标记常用动作。前端默认筛选只显示 popular（约 50 个），
--             "显示全部" 才返回全量 888 条
-- ============================================================

ALTER TABLE t_exercise
    ADD COLUMN image_url  VARCHAR(500),
    ADD COLUMN is_popular BOOLEAN DEFAULT FALSE;

-- 把 calorie 原 V3 的 44 条 + sports V3 的 13 条 之类的"主流"动作打 popular = TRUE
-- 规则：preset + 名字命中常用基础动作关键词
UPDATE t_exercise SET is_popular = TRUE
WHERE is_preset = TRUE
  AND deleted_at IS NULL
  AND (
    -- 中文动作（calorie V3 风格）
    name IN (
      '深蹲','前蹲','箭步蹲','哈克深蹲','腿举','腿屈伸','腿弯举','罗马尼亚硬拉','保加利亚分腿蹲','提踵',
      '平板杠铃卧推','上斜杠铃卧推','平板哑铃卧推','上斜哑铃卧推','哑铃飞鸟','绳索夹胸','双杠臂屈伸','俯卧撑',
      '硬拉','引体向上','杠铃划船','哑铃划船','坐姿划船','高位下拉','面拉','超人式',
      '杠铃肩推','哑铃肩推','坐姿哑铃推举','侧平举','前平举','反向飞鸟','耸肩',
      '杠铃弯举','哑铃弯举','锤式弯举','牧师凳弯举','绳索下压','窄距卧推','三头臂屈伸','颈后臂屈伸',
      '平板支撑','仰卧起坐','卷腹','悬挂举腿','俄罗斯转体',
      '龙门架夹胸'
    )
    -- sports V3 的英文风格 preset id 命中的代表性动作
    OR name IN ('杠铃卧推', '杠铃肩推', '坐姿划船', '弓步蹲', '绳索下压', '杠铃弯举')
  );

COMMENT ON COLUMN t_exercise.image_url IS '动作演示图 URL（远程或本地路径，可空）';
COMMENT ON COLUMN t_exercise.is_popular IS '常用动作（前端默认筛选）';

CREATE INDEX idx_exercise_is_popular ON t_exercise(is_popular) WHERE deleted_at IS NULL AND is_popular = TRUE;
