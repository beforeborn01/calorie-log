"""
Sanotsu/china-food-composition-data 导入脚本

数据源：https://github.com/Sanotsu/china-food-composition-data
原始来自《中国食物成分表标准版（第 6 版）》，CDC 营养与健康所官方数据。

抓取方式：
  1) 调 GitHub Contents API 列 json_data/ 下所有 merged-*.json
  2) raw.githubusercontent.com 拉每个文件
  3) 清洗：'Tr'→0、'-'/''→None、'(0.04)'→0.04、'24 0.4' 这种 OCR 错位→None
  4) 字段映射到 t_food schema，输出 raw + ndjson + csv + seed_*.sql

字段映射（Sanotsu → t_food）：
  foodName        → name
  edible          → gross_net_ratio = edible / 100
  energyKCal      → calories
  protein/fat/CHO → protein/fat/carbohydrate
  dietaryFiber    → dietary_fiber
  vitaminA        → vitamin_a (μg)
  thiamin         → vitamin_b1 (mg)
  riboflavin      → vitamin_b2 (mg)
  vitaminC        → vitamin_c (mg)
  vitaminETotal   → vitamin_e (mg)
  Na/K/Ca/Fe/Zn   → sodium/potassium/calcium/iron/zinc (mg)
  data_source     = 'cfct'

类目（基于文件名顶层）→ V4 中文类目：
  乳/蛋/豆/婴幼儿       → 蛋奶豆 (婴幼儿单独)
  谷/薯                → 主食
  畜肉/禽肉              → 肉类
  鱼虾蟹贝              → 水产
  蔬菜/菌藻              → 蔬菜
  水果                  → 水果
  坚果种子              → 坚果
  动物油脂              → 油脂
  其他                  → 其他

raw 字段（钾、磷、镁、硒、铜、锰、烟酸、视黄醇等）保留在 raw/<filename>.json
和 foods.ndjson 里，方便后续 schema 扩展时一次回灌。

使用：
    pip install httpx
    python scripts/scrape_sanotsu.py
    python scripts/scrape_sanotsu.py --resume       # 复用已下载的 raw
    python scripts/scrape_sanotsu.py --include-baby # 默认排除婴幼儿食品
"""
from __future__ import annotations

import argparse
import asyncio
import csv
import json
import logging
import re
import sys
import time
from dataclasses import dataclass, asdict, field
from pathlib import Path
from typing import Any

try:
    import httpx
except ImportError:
    sys.exit("Please install httpx: pip install httpx")


REPO = "Sanotsu/china-food-composition-data"
LIST_URL = f"https://api.github.com/repos/{REPO}/contents/json_data"
RAW_BASE = f"https://raw.githubusercontent.com/{REPO}/main/json_data"

OUT_DIR = Path(__file__).resolve().parent / "data" / "sanotsu"
RAW_DIR = OUT_DIR / "raw"

# 顶层类目（提取自文件名 merged-{TOP}-{SUB}.json）→ t_food.category
TOP_TO_CATEGORY = {
    "乳类及其制品": "蛋奶豆",
    "蛋类及其制品": "蛋奶豆",
    "干豆类及其制品": "蛋奶豆",
    "婴幼儿食品": "婴幼儿食品",  # 单独一类，默认排除
    "谷类及其制品": "主食",
    "薯类淀粉及其制品": "主食",
    "畜肉类及其制品": "肉类",
    "禽肉类及其制品": "肉类",
    "鱼虾蟹贝类": "水产",
    "蔬菜类及其制品": "蔬菜",
    "菌藻类": "菌藻",  # 中医里也常单算一类，分出来
    "水果类及其制品": "水果",
    "坚果种子类": "坚果",
    "动物油脂类": "油脂",
    "其他类": "其他",
}

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s"
)
log = logging.getLogger("scrape_sanotsu")


# ---------------------------------------------------------------------------
# Cleaning
# ---------------------------------------------------------------------------

