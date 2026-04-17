-- ============================================================
-- V6: 性能索引补齐（针对 Phase 4 之后出现的热查询路径）
-- t_user_experience.user_id 已在 V1 UNIQUE 约束自动建索引，此处无需再加
-- ============================================================

-- 好友关系反向查询（friend_id 侧）
-- reviveIfSoftDeleted、delete 双向删除都命中
CREATE INDEX IF NOT EXISTS idx_friendship_friend
    ON t_friendship(friend_id) WHERE deleted_at IS NULL;

-- 好友请求双向对 + 状态（hasPendingRequest / expirePriorTerminal）
CREATE INDEX IF NOT EXISTS idx_friend_request_pair_status
    ON t_friend_request(from_user_id, to_user_id, status);
