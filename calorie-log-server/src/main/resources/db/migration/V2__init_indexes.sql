-- ============================================================
-- V2: 索引
-- ============================================================

-- 用户：唯一性约束仅对未删除用户生效
CREATE UNIQUE INDEX uk_user_phone ON t_user(phone) WHERE deleted_at IS NULL AND phone IS NOT NULL;
CREATE UNIQUE INDEX uk_user_email ON t_user(email) WHERE deleted_at IS NULL AND email IS NOT NULL;
CREATE UNIQUE INDEX uk_user_wechat_openid ON t_user(wechat_openid) WHERE deleted_at IS NULL AND wechat_openid IS NOT NULL;

-- 目标：每用户至多一条 active
CREATE UNIQUE INDEX uk_user_goal_active ON t_user_goal(user_id) WHERE is_active = TRUE;
CREATE INDEX idx_user_goal_user ON t_user_goal(user_id);

-- 训练例外
CREATE INDEX idx_training_exception_user_date ON t_training_exception(user_id, exception_date);

-- 食物
CREATE INDEX idx_food_name ON t_food USING gin(to_tsvector('simple', name));
CREATE INDEX idx_food_alias ON t_food USING gin(to_tsvector('simple', coalesce(alias, '')));
CREATE INDEX idx_food_barcode ON t_food(barcode) WHERE deleted_at IS NULL;
CREATE INDEX idx_food_created_by ON t_food(created_by) WHERE data_source = 'user';

-- 饮食记录
CREATE INDEX idx_diet_record_user_date ON t_diet_record(user_id, record_date) WHERE deleted_at IS NULL;

-- 每日汇总（UNIQUE 索引已在表定义，补充辅助索引）
CREATE INDEX idx_daily_summary_user_date ON t_daily_summary(user_id, summary_date);

-- 体重体脂
CREATE INDEX idx_body_record_user_date ON t_body_record(user_id, record_date) WHERE deleted_at IS NULL;

-- 力量训练动作库
CREATE UNIQUE INDEX uk_exercise_preset_name ON t_exercise(name) WHERE is_preset = TRUE AND deleted_at IS NULL;
CREATE UNIQUE INDEX uk_exercise_user_name ON t_exercise(created_by, name) WHERE is_preset = FALSE AND deleted_at IS NULL;
CREATE INDEX idx_exercise_body_part ON t_exercise(body_part) WHERE deleted_at IS NULL;

-- 力量训练记录
CREATE INDEX idx_strength_record_user_date ON t_strength_record(user_id, record_date) WHERE deleted_at IS NULL;

-- 好友请求
CREATE INDEX idx_friend_request_to_status ON t_friend_request(to_user_id, status);
CREATE INDEX idx_friend_request_from ON t_friend_request(from_user_id);

-- 好友关系
CREATE INDEX idx_friendship_user ON t_friendship(user_id) WHERE deleted_at IS NULL;

-- 经验值流水
CREATE INDEX idx_user_exp_log_user_time ON t_user_exp_log(user_id, created_at DESC);

-- 饮食建议
CREATE INDEX idx_diet_suggestion_user_date ON t_diet_suggestion_saved(user_id, suggestion_date DESC) WHERE deleted_at IS NULL;