_TRACE_TOKENS = {"tr", "Tr", "TR", "微量", "痕量"}
_NULL_TOKENS = {"", "-", "—", "/", "null", "None", "未检测", "未测"}


def clean_num(raw: Any) -> float | None:
    """中国食物成分表数据噪点：

    "Tr"/"微量"   → 0.0
    "-"/""/未检测 → None
    "(0.04)"     → 0.04
    "0.04"       → 0.04
    "24 0.4"     → None（OCR 错位，俩数字粘一起，无法判断哪个对）
    "<0.01"      → 0.01（按上限保守）
    """
    if raw is None:
        return None
    s = str(raw).strip()
    if s in _NULL_TOKENS:
        return None
    if s in _TRACE_TOKENS:
        return 0.0

    # 去括号 (0.04) → 0.04
    if s.startswith("(") and s.endswith(")"):
        s = s[1:-1].strip()

    # 去前缀 < or ≤
    s = re.sub(r"^[<≤]\s*", "", s)

    # 去单位粘连：常见 "0.04mg"、"100g"
    s = re.sub(r"\s*(mg|g|μg|ug|kcal|kJ)\s*$", "", s, flags=re.I)

    # OCR 错位：内部空格分两段都是数字 → 不可信
    if re.search(r"\d\s+\d", s):
        return None

    try:
        return float(s)
    except (TypeError, ValueError):
        return None


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

@dataclass
class FoodRecord:
    food_code: str
    name: str
    category: str         # V4 中文类目
    sub_category: str     # 文件名里的子类（如「酸奶」「鸡」）
    top_category_raw: str # 原始顶层（如「乳类及其制品」）

    # t_food schema 的核心字段（每 100g）
    calories: float | None = None       # energyKCal
    protein: float | None = None        # protein
    carbohydrate: float | None = None   # CHO
    fat: float | None = None            # fat
    dietary_fiber: float | None = None  # dietaryFiber
    vitamin_a: float | None = None      # μg
    vitamin_b1: float | None = None     # mg, thiamin
    vitamin_b2: float | None = None     # mg, riboflavin
    vitamin_c: float | None = None      # mg
    vitamin_e: float | None = None      # mg, vitaminETotal
    sodium: float | None = None         # mg
    potassium: float | None = None      # mg
    calcium: float | None = None        # mg
    iron: float | None = None           # mg
    zinc: float | None = None           # mg
    gross_net_ratio: float | None = None  # edible/100
    is_hard_to_weigh: bool = False        # edible<100 → True

    # 保留供后续扩 schema：磷/镁/硒/铜/锰/烟酸/视黄醇/胡萝卜素/灰分/水分/能量(kJ)
    extra: dict[str, Any] = field(default_factory=dict)

    raw: dict[str, Any] = field(default_factory=dict)
    scraped_at: str = ""


# ---------------------------------------------------------------------------
# GitHub fetch
# ---------------------------------------------------------------------------

async def list_json_files(client: httpx.AsyncClient) -> list[dict]:
    log.info("listing %s", LIST_URL)
    r = await client.get(LIST_URL)
    r.raise_for_status()
    items = r.json()
    files = [it for it in items if it["type"] == "file" and it["name"].endswith(".json")]
    log.info("found %d json files", len(files))
    return files


async def fetch_file(client: httpx.AsyncClient, name: str, resume: bool) -> list[dict]:
    raw_path = RAW_DIR / name
    if resume and raw_path.exists():
        try:
            return json.loads(raw_path.read_text())
        except Exception:
            pass
    url = f"{RAW_BASE}/{name}"
    for attempt in range(3):
        try:
            r = await client.get(url)
            r.raise_for_status()
            data = r.json()
            raw_path.write_text(json.dumps(data, ensure_ascii=False, indent=2))
            return data
        except (httpx.TimeoutException, httpx.HTTPStatusError, httpx.TransportError) as e:
            wait = 2 ** attempt
            log.warning("retry %d for %s after %ds: %s", attempt + 1, name, wait, e)
            await asyncio.sleep(wait)
    log.error("giving up: %s", name)
    return []


