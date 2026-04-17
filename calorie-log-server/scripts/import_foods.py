"""
食物基础数据导入脚本

该脚本将：
1. 读取《中国食物成分表》清洗后的 CSV（expected at data/cfct.csv）
2. 读取 Open Food Facts 中文商品子集 CSV（expected at data/off_cn.csv）
3. 映射至 t_food 完整字段，缺失字段填 NULL，不伪造数据
4. 批量 INSERT 到 PostgreSQL

使用方式：
    pip install psycopg[binary] pandas
    python scripts/import_foods.py \
        --db-url postgresql://postgres:postgres@localhost:5432/calorie_log_db \
        --cfct data/cfct.csv \
        --off  data/off_cn.csv

CFCT CSV 字段建议：
    name, alias, category, calories, protein, carbohydrate, fat, dietary_fiber,
    added_sugar, vitamin_a, vitamin_b1, vitamin_b2, vitamin_c, vitamin_e,
    sodium, potassium, calcium, iron, zinc, is_hard_to_weigh, gross_net_ratio

OFF CSV 字段建议：
    code (-> barcode), product_name (-> name), brands, categories_tags,
    energy-kcal_100g, proteins_100g, carbohydrates_100g, fat_100g, fiber_100g,
    sodium_100g, added-sugars_100g
"""
from __future__ import annotations

import argparse
import csv
import logging
import sys
from pathlib import Path
from typing import Iterable

try:
    import psycopg
except ImportError:
    sys.exit("Please install psycopg[binary]: pip install psycopg[binary]")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("import_foods")

INSERT_SQL = """
INSERT INTO t_food
(name, alias, barcode, category, unit, calories, protein, carbohydrate, fat,
 dietary_fiber, added_sugar, vitamin_a, vitamin_b1, vitamin_b2, vitamin_c, vitamin_e,
 sodium, potassium, calcium, iron, zinc, is_hard_to_weigh, gross_net_ratio, data_source)
VALUES
(%(name)s, %(alias)s, %(barcode)s, %(category)s, %(unit)s, %(calories)s, %(protein)s, %(carbohydrate)s, %(fat)s,
 %(dietary_fiber)s, %(added_sugar)s, %(vitamin_a)s, %(vitamin_b1)s, %(vitamin_b2)s, %(vitamin_c)s, %(vitamin_e)s,
 %(sodium)s, %(potassium)s, %(calcium)s, %(iron)s, %(zinc)s, %(is_hard_to_weigh)s, %(gross_net_ratio)s, %(data_source)s)
"""


def to_float(v):
    if v is None or v == "" or str(v).lower() in ("nan", "null", "none"):
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def to_bool(v):
    if v is None or v == "":
        return False
    return str(v).strip().lower() in ("1", "true", "yes", "y", "t")


def build_cfct_row(row: dict) -> dict:
    return {
        "name": row.get("name"),
        "alias": row.get("alias") or None,
        "barcode": None,
        "category": row.get("category") or None,
        "unit": "g",
        "calories": to_float(row.get("calories")),
        "protein": to_float(row.get("protein")),
        "carbohydrate": to_float(row.get("carbohydrate")),
        "fat": to_float(row.get("fat")),
        "dietary_fiber": to_float(row.get("dietary_fiber")),
        "added_sugar": to_float(row.get("added_sugar")),
        "vitamin_a": to_float(row.get("vitamin_a")),
        "vitamin_b1": to_float(row.get("vitamin_b1")),
        "vitamin_b2": to_float(row.get("vitamin_b2")),
        "vitamin_c": to_float(row.get("vitamin_c")),
        "vitamin_e": to_float(row.get("vitamin_e")),
        "sodium": to_float(row.get("sodium")),
        "potassium": to_float(row.get("potassium")),
        "calcium": to_float(row.get("calcium")),
        "iron": to_float(row.get("iron")),
        "zinc": to_float(row.get("zinc")),
        "is_hard_to_weigh": to_bool(row.get("is_hard_to_weigh")),
        "gross_net_ratio": to_float(row.get("gross_net_ratio")),
        "data_source": "cfct",
    }


def build_off_row(row: dict) -> dict:
    # OFF 的 sodium_100g 单位是 g，需要 × 1000 转换为 mg
    sodium_g = to_float(row.get("sodium_100g"))
    return {
        "name": row.get("product_name") or row.get("product_name_zh") or row.get("generic_name"),
        "alias": row.get("brands") or None,
        "barcode": row.get("code"),
        "category": (row.get("categories_tags") or "").split(",")[0] or None,
        "unit": "g",
        "calories": to_float(row.get("energy-kcal_100g")),
        "protein": to_float(row.get("proteins_100g")),
        "carbohydrate": to_float(row.get("carbohydrates_100g")),
        "fat": to_float(row.get("fat_100g")),
        "dietary_fiber": to_float(row.get("fiber_100g")),
        "added_sugar": to_float(row.get("added-sugars_100g")),
        "vitamin_a": None,
        "vitamin_b1": None,
        "vitamin_b2": None,
        "vitamin_c": to_float(row.get("vitamin-c_100g")),
        "vitamin_e": None,
        "sodium": None if sodium_g is None else sodium_g * 1000,
        "potassium": None,
        "calcium": to_float(row.get("calcium_100g")),
        "iron": to_float(row.get("iron_100g")),
        "zinc": None,
        "is_hard_to_weigh": False,
        "gross_net_ratio": None,
        "data_source": "off",
    }


def read_csv(path: Path) -> Iterable[dict]:
    with path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            yield row


def import_file(conn, path: Path, builder, batch_size: int = 500) -> int:
    count = 0
    buffer = []
    with conn.cursor() as cur:
        for row in read_csv(path):
            record = builder(row)
            if not record.get("name"):
                continue
            buffer.append(record)
            if len(buffer) >= batch_size:
                cur.executemany(INSERT_SQL, buffer)
                count += len(buffer)
                buffer.clear()
                log.info("imported %d rows from %s", count, path)
        if buffer:
            cur.executemany(INSERT_SQL, buffer)
            count += len(buffer)
    conn.commit()
    return count


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--db-url", required=True, help="postgresql://user:pwd@host:port/db")
    parser.add_argument("--cfct", type=Path, help="中国食物成分表 CSV path")
    parser.add_argument("--off",  type=Path, help="Open Food Facts CN subset CSV path")
    args = parser.parse_args()

    with psycopg.connect(args.db_url) as conn:
        if args.cfct:
            log.info("importing CFCT dataset from %s", args.cfct)
            c = import_file(conn, args.cfct, build_cfct_row)
            log.info("CFCT done: %d rows", c)
        if args.off:
            log.info("importing OFF dataset from %s", args.off)
            c = import_file(conn, args.off, build_off_row)
            log.info("OFF done: %d rows", c)


if __name__ == "__main__":
    main()
