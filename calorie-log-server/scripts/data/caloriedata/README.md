# caloriedata.org 抓取产物

由 `scripts/scrape_caloriedata.py` 生成。源站点 https://caloriedata.org（sitemap 中共 529 个 `/calories-in/<slug>` 页面）。

## 文件清单

| 文件 | 用途 |
| --- | --- |
| `raw/<slug>.json` | 单页原始解析结果，保留面包屑、所有营养行、餐量列表、FAQ 8 问。重抓时可作为缓存。 |
| `foods.ndjson` | 归一化后的全字段记录，一行一个 JSON。后续二次加工首选。 |
| `foods.csv` | 同上，CSV 版（仅顶层标量字段，无 FAQ/breadcrumb 嵌套）。Excel/分析工具可直接读取。 |
| `seed_foods_caloriedata.sql` | 可直接 `psql -f` 导入 `t_food` 的 INSERT 脚本，`data_source='caloriedata'`。 |

## 字段覆盖率

最新一次抓取（529 条）：

| 字段 | 覆盖率 |
| --- | --- |
| calories / protein / total_fat / total_carb / dietary_fiber / sugars / sodium | 100% |
| cholesterol | 93.2%（来自 FAQ 自由文本，部分页面不提） |
| 维生素、钾、钙、铁、锌 | 0%（站点未提供） |

## 字段 → t_food 映射

```
name              ← 面包屑 position 3 名称（英文 Title Case，可能含商品商标，原样保留）
category          ← 面包屑 position 2 名称，按 EN_TO_CN_CATEGORY 映射到中文类目（兜底保留英文）
calories          ← 1) header text-4xl  2) "X contains Y calories per 100"  3) FAQ  4) 餐量 100g
protein           ← 营养行 "Protein" (g)
carbohydrate      ← 营养行 "Total Carbohydrate" / "Carbs" (g)
fat               ← 营养行 "Total Fat" / "Fat" (g)
dietary_fiber     ← 营养行 "Dietary Fiber" (g)
added_sugar       ← 营养行 "Sugars" (g)；注意非严格的 added sugar，是 total sugars 的近似
sodium            ← 营养行 "Sodium" (mg)
data_source       = 'caloriedata'
其余字段          = NULL
```

## 已知坑

- **0.0 易被吞**：解析时不能用 `lookup(...) or fallback`，因为 Python 把 0.0 视为 falsy；改用 `is not None` 判断。
- **calories 来源四级 fallback**：标题数字 → JSX 散片 prose → FAQ 文本 → 100g 餐量行；任意一项命中即可。
- **品牌商品名**：原始 name 字段保留商品全称（如 "2% REDUCED FAT LACTOSE FREE ULTRA-FILTERED MILK"）。导入数据库前可考虑做一次清洗去掉商品规格。
- **重复名称去重**：SQL 生成阶段按小写 name 去重，因此 ndjson 比 SQL 多几条记录是正常的。

## 重新抓取

```bash
pip install httpx
python scripts/scrape_caloriedata.py            # 全量
python scripts/scrape_caloriedata.py --limit 10 # 试跑
python scripts/scrape_caloriedata.py --resume   # 复用 raw/<slug>.json，跳过已抓页
```

## 导入数据库

```bash
psql "$DATABASE_URL" -f scripts/data/caloriedata/seed_foods_caloriedata.sql
```

需要先确保 V1 schema 已经跑过（即 `t_food` 表已存在）。