# ---------------------------------------------------------------------------
# Parse one record
# ---------------------------------------------------------------------------

_BRACKET_OPEN_RE = re.compile(r"[\[【「『〖［（]")
_BRACKET_CLOSE_RE = re.compile(r"[\]】」』〗］）]")


def clean_name(s: str) -> str:
    """统一各种括号到半角 ()，合并多余空格。

    源数据里 [ 】 「 ］ （ ） 杂用，看着混乱也影响搜索；统一后
    "馒头 (代表值）" / "粳米（小站稻米）" 都会变成 "馒头 (代表值)"。
    """
    s = _BRACKET_OPEN_RE.sub("(", s)
    s = _BRACKET_CLOSE_RE.sub(")", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def is_record_sane(r: "FoodRecord") -> tuple[bool, str]:
    """数据合理性闸：返回 (是否通过, 原因)。"""
    if len(r.name) < 2:
        return False, "name too short (likely OCR truncation)"
    # 物理不可能：单宏量 > 100 g/100g
    for k in ("protein", "carbohydrate", "fat"):
        v = getattr(r, k)
        if v is not None and v > 100:
            return False, f"{k}={v} > 100g/100g (physically impossible)"
    # 热量上限：纯油脂 ~899 kcal
    if r.calories is not None and r.calories > 950:
        return False, f"calories={r.calories} > 950 kcal/100g (impossible)"
    # 4-4-9 严重偏差（OCR 字段错位）
    if all(getattr(r, k) is not None for k in ("calories", "protein", "carbohydrate", "fat")) and r.calories > 5:
        computed = 4 * r.protein + 4 * r.carbohydrate + 9 * r.fat
        diff = abs(r.calories - computed) / r.calories
        if diff > 0.60 and abs(r.calories - computed) > 80:
            return False, f"4-4-9 mismatch {diff*100:.0f}% (OCR field shift)"
    return True, ""


def parse_record(raw: dict, top: str, sub: str, category: str) -> FoodRecord | None:
    name = clean_name(raw.get("foodName") or "")
    if not name:
        return None

    edible = clean_num(raw.get("edible"))
    gnr = (edible / 100.0) if edible is not None else None
    hard_to_weigh = bool(edible is not None and edible < 100)

    extra = {
        "energyKJ": clean_num(raw.get("energyKJ")),
        "water": clean_num(raw.get("water")),
        "ash": clean_num(raw.get("ash")),
        "cholesterol": clean_num(raw.get("cholesterol")),  # mg
        "carotene": clean_num(raw.get("carotene")),        # μg
        "retinol": clean_num(raw.get("retinol")),          # μg
        "niacin": clean_num(raw.get("niacin")),            # mg
        "vitaminE1": clean_num(raw.get("vitaminE1")),
        "vitaminE2": clean_num(raw.get("vitaminE2")),
        "vitaminE3": clean_num(raw.get("vitaminE3")),
        "phosphorus": clean_num(raw.get("P")),
        "magnesium": clean_num(raw.get("Mg")),
        "selenium": clean_num(raw.get("Se")),              # μg
        "copper": clean_num(raw.get("Cu")),
        "manganese": clean_num(raw.get("Mn")),
        "remark": (raw.get("remark") or "").strip() or None,
    }

    return FoodRecord(
        food_code=str(raw.get("foodCode") or "").strip(),
        name=name,
        category=category,
        sub_category=sub,
        top_category_raw=top,
        calories=clean_num(raw.get("energyKCal")),
        protein=clean_num(raw.get("protein")),
        carbohydrate=clean_num(raw.get("CHO")),
        fat=clean_num(raw.get("fat")),
        dietary_fiber=clean_num(raw.get("dietaryFiber")),
        vitamin_a=clean_num(raw.get("vitaminA")),
        vitamin_b1=clean_num(raw.get("thiamin")),
        vitamin_b2=clean_num(raw.get("riboflavin")),
        vitamin_c=clean_num(raw.get("vitaminC")),
        vitamin_e=clean_num(raw.get("vitaminETotal")),
        sodium=clean_num(raw.get("Na")),
        potassium=clean_num(raw.get("K")),
        calcium=clean_num(raw.get("Ca")),
        iron=clean_num(raw.get("Fe")),
        zinc=clean_num(raw.get("Zn")),
        gross_net_ratio=gnr,
        is_hard_to_weigh=hard_to_weigh,
        extra=extra,
        raw=raw,
        scraped_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    )


def parse_filename(name: str) -> tuple[str, str] | None:
    """merged-{top}-{sub}.json → (top, sub)。包含连字符的子类（婴幼儿那些）也保留。"""
    if not (name.startswith("merged-") and name.endswith(".json")):
        return None
    rest = name[len("merged-"):-len(".json")]
    if "-" not in rest:
        return None
    top, sub = rest.split("-", 1)
    return top, sub


# ---------------------------------------------------------------------------
# Driver
# ---------------------------------------------------------------------------

async def scrape(resume: bool, include_baby: bool, concurrency: int) -> list[FoodRecord]:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    RAW_DIR.mkdir(parents=True, exist_ok=True)

    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "calorie-log-importer",
    }
    timeout = httpx.Timeout(30.0, connect=10.0)
    async with httpx.AsyncClient(headers=headers, timeout=timeout, http2=True) as client:
        # --resume 时若已有完整缓存，跳过 GitHub API（避免 60/h 限频踩坑）
        cached = sorted(p.name for p in RAW_DIR.glob("merged-*.json")) if RAW_DIR.exists() else []
        if resume and cached:
            log.info("resume: 用本地缓存的 %d 个文件，跳过 GitHub API", len(cached))
            files = [{"name": n, "type": "file"} for n in cached]
        else:
            files = await list_json_files(client)

        sem = asyncio.Semaphore(concurrency)
        results: list[FoodRecord] = []
        skipped_unknown_cat: list[str] = []
        skipped_baby = 0

        async def handle(it: dict) -> None:
            nonlocal skipped_baby
            name = it["name"]
            parsed = parse_filename(name)
            if not parsed:
                return
            top, sub = parsed
            category = TOP_TO_CATEGORY.get(top)
            if category is None:
                skipped_unknown_cat.append(top)
                return
            if category == "婴幼儿食品" and not include_baby:
                async with sem:
                    data = await fetch_file(client, name, resume)
                skipped_baby += len(data)
                return
            async with sem:
                data = await fetch_file(client, name, resume)
            for rec_raw in data:
                rec = parse_record(rec_raw, top, sub, category)
                if rec:
                    results.append(rec)

        await asyncio.gather(*(handle(it) for it in files))

        if skipped_unknown_cat:
            log.warning("未映射类目: %s", set(skipped_unknown_cat))
        if skipped_baby:
            log.info("已排除婴幼儿食品 %d 条（--include-baby 启用）", skipped_baby)

    log.info("parsed %d records", len(results))
    return results


# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------

def write_ndjson(records: list[FoodRecord]) -> Path:
    p = OUT_DIR / "foods.ndjson"
    with p.open("w", encoding="utf-8") as f:
        for r in records:
            f.write(json.dumps(asdict(r), ensure_ascii=False) + "\n")
    log.info("wrote %s (%d records)", p, len(records))
    return p


def write_csv(records: list[FoodRecord]) -> Path:
    p = OUT_DIR / "foods.csv"
    fieldnames = [
        "food_code", "name", "category", "sub_category", "top_category_raw",
        "calories", "protein", "carbohydrate", "fat", "dietary_fiber",
        "vitamin_a", "vitamin_b1", "vitamin_b2", "vitamin_c", "vitamin_e",
        "sodium", "potassium", "calcium", "iron", "zinc",
        "gross_net_ratio", "is_hard_to_weigh", "scraped_at",
    ]
    with p.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for r in records:
            w.writerow({k: getattr(r, k) for k in fieldnames})
    log.info("wrote %s", p)
    return p


def _sql_str(s: str | None) -> str:
    if s is None or s == "":
        return "NULL"
    return "'" + s.replace("'", "''") + "'"


def _sql_num(v: float | None) -> str:
    if v is None:
        return "NULL"
    return f"{v:g}"


