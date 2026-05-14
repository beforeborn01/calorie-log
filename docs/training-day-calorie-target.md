# 训练日 vs 休息日的卡路里目标（已有机制 + 合并后增强）

## TL;DR

> 训练日 / 休息日的目标卡差异是 **已实现** 的功能（在 calorie-log 原有 goal 模块里）。
> 本次合并做的事是：**训练会话完成时主动触发当日重算**，让训练消耗实时反映在 DailySummary。

## 现有机制

### 数据层

`t_user_goal` 表已经分开存训练日 / 休息日目标：

```sql
target_calories_training  DECIMAL(8,2)   -- 训练日目标卡
target_calories_rest      DECIMAL(8,2)   -- 休息日目标卡
protein_ratio / carb_ratio / fat_ratio   -- 三大营养素比例（两类日同用）
```

`t_training_rule.training_weekdays` 决定每周哪几天属于训练日（`SMALLINT[]`，如 `{1,3,5}` 表周一三五）。
`t_training_exception` 可对单日做例外覆盖。

### 计算流程

`DailySummaryService.recompute(userId, date)` 每次饮食增删时被调用，内部：

1. 从 `TrainingScheduleService.resolve(userId, date)` 拿到 `info.trainingDay`（true/false） + `info.intensity`
2. 把 `dayType` 写进 `t_daily_summary.day_type`：1=训练日、2=休息日
3. 调 `TdeeCalculationService.computeDaily(user, goalType, trainingDay, intensity)`，
   公式内部按 trainingDay 取对应 `target_calories_*` 字段
4. 把结果写进 `t_daily_summary.target_calories` 和 `tdee`

也就是说：用户只要在「健身目标」页填好这两个目标，DailySummary 里的 `targetCalories` 就会按日类型自动切换。

## 本次合并的增强

### 1. 训练 session 完成时触发 recompute

`WorkoutSessionService.finish() → recordExerciseCalories(userId, session)`：

```java
// 先触发 DailySummary 重算（按 t_training_rule 算好 dayType / TDEE / 目标卡），
// 再把本次训练消耗累加到 exercise_calories。
try {
    dailySummaryService.recompute(userId, day);
} catch (Exception ex) {
    // 用户没填资料 → 静默跳过；只写 exercise_calories
}
```

副作用：用户完成训练 → 当日 DailySummary 立即反映正确的训练日目标 + 训练消耗，
首页 / Stats 页的"今日能量闭环"卡片立刻刷新。

### 2. 暴露 netDeficit 给前端

`DailyRecordsResponse` 新增三个字段：

| 字段 | 含义 |
|---|---|
| `tdee` | 基础消耗 |
| `exerciseCalories` | 当日累计训练消耗 kcal |
| `netDeficit` | TDEE + exerciseCalories − totalCalories；正=赤字、负=盈余 |

首页 `NetDeficitCard` 已渲染。

## 还可以做的（不在本次合并范围）

### A. 让"实际训练"覆盖 dayType
当前 `trainingDay` 由"是不是这周这几天"决定。如果用户在 Tue（rest day per rule）跑了训练，
按现有逻辑当日还是 rest，目标卡走 `target_calories_rest`。

可选改造：
- `TrainingScheduleService.resolve()` 同时查 `t_workout_session`，如果当日有 `status=completed` 且
  duration ≥ 阈值（如 30 分钟）的 session → 把 dayType 升级为 training
- 优点：实际触发了体力消耗，按训练日补碳水更合理
- 缺点：用户期望的"周期化"会被破坏，可能不想要

建议等用户反馈再决定。

### B. 训练日蛋白质 / 碳水自动多给
现在 `protein_ratio` / `carb_ratio` 训练日和休息日同比例。
进阶：训练日蛋白比例 +5%、碳水 +10%，把 `t_user_goal` 拆成 training/rest 两套比例。
工作量：goal 模块 schema + UI 一起改，~半天。

### C. 训练强度 → 消耗的非线性
现在 `MetTable` 是 strength=5.0 一刀切。
实际：高强度训练 MET 可上 8（HIIT-style），低强度恢复训练 3-4。
可让 `t_workout_plan.intensity` (1-3) 影响 MET 选择。

## 验证步骤

1. 用 demo 账号（profile 完整）登录
2. `/goal` 页填好 training/rest 两组目标卡
3. `/training/plans` 创建一个力量计划 → 开始训练 → 完成
4. 回 `/` 首页：「今日能量闭环」卡片应该显示 TDEE + 运动消耗 + 净赤字
5. 进 `/statistics` 看当日 `dayType` 是 1（如果今天是训练日）/ 2（如果休息日按规则）
   且 `targetCalories` 与目标设置一致
