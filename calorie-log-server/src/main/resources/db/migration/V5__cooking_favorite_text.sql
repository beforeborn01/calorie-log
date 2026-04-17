-- Phase 5: 把 t_cooking_favorite.content 从 JSONB 改为 TEXT
-- 原因：应用层只做整体序列化/反序列化，不在数据库侧做 JSON 路径查询，
-- 用 TEXT 更简单，避免 MyBatis Plus 还要挂 PGobject TypeHandler。
ALTER TABLE t_cooking_favorite
  ALTER COLUMN content TYPE TEXT USING content::TEXT;

-- 同理 t_diet_suggestion_saved.content（预留）
ALTER TABLE t_diet_suggestion_saved
  ALTER COLUMN content TYPE TEXT USING content::TEXT;