def _sql_bool(b: bool) -> str:
    return "TRUE" if b else "FALSE"


NAME_MAX = 100  # t_food.name VARCHAR(100)


def _build_value_rows(records: list[FoodRecord]) -> tuple[list[str], dict[str, int]]:
    """通用：把 records 渲成 SQL VALUES 行 + 各类计数。"""
    rows: list[str] = []
    seen: set[str] = set()
    counts = {"truncated": 0, "insane": 0, "dup": 0}
    for r in records:
        ok, _ = is_record_sane(r)
        if not ok:
            counts["insane"] += 1
            continue
        name = r.name
        if len(name) > NAME_MAX:
            name = name[:NAME_MAX].rstrip()
            counts["truncated"] += 1
        if name in seen:
            counts["dup"] += 1
            continue
        seen.add(name)
        rows.append(
            "  ("
            f"{_sql_str(name)}, "
            f"{_sql_str(r.category)}, "
            f"{_sql_num(r.calories)}, "
            f"{_sql_num(r.protein)}, "
            f"{_sql_num(r.carbohydrate)}, "
            f"{_sql_num(r.fat)}, "
            f"{_sql_num(r.dietary_fiber)}, "
            f"{_sql_num(r.vitamin_a)}, "
            f"{_sql_num(r.vitamin_b1)}, "
            f"{_sql_num(r.vitamin_b2)}, "
            f"{_sql_num(r.vitamin_c)}, "
            f"{_sql_num(r.vitamin_e)}, "
            f"{_sql_num(r.sodium)}, "
            f"{_sql_num(r.potassium)}, "
            f"{_sql_num(r.calcium)}, "
            f"{_sql_num(r.iron)}, "
            f"{_sql_num(r.zinc)}, "
            f"{_sql_bool(r.is_hard_to_weigh)}, "
            f"{_sql_num(r.gross_net_ratio)}"
            ")"
        )
    return rows, counts


