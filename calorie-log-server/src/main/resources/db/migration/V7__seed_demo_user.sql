-- ============================================================
-- V7: 种一个 dev / demo 登录账号，方便手动测试与 UI 展示
--
-- 手机号: 18601977124
-- 密码:   Admin123!
-- hash:   BCrypt (cost=10)，由 python3 -c 'import bcrypt;...' 离线生成
--
-- 幂等：WHERE NOT EXISTS 防止重复 seed；UNIQUE(phone) 偏序索引已保障
-- 安全：此 seed 仅适用于开发/演示环境；生产部署前移除或改密
-- ============================================================

INSERT INTO t_user
    (phone, nickname, password_hash, gender, age, height, weight,
     activity_level, timezone, status)
SELECT
    '18601977124', 'Demo',
    '$2b$10$Q6Oi4iz9.4TFgNR6ecsumu47C4kp2tsbqqf1yt7Xfj0DHFHphe1SK',
    1, 30, 175.0, 70.0, 3, 'Asia/Shanghai', 1
WHERE NOT EXISTS (
    SELECT 1 FROM t_user
    WHERE phone = '18601977124' AND deleted_at IS NULL
);
