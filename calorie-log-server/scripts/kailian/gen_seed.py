#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
从开练抓取的 kailian_full.json 生成 Flyway 迁移 V15__seed_kailian_exercises.sql。

输入：同目录 kailian_full.json（{categories, actions, meta}）
输出：../../src/main/resources/db/migration/V15__seed_kailian_exercises.sql

包含：
  - t_sub_region            小类（细分部位）
  - t_exercise              506 条动作（含 equipment / equipment_detail / target_muscle
                            / detail_sections JSONB / met / image_url）
  - t_exercise_sub_region   动作 ↔ 小类 多对多

MET 映射（见 met_for）：拉伸 2.5 / 有氧逐个标 / 全身 8 / 力量按 大类×器械 查表，
最后用 OVERRIDES 盖离群点（静态保持、爆发弹震）。数值锚点取 ACSM Compendium。
"""
import json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "kailian_full.json")
OUT = os.path.normpath(os.path.join(
    HERE, "..", "..", "src", "main", "resources", "db", "migration",
    "V15__seed_kailian_exercises.sql"))

IMG_BASE = "https://bcappandgame.com/img/exercises"  # nginx 静态服务前缀

# 大类(中文) -> 英文码
BIG_CODE = {
    "胸": "chest", "背": "back", "腿": "legs", "肩": "shoulders",
    "斜方肌": "traps", "二头": "biceps", "三头": "triceps", "小腿": "calves",
    "前臂": "forearms", "臀部": "glutes", "腹部": "core",
    "拉伸": "stretch", "有氧": "cardio", "全身": "fullbody",
}

# ---- MET 映射 ----
BIG_COMPOUND = {"胸", "背", "腿", "肩", "臀部"}        # 大肌群复合
FREE_OR_BW = {"杠铃", "哑铃", "史密斯", "自重"}
MACHINE_CABLE = {"器械", "绳索"}
# 有氧逐个标（键=动作名）
CARDIO_MET = {
    "跳绳": 12.0, "战绳": 9.0, "跑步机跑步": 9.0, "跑步机爬坡": 9.0,
    "划船机": 7.0, "动感单车": 7.0, "爬楼梯": 8.0, "椭圆机": 5.0,
    "开合跳": 8.0, "原地小碎步": 6.0,
}
# 离群 override（静态保持 / 爆发弹震），最终盖表值
OVERRIDES = {
    # 静态等长
    "平板支撑": 3.5, "健身球平板支撑": 3.5, "靠墙深蹲": 4.0, "靠墙静蹲": 4.0,
    # 爆发 / 弹震 / plyo
    "鼓掌俯卧撑": 8.0, "波比跳": 8.0, "深蹲跳": 7.0, "箭步跳": 7.0,
    "后踢腿跳": 7.0, "弹跳引体": 7.0, "高抬腿": 8.0, "波速球高抬腿": 8.0,
    "登山者": 8.0, "波速球登山者": 8.0, "药球登山者": 8.0, "踏板登山跑": 8.0,
    "壶铃摆荡": 7.0, "单手壶铃摆荡": 7.0, "药球下砸": 6.0, "靠墙倒立撑": 5.0,
}


def met_for(big, equip, name):
    if name in OVERRIDES:
        return OVERRIDES[name]
    if big == "拉伸":
        return 2.5
    if big == "有氧":
        return CARDIO_MET.get(name, 6.0)
    if big == "全身":
        return 8.0
    # 力量
    compound = big in BIG_COMPOUND
    if equip in FREE_OR_BW:
        return 6.0 if compound else 4.5
    if equip in MACHINE_CABLE:
        return 5.0 if compound else 4.0
    # 弹力带 / 小工具 等
    return 4.5 if compound else 4.0


def q(s):
    """SQL 单引号转义"""
    if s is None:
        return "NULL"
    return "'" + s.replace("'", "''") + "'"


def main():
    d = json.load(open(SRC, encoding="utf-8"))
    cats, acts = d["categories"], d["actions"]

    # 1) 动作 -> 大类(中文)、动作 -> 粗粒度器械（取自 groups_self 表头）
    big_of, coarse_of = {}, {}
    sub_members = []   # (action_name, big_code, sub_cn)
    sub_regions = {}   # (big_code, sub_cn) -> sort
    for big, info in cats.items():
        for header, names in info.get("groups_self", []):
            for n in names:
                big_of.setdefault(n, big)
                coarse_of.setdefault(n, header)
        for si, (sub, sinfo) in enumerate(info.get("subcats", {}).items(), 1):
            sub_regions[(BIG_CODE[big], sub)] = si
            for header, names in sinfo["groups"]:
                for n in names:
                    sub_members.append((n, BIG_CODE[big], sub))

    # 2) 生成 SQL
    lines = []
    lines.append("-- ============================================================")
    lines.append("-- V15: 开练动作库 seed（由 scripts/kailian/gen_seed.py 生成，请勿手改）")
    lines.append(f"-- 来源：{d.get('meta', {}).get('source', '开练')}  动作数：{len(acts)}")
    lines.append("-- ============================================================\n")

    # 2a) 小类
    lines.append("-- 小类（细分部位）")
    sr_vals = []
    for (bp, sub), sort in sorted(sub_regions.items(), key=lambda x: (x[0][0], x[1])):
        sr_vals.append(f"({q(bp)}, {q(sub)}, {sort})")
    lines.append("INSERT INTO t_sub_region (body_part, name_cn, sort) VALUES")
    lines.append(",\n".join(sr_vals) + ";\n")

    # 2b) 动作
    lines.append("-- 动作")
    lines.append("INSERT INTO t_exercise (name, body_part, category, equipment, equipment_detail, "
                 "target_muscle, met, detail_sections, instructions, image_url, "
                 "is_preset, created_by, is_custom, is_popular) VALUES")
    ex_vals = []
    for name, rec in acts.items():
        big = big_of.get(name)
        if big is None:
            continue
        coarse = coarse_of.get(name) or rec.get("equipment")
        fine = rec.get("equipment")
        fine_out = fine if (fine and fine != coarse) else None
        met = met_for(big, coarse, name)
        # 步骤 -> instructions（兼容搜索/旧展示）
        steps = next((s["items"] for s in rec["sections"] if s["title"] == "步骤"), [])
        instructions = " ".join(steps) if steps else None
        sections_json = json.dumps(rec["sections"], ensure_ascii=False)
        img = rec.get("image")  # images/act_0001.png
        img_url = f"{IMG_BASE}/{os.path.basename(img)}" if img else None
        ex_vals.append(
            f"({q(name)}, {q(big)}, {q(BIG_CODE[big])}, {q(coarse)}, {q(fine_out)}, "
            f"{q(rec.get('target'))}, {met}, {q(sections_json)}::jsonb, {q(instructions)}, "
            f"{q(img_url)}, TRUE, NULL, FALSE, TRUE)"
        )
    lines.append(",\n".join(ex_vals) + ";\n")

    # 2c) 多对多
    lines.append("-- 动作 ↔ 小类")
    mm_vals = [f"({q(n)}, {q(bp)}, {q(sub)})" for (n, bp, sub) in sub_members]
    lines.append("INSERT INTO t_exercise_sub_region (exercise_id, sub_region_id)")
    lines.append("SELECT e.id, s.id FROM (VALUES")
    lines.append(",\n".join(mm_vals))
    lines.append(") AS m(name, bp, sub)")
    lines.append("JOIN t_exercise e ON e.name = m.name")
    lines.append("JOIN t_sub_region s ON s.body_part = m.bp AND s.name_cn = m.sub;")

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    open(OUT, "w", encoding="utf-8").write("\n".join(lines) + "\n")

    # 统计 + MET 分布
    from collections import Counter
    met_dist = Counter()
    for name, rec in acts.items():
        big = big_of.get(name)
        if big:
            met_dist[met_for(big, coarse_of.get(name) or rec.get("equipment"), name)] += 1
    print(f"写出 {OUT}")
    print(f"  小类 {len(sub_regions)} | 动作 {len(ex_vals)} | 多对多 {len(mm_vals)}")
    print("  MET 分布:", dict(sorted(met_dist.items())))


if __name__ == "__main__":
    main()