def write_flyway_v8(records: list[FoodRecord], target_dir: Path) -> Path:
    """Flyway 迁移 V8：staging 表 + WHERE NOT EXISTS 幂等合并。

    与 V7 的写法对齐：跳过任何 t_food.name 已存在（且未软删）的记录。
    这样 V4 手录的 47 条口语短名（白米饭/土豆/苹果...）能保留，
    Sanotsu 1540 条按学名补齐，并自然避开 6 条精确重名。
    """
    p = target_dir / "V8__seed_foods_cfct.sql"
    rows, counts = _build_value_rows(records)
    lines: list[str] = []
    lines.append("-- ============================================================")
    lines.append("-- V8: 中国食物成分表（第 6 版）批量种入 t_food")
    lines.append("--")
    lines.append("-- 数据源：https://github.com/Sanotsu/china-food-composition-data")
    lines.append("-- 由 scripts/scrape_sanotsu.py 生成；不要手工编辑")
    lines.append(f"-- 候选条数: {len(rows)}（已过滤 OCR 错位 {counts['insane']} 条 / 同名去重 {counts['dup']} 条）")
    lines.append("--")
    lines.append("-- 幂等策略：staging 表 + WHERE NOT EXISTS")
    lines.append("--   - V4 已录的 47 条口语名（白米饭/土豆/苹果...）保留")
    lines.append("--   - Sanotsu 中 6 条与 V4 精确重名（基围虾/鸡蛋白/鸡蛋黄/胡萝卜/西葫芦/杏仁）会被跳过")
    lines.append("--   - 其余 ~1534 条作为补充入库")
    lines.append("-- ============================================================")
    lines.append("")
    lines.append("CREATE TEMPORARY TABLE _v8_staging (")
    lines.append("    name             VARCHAR(100) NOT NULL,")
    lines.append("    category         VARCHAR(50),")
    lines.append("    calories         DECIMAL(8,2),")
    lines.append("    protein          DECIMAL(8,2),")
    lines.append("    carbohydrate     DECIMAL(8,2),")
    lines.append("    fat              DECIMAL(8,2),")
    lines.append("    dietary_fiber    DECIMAL(8,2),")
    lines.append("    vitamin_a        DECIMAL(8,2),")
    lines.append("    vitamin_b1       DECIMAL(8,2),")
    lines.append("    vitamin_b2       DECIMAL(8,2),")
    lines.append("    vitamin_c        DECIMAL(8,2),")
    lines.append("    vitamin_e        DECIMAL(8,2),")
    lines.append("    sodium           DECIMAL(8,2),")
    lines.append("    potassium        DECIMAL(8,2),")
    lines.append("    calcium          DECIMAL(8,2),")
    lines.append("    iron             DECIMAL(8,2),")
    lines.append("    zinc             DECIMAL(8,2),")
    lines.append("    is_hard_to_weigh BOOLEAN,")
    lines.append("    gross_net_ratio  DECIMAL(5,2)")
    lines.append(");")
    lines.append("")
    lines.append(
        "INSERT INTO _v8_staging\n"
        "(name, category, calories, protein, carbohydrate, fat, dietary_fiber,\n"
        " vitamin_a, vitamin_b1, vitamin_b2, vitamin_c, vitamin_e,\n"
        " sodium, potassium, calcium, iron, zinc,\n"
        " is_hard_to_weigh, gross_net_ratio)\n"
        "VALUES"
    )
    if not rows:
        lines.append("  -- (no rows)")
    else:
        lines.append(",\n".join(rows) + ";")
    lines.append("")
    lines.append("INSERT INTO t_food")
    lines.append("  (name, alias, category, unit, calories, protein, carbohydrate, fat,")
    lines.append("   dietary_fiber, vitamin_a, vitamin_b1, vitamin_b2, vitamin_c, vitamin_e,")
    lines.append("   sodium, potassium, calcium, iron, zinc,")
    lines.append("   is_hard_to_weigh, gross_net_ratio, data_source)")
    lines.append("SELECT")
    lines.append("    s.name, NULL, s.category, 'g',")
    lines.append("    s.calories, s.protein, s.carbohydrate, s.fat,")
    lines.append("    s.dietary_fiber, s.vitamin_a, s.vitamin_b1, s.vitamin_b2, s.vitamin_c, s.vitamin_e,")
    lines.append("    s.sodium, s.potassium, s.calcium, s.iron, s.zinc,")
    lines.append("    s.is_hard_to_weigh, s.gross_net_ratio, 'cfct'")
    lines.append("FROM _v8_staging s")
    lines.append("WHERE NOT EXISTS (")
    lines.append("    SELECT 1 FROM t_food t")
    lines.append("    WHERE t.name = s.name AND t.deleted_at IS NULL")
    lines.append(");")
    lines.append("")
    lines.append("DROP TABLE _v8_staging;")
    p.write_text("\n".join(lines), encoding="utf-8")
    log.info("wrote %s (%d rows)", p, len(rows))
    return p


