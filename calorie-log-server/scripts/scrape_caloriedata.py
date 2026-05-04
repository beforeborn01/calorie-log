"""
caloriedata.org 爬虫

读取 sitemap，抓取所有 /calories-in/<slug> 详情页，解析嵌入在
Next.js Flight payload 中的营养数据，输出三种产物：

  data/caloriedata/raw/<slug>.json     单页原始抽取结果（含面包屑、FAQ、餐量等所有字段）
  data/caloriedata/foods.ndjson        归一化后的食物记录（一行一个 JSON）
  data/caloriedata/foods.csv           同上 CSV 版
  data/caloriedata/seed_foods_caloriedata.sql
                                        可直接 psql 导入 t_food 的 INSERT 脚本

字段映射（caloriedata → t_food）：
  name                  Title Case 英文食物名（从面包屑取）
  alias                 NULL（保留供后续翻译填充）
  category              中文类目（按 EN_TO_CN_CATEGORY 映射，未命中则保留英文）
  unit                  'g'
  calories              kcal / 100g
  protein               g / 100g
  carbohydrate          g / 100g（Total Carbohydrate）
  fat                   g / 100g（Total Fat）
  dietary_fiber         g / 100g
  added_sugar           g / 100g（取 Sugars 字段；非严格意义的 added sugar，但已是该站可得最相近字段）
  sodium                mg / 100g
  其余维生素/矿物质      NULL（站点未提供）
  is_hard_to_weigh      FALSE
  gross_net_ratio       NULL
  data_source           'caloriedata'

使用：
    pip install httpx
    python scripts/scrape_caloriedata.py            # 全量
    python scripts/scrape_caloriedata.py --limit 10 # 抓 10 条试跑
    python scripts/scrape_caloriedata.py --resume   # 跳过已存在的 raw/<slug>.json
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
from xml.etree import ElementTree as ET

try:
    import httpx
except ImportError:
    sys.exit("Please install httpx: pip install httpx")


SITEMAP_URL = "https://caloriedata.org/sitemap.xml"
BASE_URL = "https://caloriedata.org"
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36 calorie-log-importer"
)

OUT_DIR = Path(__file__).resolve().parent / "data" / "caloriedata"
RAW_DIR = OUT_DIR / "raw"

# 映射到 V4__seed_foods_basic.sql 中已有的中文类目，未命中保留英文
EN_TO_CN_CATEGORY = {
    "Fruits": "水果",
    "Vegetables": "蔬菜",
    "Nuts & Seeds": "坚果",
    "Nuts and Seeds": "坚果",
    "Grains": "主食",
    "Grains & Pasta": "主食",
    "Grains & Cereals": "主食",
    "Cereals": "主食",
    "Bakery": "主食",
    "Beverages": "饮料",
    "Drinks": "饮料",
    "Dairy": "蛋奶豆",
    "Dairy & Eggs": "蛋奶豆",
    "Eggs": "蛋奶豆",
    "Meat": "肉类",
    "Meat & Poultry": "肉类",
    "Proteins & Meats": "肉类",
    "Poultry": "肉类",
    "Pork": "肉类",
    "Beef": "肉类",
    "Seafood": "水产",
    "Fish": "水产",
    "Fish & Seafood": "水产",
    "Oils & Fats": "油脂",
    "Fats & Oils": "油脂",
    "Legumes": "蛋奶豆",
    "Beans": "蛋奶豆",
    "Soy": "蛋奶豆",
    "Snacks": "零食",
    "Fast Food": "快餐",
    "Desserts": "甜点",
    "Sauces & Condiments": "调味",
    "Condiments": "调味",
}

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
log = logging.getLogger("scrape_caloriedata")


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

@dataclass
class FoodRecord:
    slug: str
    url: str
    name: str
    category: str | None
    category_slug: str | None
    breadcrumb: list[dict[str, str]] = field(default_factory=list)

    # 标准营养（每 100g）
    calories: float | None = None
    protein_g: float | None = None
    total_fat_g: float | None = None
    total_carb_g: float | None = None
    dietary_fiber_g: float | None = None
    sugars_g: float | None = None
    sodium_mg: float | None = None
    cholesterol_mg: float | None = None  # 来自 FAQ 文本

    # 全字段保留，便于后续二次加工
    nutrients_raw: list[dict[str, Any]] = field(default_factory=list)
    serving_sizes: list[dict[str, Any]] = field(default_factory=list)
    faq: list[dict[str, str]] = field(default_factory=list)

    scraped_at: str = ""


# ---------------------------------------------------------------------------
# Sitemap
# ---------------------------------------------------------------------------

async def fetch_food_urls(client: httpx.AsyncClient) -> list[str]:
    log.info("downloading sitemap %s", SITEMAP_URL)
    r = await client.get(SITEMAP_URL)
    r.raise_for_status()
    root = ET.fromstring(r.text)
    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    urls = [el.text.strip() for el in root.findall(".//sm:loc", ns) if el.text]
    food_urls = [u for u in urls if "/calories-in/" in u]
    log.info("sitemap: %d total urls, %d food urls", len(urls), len(food_urls))
    return food_urls


# ---------------------------------------------------------------------------
# Page parsing
# ---------------------------------------------------------------------------

FLIGHT_CHUNK_RE = re.compile(r'self\.__next_f\.push\(\[1,"(.*?)"\]\)', re.DOTALL)
NUTRIENT_ROW_RE = re.compile(
    r'children":"([A-Z][A-Za-z ()/]+?)"\}\],\s*\["\$","span",[^}]*"children":\[([\d.]+),"([a-zA-Z%]+)"\]'
)
SERVING_RE = re.compile(
    r'"\$","div","([^"]+?)",\{[^}]*?"children":"([^"]+?)"[^}]*?\}\][^]]*?'
    r'"children":\[(\d+(?:\.\d+)?),"\s*cal"\]'
)
CALORIES_HEADER_RE = re.compile(
    r'"text-4xl[^"]*","children":\[?(\d+(?:\.\d+)?)[, ]'
)
CALORIES_PROSE_RE = re.compile(
    r'contains\s*"\s*,\s*(\d+(?:\.\d+)?)\s*,\s*"\s*calories\s+per\s+100'
)
CALORIES_FAQ_RE = re.compile(
    r'contains\s+(\d+(?:\.\d+)?)\s+calories\s+per\s+100\s*g',
    re.I,
)
BREADCRUMB_RE = re.compile(
    r'"@type":"BreadcrumbList"[^]]*?"itemListElement":(\[.*?\])\}',
    re.DOTALL,
)
FAQ_RE = re.compile(
    r'"@type":"Question"[^}]*?"name":"([^"]+)"[^}]*?'
    r'"acceptedAnswer":\{[^}]*?"text":"([^"]+)"',
    re.DOTALL,
)
CHOLESTEROL_RE = re.compile(r'(\d+(?:\.\d+)?)\s*mg of cholesterol')


def _decode_flight(html: str) -> str:
    """合并并 unicode-unescape 所有 Next.js Flight chunk。"""
    chunks = FLIGHT_CHUNK_RE.findall(html)
    combined = "".join(chunks)
    # `self.__next_f.push(...)` 字符串里是被 JS 转义过的 — 用 unicode_escape 还原
    try:
        return combined.encode("utf-8", errors="replace").decode("unicode_escape", errors="replace")
    except Exception:
        return combined


def parse_food_page(slug: str, url: str, html: str) -> FoodRecord | None:
    decoded = _decode_flight(html)
    if not decoded:
        return None

    # ---- 面包屑：站点导出的 schema.org BreadcrumbList ----
    breadcrumb: list[dict[str, str]] = []
    name = slug.replace("-", " ").title()
    category = None
    category_slug = None

    # Flight chunk 中的 JSON 串经过 \" 二次转义；先尝试匹配较为宽松的版本
    bc_match = re.search(
        r'BreadcrumbList\\?",?\s*\\?"itemListElement\\?":(\[.*?\])\}',
        decoded,
        re.DOTALL,
    )
    if not bc_match:
        bc_match = re.search(
            r'"@type":"BreadcrumbList"[^]]*?"itemListElement":(\[.*?\])\}',
            decoded,
            re.DOTALL,
        )
    if bc_match:
        try:
            raw = bc_match.group(1).replace("\\\"", '"').replace("\\\\", "\\")
            items = json.loads(raw)
            for it in items:
                pos = it.get("position")
                nm = it.get("name")
                item = it.get("item")
                if isinstance(item, dict):
                    item_url = item.get("url") or item.get("@id")
                else:
                    item_url = item
                breadcrumb.append({"position": pos, "name": nm, "url": item_url})
                if pos == 2 and nm:
                    category = nm
                    if isinstance(item_url, str) and "/category/" in item_url:
                        category_slug = item_url.rsplit("/", 1)[-1]
                if pos == 3 and nm:
                    name = nm
        except Exception as e:
            log.debug("breadcrumb parse failed for %s: %s", slug, e)

    # ---- 营养行：可视化表格里的 (Label, value, unit) ----
    seen: set[str] = set()
    nutrients: list[dict[str, Any]] = []
    for m in NUTRIENT_ROW_RE.finditer(decoded):
        label = m.group(1).strip()
        # 同一字段会同时出现在「Macronutrient Distribution」和「Nutrient Facts」
        # 用 (label, unit) 去重
        key = f"{label}|{m.group(3)}"
        if key in seen:
            continue
        seen.add(key)
        try:
            value = float(m.group(2))
        except ValueError:
            continue
        nutrients.append({"label": label, "value": value, "unit": m.group(3)})

    def lookup(label_key: str, unit: str | None = None) -> float | None:
        target = label_key.lower()
        for n in nutrients:
            if n["label"].lower() == target and (unit is None or n["unit"] == unit):
                return n["value"]
        return None

    def first_present(*labels: str, unit: str | None = "g") -> float | None:
        # 不能用 `a or b`：值为 0.0 时会被吞掉
        for lab in labels:
            v = lookup(lab, unit)
            if v is not None:
                return v
        return None

    protein_g = first_present("Protein")
    total_fat_g = first_present("Total Fat", "Fat")
    total_carb_g = first_present("Total Carbohydrate", "Carbs", "Carbohydrates")
    dietary_fiber_g = first_present("Dietary Fiber")
    sugars_g = first_present("Sugars", "Total Sugars")
    sodium_mg = first_present("Sodium", unit="mg")

    # ---- 餐量：「Calories by Serving Size」面板 ----
    servings: list[dict[str, Any]] = []
    for m in SERVING_RE.finditer(decoded):
        servings.append(
            {
                "key": m.group(1),
                "label": m.group(2),
                "calories": float(m.group(3)),
            }
        )

    # ---- 卡路里：标题区四号字数字 ----
    calories: float | None = None
    cal_match = CALORIES_HEADER_RE.search(decoded)
    if cal_match:
        try:
            calories = float(cal_match.group(1))
        except ValueError:
            pass
    if calories is None:
        # 备选 1：JSX 拆片「"Cashews"," contains ",553," calories per 100"」
        m = CALORIES_PROSE_RE.search(decoded)
        if m:
            try:
                calories = float(m.group(1))
            except ValueError:
                pass
    if calories is None:
        # 备选 2：FAQ 文本，兼容 "100 grams" / "100g"
        m = CALORIES_FAQ_RE.search(decoded)
        if m:
            try:
                calories = float(m.group(1))
            except ValueError:
                pass
    if calories is None:
        # 备选 3：餐量面板里 "100 grams" 那一行
        for s in servings:
            if s.get("key") in ("100 grams", "100g") or s.get("label", "").strip().startswith("100 g"):
                try:
                    calories = float(s["calories"])
                    break
                except (KeyError, TypeError, ValueError):
                    pass

    # ---- FAQ：里面常含胆固醇等额外字段 ----
    faq_pairs: list[dict[str, str]] = []
    for m in FAQ_RE.finditer(decoded):
        q = m.group(1).replace('\\"', '"')
        a = m.group(2).replace('\\"', '"')
        faq_pairs.append({"question": q, "answer": a})

    cholesterol_mg = None
    for f in faq_pairs:
        m = CHOLESTEROL_RE.search(f["answer"])
        if m:
            try:
                cholesterol_mg = float(m.group(1))
                break
            except ValueError:
                pass

    return FoodRecord(
        slug=slug,
        url=url,
        name=name,
        category=category,
        category_slug=category_slug,
        breadcrumb=breadcrumb,
        calories=calories,
        protein_g=protein_g,
        total_fat_g=total_fat_g,
        total_carb_g=total_carb_g,
        dietary_fiber_g=dietary_fiber_g,
        sugars_g=sugars_g,
        sodium_mg=sodium_mg,
        cholesterol_mg=cholesterol_mg,
        nutrients_raw=nutrients,
        serving_sizes=servings,
        faq=faq_pairs,
        scraped_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    )


# ---------------------------------------------------------------------------
# Scraper driver
# ---------------------------------------------------------------------------

async def fetch_one(
    client: httpx.AsyncClient,
    url: str,
    sem: asyncio.Semaphore,
    resume: bool,
) -> FoodRecord | None:
    slug = url.rstrip("/").rsplit("/", 1)[-1]
    raw_path = RAW_DIR / f"{slug}.json"
    if resume and raw_path.exists():
        try:
            data = json.loads(raw_path.read_text())
            return FoodRecord(**data)
        except Exception:
            pass  # 损坏的旧文件 → 重抓

    async with sem:
        for attempt in range(3):
            try:
                r = await client.get(url)
                if r.status_code == 404:
                    log.warning("404 %s", url)
                    return None
                r.raise_for_status()
                rec = parse_food_page(slug, url, r.text)
                if rec is None:
                    log.warning("no parse: %s", url)
                    return None
                raw_path.write_text(json.dumps(asdict(rec), ensure_ascii=False, indent=2))
                # 节流：50–80ms 即可（站点在 Cloudflare 后；我们并发 8）
                await asyncio.sleep(0.05)
                return rec
            except (httpx.TimeoutException, httpx.HTTPStatusError, httpx.TransportError) as e:
                wait = 2 ** attempt
                log.warning("retry %d for %s after %ds: %s", attempt + 1, url, wait, e)
                await asyncio.sleep(wait)
        log.error("giving up: %s", url)
        return None


async def scrape(limit: int | None, resume: bool, concurrency: int) -> list[FoodRecord]:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    RAW_DIR.mkdir(parents=True, exist_ok=True)

    headers = {"User-Agent": USER_AGENT, "Accept-Language": "en-US,en;q=0.9"}
    timeout = httpx.Timeout(20.0, connect=10.0)
    async with httpx.AsyncClient(headers=headers, timeout=timeout, http2=True) as client:
        urls = await fetch_food_urls(client)
        if limit:
            urls = urls[:limit]
        sem = asyncio.Semaphore(concurrency)
        tasks = [fetch_one(client, u, sem, resume) for u in urls]
        results: list[FoodRecord] = []
        done = 0
        for fut in asyncio.as_completed(tasks):
            rec = await fut
            done += 1
            if rec:
                results.append(rec)
            if done % 25 == 0:
                log.info("progress: %d / %d", done, len(tasks))
    log.info("scraped %d / %d", len(results), len(urls))
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
        "slug", "url", "name", "category", "category_slug",
        "calories", "protein_g", "total_fat_g", "total_carb_g",
        "dietary_fiber_g", "sugars_g", "sodium_mg", "cholesterol_mg",
        "scraped_at",
    ]
    with p.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for r in records:
            w.writerow({k: getattr(r, k) for k in fieldnames})
    log.info("wrote %s", p)
    return p


def _sql_escape(s: str | None) -> str:
    if s is None:
        return "NULL"
    return "'" + s.replace("'", "''") + "'"


def _sql_num(v: float | None) -> str:
    return "NULL" if v is None else f"{v:g}"


def write_sql(records: list[FoodRecord]) -> Path:
    """生成 INSERT ... VALUES ... 脚本，可 psql -f 直接导入 t_food。"""
    p = OUT_DIR / "seed_foods_caloriedata.sql"
    lines: list[str] = []
    lines.append("-- ============================================================")
    lines.append("-- caloriedata.org 抓取数据 → t_food")
    lines.append("-- 由 scripts/scrape_caloriedata.py 生成；不要手工编辑")
    lines.append(f"-- 食物条数：{len(records)}")
    lines.append("-- ============================================================")
    lines.append("")
    lines.append("BEGIN;")
    lines.append("")
    lines.append(
        "INSERT INTO t_food\n"
        "(name, alias, barcode, category, unit, calories, protein, carbohydrate, fat,\n"
        " dietary_fiber, added_sugar, sodium, data_source)\n"
        "VALUES"
    )
    NAME_MAX = 100  # t_food.name VARCHAR(100)
    truncated_count = 0
    rows = []
    seen_names: set[str] = set()
    for r in records:
        name = r.name.strip()
        if not name or name.lower() in seen_names:
            continue
        if len(name) > NAME_MAX:
            name = name[:NAME_MAX].rstrip()
            truncated_count += 1
        seen_names.add(name.lower())
        if r.calories is None and r.protein_g is None and r.total_carb_g is None and r.total_fat_g is None:
            # 全空记录直接跳过，避免污染数据库
            continue
        cat_cn = EN_TO_CN_CATEGORY.get(r.category or "", r.category)
        rows.append(
            "  ("
            f"{_sql_escape(name)}, "
            f"NULL, "
            f"NULL, "
            f"{_sql_escape(cat_cn)}, "
            f"'g', "
            f"{_sql_num(r.calories)}, "
            f"{_sql_num(r.protein_g)}, "
            f"{_sql_num(r.total_carb_g)}, "
            f"{_sql_num(r.total_fat_g)}, "
            f"{_sql_num(r.dietary_fiber_g)}, "
            f"{_sql_num(r.sugars_g)}, "
            f"{_sql_num(r.sodium_mg)}, "
            f"'caloriedata'"
            ")"
        )
    if not rows:
        lines.append("  -- (no usable records)")
        lines.append("ROLLBACK;")
    else:
        lines.append(",\n".join(rows) + ";")
        lines.append("")
        lines.append("COMMIT;")
    p.write_text("\n".join(lines), encoding="utf-8")
    log.info("wrote %s (%d rows, %d names truncated to %d chars)", p, len(rows), truncated_count, NAME_MAX)
    return p


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=None, help="只抓前 N 条用于试跑")
    ap.add_argument("--resume", action="store_true", help="复用已下载的 raw/<slug>.json")
    ap.add_argument("--concurrency", type=int, default=8)
    args = ap.parse_args()

    records = asyncio.run(scrape(args.limit, args.resume, args.concurrency))
    if not records:
        log.error("nothing scraped")
        return 1
    records.sort(key=lambda r: r.slug)
    write_ndjson(records)
    write_csv(records)
    write_sql(records)
    log.info("done. outputs in %s", OUT_DIR)
    return 0


if __name__ == "__main__":
    sys.exit(main())
