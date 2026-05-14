# sports 仓库归档指南

`sports` 的所有有价值代码都已并入 calorie-log（详见 `merge-sports` 分支的 4 个 commit）。
为避免未来分裂、误改老仓库，建议把 `beforeborn01/sports` 标记为只读归档。

## 1. 在 sports 仓库根添加迁移说明

```bash
cd /Users/bc/code/games/sports
git checkout main      # 或当前默认分支
```

把现有 `README.md` 替换为：

````markdown
# Sports（已归档）

本仓库已合并进 [calorie-log](https://github.com/<你的用户名>/calorie-log) `merge-sports` 分支。
后续开发请在 calorie-log 上进行，本仓库仅作历史留档。

## 合并内容（commit ref）

- 训练动作库 → `calorie-log` 的 t_exercise（合并 + 扩展字段）
- 训练计划 / 会话 / 完成组 / PR / 统计 → 全部移到 `com.calorielog.module.training.*`
- LLM 客户端 → `com.calorielog.module.ai.llm`
- 训练消耗 → t_daily_summary.exercise_calories（净赤字闭环）

详见 calorie-log 仓库 `docs/`、`architecture-v1.md`。

## 为什么归档

参见 calorie-log 仓库的合并 PR（4 个 commit，Phase 1-4）。
````

```bash
git add README.md
git commit -m "docs: archive notice — merged into calorie-log"
git push
```

## 2. 把仓库设置为 Archive（GitHub Web UI）

1. 打开 https://github.com/beforeborn01/sports/settings
2. 拖到最下面 "Danger Zone"
3. 点击 **Archive this repository**
4. 输入仓库名确认

归档后：
- 仓库变只读，无人能 push（包括你自己）
- 仍可被 clone / 查看 / fork
- 在仓库主页顶部会有 "Archived" 黄色标签

## 3. 通知协作者（如果有）

如果 sports 仓库有过其他贡献者：
- 在归档前给他们发一封简短邮件 / Issue 通告
- 关闭所有 open PR / Issue 并 link 到 calorie-log 对应位置

## 4. 本地清理（可选）

```bash
# 本地 sports 工作目录如果不再用，可以移到归档位置
mv /Users/bc/code/games/sports /Users/bc/code/_archive/sports-2026-05
```

留个时间戳便于回溯。

## 5. 如果要解除归档

GitHub 上同样在 Settings → Danger Zone → Unarchive。
但通常不应该这么做 —— 如果有需求请直接在 calorie-log 上做。