def write_sql(records: list[FoodRecord]) -> Path:
    p = OUT_DIR / "seed_foods_cfct.sql"
    lines: list[str] = []
    lines.append("-- ============================================================")
    lines.append("-- 中国食物成分表（第 6 版） → t_food")
    lines.append(f"-- 由 scripts/scrape_sanotsu.py 生成；数据条数 {len(records)}")
    lines.append("-- 数据源：https://github.com/Sanotsu/china-food-composition-data")
    lines.append("-- ============================================================")
    lines.append("")
    lines.append("-- ⚠️ 如果 V4__seed_foods_basic.sql 已经跑过（47 条 cfct），")
    lines.append("--    建议先清空老的 cfct 数据再导入，避免同名重复行：")
    lines.append("--    DELETE FROM t_food WHERE data_source='cfct';")
    lines.append("")
    lines.append("BEGIN;")
    lines.append("")
    lines.append(
        "INSERT INTO t_food\n"
        "(name, alias, category, unit, calories, protein, carbohydrate, fat,\n"
        " dietary_fiber, vitamin_a, vitamin_b1, vitamin_b2, vitamin_c, vitamin_e,\n"
        " sodium, potassium, calcium, iron, zinc,\n"
        " is_hard_to_weigh, gross_net_ratio, data_source)\n"
        "VALUES"
    )
    rows = []
    seen: set[str] = set()
    truncated = 0
    skipped_insane = 0
    for r in records:
        ok, reason = is_record_sane(r)
        if not ok:
            log.debug("skip %s: %s", r.name, reason)
            skipped_insane += 1
            continue
        name = r.name
        if len(name) > NAME_MAX:
            name = name[:NAME_MAX].rstrip()
            truncated += 1
        # 同名去重（CFCT 里不同 foodCode 可能重名）
        if name in seen:
            continue
        seen.add(name)
        rows.append(
            "  ("
            f"{_sql_str(name)}, "
            f"NULL, "
            f"{_sql_str(r.category)}, "
            f"'g', "
            f"{_sql_num(r.calories)}, "
            f"{_sql_num(r.protein)}, "
            f"{_sql_num(r.carbohydrate)}, "
            f"{_sql_num(r.fat)}, "
            f"{_sql_num(r.dietary_fiber)}, "
            f"{_sql_num(r.vitamin_a)}, "
            f"{_sql_num(r.vitamin_b1)}, "
            f"{_sql_num(r.vitamin_b2)}, "
            f"{_sql_num(r.vitamin_c)}, "
            f"{_sql_num(r.vitamin_e)}, "
            f"{_sql_num(r.sodium)}, "
            f"{_sql_num(r.potassium)}, "
            f"{_sql_num(r.calcium)}, "
            f"{_sql_num(r.iron)}, "
            f"{_sql_num(r.zinc)}, "
            f"{_sql_bool(r.is_hard_to_weigh)}, "
            f"{_sql_num(r.gross_net_ratio)}, "
            f"'cfct'"
            ")"
        )
    if not rows:
        lines.append("  -- (no rows)")
        lines.append("ROLLBACK;")
    else:
        lines.append(",\n".join(rows) + ";")
        lines.append("")
        lines.append("COMMIT;")
    p.write_text("\n".join(lines), encoding="utf-8")
    log.info(
        "wrote %s (%d rows; truncated=%d, insane=%d, dup=%d)",
        p, len(rows), truncated, skipped_insane,
        len(records) - len(rows) - truncated - skipped_insane,
    )
    return p


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--resume", action="store_true")
    ap.add_argument("--include-baby", action="store_true",
                    help="包含婴幼儿食品（默认排除）")
    ap.add_argument("--concurrency", type=int, default=8)
    args = ap.parse_args()

    records = asyncio.run(scrape(args.resume, args.include_baby, args.concurrency))
    if not records:
        log.error("nothing parsed")
        return 1
    records.sort(key=lambda r: (r.category, r.sub_category, r.name))
    write_ndjson(records)
    write_csv(records)
    write_sql(records)

    # Flyway 迁移文件直接写到 db/migration 下
    migrations_dir = Path(__file__).resolve().parent.parent / "src" / "main" / "resources" / "db" / "migration"
    if migrations_dir.exists():
        write_flyway_v8(records, migrations_dir)
    else:
        log.warning("migrations dir not found, skipping V8 generation: %s", migrations_dir)

    log.info("done. outputs in %s", OUT_DIR)
    return 0


if __name__ == "__main__":
    sys.exit(main())
