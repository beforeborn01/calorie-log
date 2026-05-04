# Sanotsu/china-food-composition-data 抓取产物

由 `scripts/scrape_sanotsu.py` 生成。源仓库 https://github.com/Sanotsu/china-food-composition-data
（《中国食物成分表标准版（第 6 版）》JSON 化，CDC 营养与健康所原始数据）。

## 文件清单

| 文件 | 用途 |
| --- | --- |
| `raw/<merged-X-Y>.json` × 75 | GitHub 上原始 JSON 缓存。`--resume` 时跳过下载。 |
| `foods.ndjson` | 1622 条全字段记录（含 OCR 错乱条），保留 raw + extra（磷/镁/硒/铜/锰/烟酸/胡萝卜素 等扩展字段）。 |
| `foods.csv` | 同上的 CSV 版（仅顶层标量，便于 Excel 查阅）。 |
| `seed_foods_cfct.sql` | 已通过合理性 gate 的 1540 条 INSERT 脚本，可直接 `psql -f` 入库。 |

## 数据处理流水

源数据 1814 条
↓ 排除婴幼儿食品 192 条（默认；用 `--include-baby` 可保留）
1622 条进入解析
↓ 在 SQL 阶段过滤
  - 物理不可能（任何宏量营养 > 100 g/100g、calories > 950）
  - 4-4-9 公式偏差 > 60% 且差距 > 80 kcal（OCR 字段错位）
  - 名字 ≤ 1 字（OCR 截断）
  共 62 条
↓ 同名去重
  20 条
1540 条最终落库

## 字段覆盖率（SQL 中 1540 条）

| 字段 | 覆盖率 |
| --- | --- |
| gross_net_ratio | 99.4% |
| calories | 97.8% |
| protein / carbohydrate | 93.1% |
| calcium | 93.3% |
| iron | 92.8% |
| fat | 90.8% |
| potassium | 89.2% |
| vitamin_b1 | 86.2% |
| sodium | 83.4% |
| zinc | 84.0% |
| dietary_fiber | 83.7% |
| vitamin_c / vitamin_e | 73.8% |
| vitamin_a | 70.6% |

## 字段映射（CFCT → t_food）

```
foodName        → name（统一括号到半角，去多余空格）
edible          → gross_net_ratio = edible / 100
                  is_hard_to_weigh = (edible < 100)
energyKCal      → calories
protein         → protein
fat             → fat
CHO             → carbohydrate
dietaryFiber    → dietary_fiber
vitaminA        → vitamin_a   (μg)
thiamin         → vitamin_b1  (mg)
riboflavin      → vitamin_b2  (mg)
vitaminC        → vitamin_c   (mg)
vitaminETotal   → vitamin_e   (mg)
Na              → sodium      (mg)
K               → potassium   (mg)
Ca              → calcium     (mg)
Fe              → iron        (mg)
Zn              → zinc        (mg)
data_source     = 'cfct'
```

未入库但保留在 ndjson `extra` 里的字段（schema 扩展时直接回灌）：
- water、ash、cholesterol、carotene、retinol、niacin
- vitaminE1/E2/E3（α/(β+γ)/δ 三种异构体）
- phosphorus、magnesium、selenium、copper、manganese
- energyKJ、remark

## 类目映射

```
谷类、薯类淀粉             → 主食
畜肉、禽肉                → 肉类
鱼虾蟹贝                  → 水产
蔬菜                      → 蔬菜
菌藻                      → 菌藻
水果                      → 水果
坚果种子                  → 坚果
动物油脂                  → 油脂
乳类、蛋类、干豆类         → 蛋奶豆
其他类                    → 其他
婴幼儿食品                → 默认排除（192 条）
```

## 已知坑

- **License = NONE**：原始版权属于《中国食物成分表》出版方。自用/学术使用一般无问题；正式商业上线前请评估，可走 nutritionsciences.org.cn 的合作渠道。
- **OCR 噪声**：源数据是表格截图 + Vision LLM 转 JSON，部分字段会有错位（如「酸奶 P=295」）。已通过 `is_record_sane` 过滤，剩余 18 条 4-4-9 偏差 40%-60% 多为正常舍入差。
- **`Tr` (微量) 折成 `0.0`**：表里写「Tr」（trace）表示痕量，按照营养计算惯例算 0。
- **同名条目可能存在不同 foodCode**：CFCT 把「酸奶」按厂商分了多条，SQL 里只保留首条；完整版本在 ndjson 里。

## 重新抓取

```bash
pip install httpx
python scripts/scrape_sanotsu.py                # 全量
python scripts/scrape_sanotsu.py --resume       # 复用 raw/，不再访问 GitHub
python scripts/scrape_sanotsu.py --include-baby # 包含婴幼儿食品（增加 192 条）
```

## 导入数据库

```bash
# 推荐先清掉 V4 seed 的 47 条避免重名（V4 是手工录入的小集合）
psql "$DATABASE_URL" -c "DELETE FROM t_food WHERE data_source='cfct';"
psql "$DATABASE_URL" -f scripts/data/sanotsu/seed_foods_cfct.sql
```

如果想保留 V4 的 47 条作为「校准基线」，跳过 DELETE 也行——会得到约 1587 条 cfct 数据，部分名字会有重复行。
