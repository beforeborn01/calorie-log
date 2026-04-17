# 食物数据导入脚本

## 概览
- `V4__seed_foods_basic.sql`（已自动 Flyway 执行）：开箱即可用的 ~50 条高频食物
- `import_foods.py`：完整数据集批量导入（需手动准备 CSV）

## 完整数据准备步骤

### 1. 中国食物成分表
在 GitHub 搜索关键词 `中国食物成分表 dataset`，常见资源：
- `hansinsun/chinese-food-nutrition`
- `kk289/CNF-food-composition-table`

下载后整理为 `data/cfct.csv`，需包含字段（英文列名）：

```
name,alias,category,calories,protein,carbohydrate,fat,dietary_fiber,added_sugar,
vitamin_a,vitamin_b1,vitamin_b2,vitamin_c,vitamin_e,
sodium,potassium,calcium,iron,zinc,is_hard_to_weigh,gross_net_ratio
```

说明：所有数值按每 100g 净重计；无数据的字段留空（**不要伪造**）。

### 2. Open Food Facts 中文子集
访问 https://world.openfoodfacts.org/data 下载全量 TSV，使用以下命令筛选中文商品：

```bash
xsvk filter -i 'countries_tags' -p 'cn' openfoodfacts.tsv > data/off_cn.tsv
# 或者用 Python pandas:
#   df = pd.read_csv('openfoodfacts.tsv', sep='\t', low_memory=False)
#   df = df[df['countries_tags'].str.contains('cn', na=False)]
#   df.to_csv('data/off_cn.csv', index=False)
```

### 3. 运行导入

```bash
pip install 'psycopg[binary]' pandas
python scripts/import_foods.py \
  --db-url postgresql://postgres:postgres@localhost:5432/calorie_log_db \
  --cfct data/cfct.csv \
  --off  data/off_cn.csv
```

### 4. 验证

```sql
SELECT name, calories, protein FROM t_food WHERE name LIKE '%土豆%' LIMIT 10;
SELECT count(*), data_source FROM t_food GROUP BY data_source;
```

## 难称重食物预设比例

| 食物 | 净毛重比例 |
|------|-----------|
| 玉米 | 0.46 |
| 红薯/紫薯 | 0.87 |
| 土豆 | 0.94 |
| 苹果 | 0.85 |
| 香蕉 | 0.65 |
| 橙子 | 0.70 |
| 西瓜 | 0.56 |
| 基围虾 | 0.55 |
| 鲫鱼 | 0.54 |
| 鲈鱼 | 0.58 |
| 鸡蛋 | 0.87 |
| 核桃仁 | 0.43 |

已内置于 `V4__seed_foods_basic.sql`。
