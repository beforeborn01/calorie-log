import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Input, InputNumber, List, Modal, Space, Tag, Typography, message } from 'antd';
import { ArrowLeftOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { searchFood } from '../../api/food';
import { createRecord } from '../../api/record';
import type { Food, MealType } from '../../types';

const MEAL_LABELS: Record<number, string> = { 1: '早餐', 2: '午餐', 3: '晚餐', 4: '加餐' };

export default function AddFoodPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const date = params.get('date')!;
  const mealType = Number(params.get('meal') ?? 1) as MealType;

  const [keyword, setKeyword] = useState('');
  const [list, setList] = useState<Food[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Food | null>(null);
  const [quantity, setQuantity] = useState<number | null>(100);
  const [isGross, setIsGross] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  const doSearch = async () => {
    if (!keyword.trim()) return;
    setLoading(true);
    try {
      const resp = await searchFood(keyword.trim());
      setList(resp.list || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    doSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const computed = useMemo(() => {
    if (!selected || !quantity) return null;
    const q = Number(quantity);
    const scale = q / 100;
    return {
      calories: Number(selected.calories || 0) * scale,
      protein: Number(selected.protein || 0) * scale,
      carb: Number(selected.carbohydrate || 0) * scale,
      fat: Number(selected.fat || 0) * scale,
    };
  }, [selected, quantity]);

  const handleConfirm = async () => {
    if (!selected || !quantity) return;
    await createRecord({
      recordDate: date,
      mealType,
      foodId: selected.id,
      quantity: isGross ? undefined : quantity,
      grossQuantity: isGross ? quantity : undefined,
      addMethod: 1,
    });
    message.success('已添加');
    navigate(-1);
  };

  const handleManualSubmit = async (values: {
    foodName: string;
    quantity: number;
    calories: number;
    protein?: number;
    carbohydrate?: number;
    fat?: number;
  }) => {
    await createRecord({
      recordDate: date,
      mealType,
      foodName: values.foodName,
      quantity: values.quantity,
      calories: values.calories,
      protein: values.protein,
      carbohydrate: values.carbohydrate,
      fat: values.fat,
      addMethod: 2,
    });
    setManualOpen(false);
    message.success('已添加');
    navigate(-1);
  };

  return (
    <div style={{ padding: 24, maxWidth: 820, margin: '0 auto' }}>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
          返回
        </Button>
        <Tag color="blue">
          {date} · {MEAL_LABELS[mealType]}
        </Tag>
      </Space>
      <Card>
        <Input.Search
          placeholder="搜索食物，例如“土豆”“鸡胸肉”"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onSearch={doSearch}
          enterButton={<SearchOutlined />}
          allowClear
        />
        <List
          style={{ marginTop: 12 }}
          loading={loading}
          dataSource={list}
          locale={{ emptyText: '未找到，可手动添加' }}
          renderItem={(f) => (
            <List.Item
              actions={[
                <Button type="link" onClick={() => setSelected(f)}>
                  选择
                </Button>,
              ]}
            >
              <List.Item.Meta
                title={
                  <span>
                    {f.name}
                    {f.isHardToWeigh && <Tag color="gold" style={{ marginLeft: 8 }}>难称重</Tag>}
                  </span>
                }
                description={
                  <span>
                    每100g {Number(f.calories).toFixed(0)} kcal · 蛋白{Number(f.protein || 0).toFixed(1)}g ·
                    碳水{Number(f.carbohydrate || 0).toFixed(1)}g · 脂肪{Number(f.fat || 0).toFixed(1)}g
                  </span>
                }
              />
            </List.Item>
          )}
        />
        <div style={{ marginTop: 12, textAlign: 'center' }}>
          <Button type="dashed" onClick={() => setManualOpen(true)}>
            没有找到？手动添加
          </Button>
        </div>
      </Card>

      <Modal
        open={!!selected}
        title={selected?.name}
        onCancel={() => setSelected(null)}
        onOk={handleConfirm}
        okText="添加"
      >
        {selected && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <Typography.Text type="secondary">每 100g: {Number(selected.calories).toFixed(0)} kcal</Typography.Text>
            </div>
            <div style={{ marginBottom: 8 }}>
              {selected.isHardToWeigh && (
                <Button
                  size="small"
                  type={isGross ? 'primary' : 'default'}
                  onClick={() => setIsGross(!isGross)}
                  style={{ marginRight: 8 }}
                >
                  {isGross ? '按毛重输入' : '按净重输入'}
                </Button>
              )}
              <InputNumber
                value={quantity}
                onChange={(v) => setQuantity(v)}
                addonAfter="g"
                min={1}
                max={5000}
              />
            </div>
            {computed && (
              <div style={{ background: '#fafafa', padding: 12, borderRadius: 6 }}>
                <div>热量: {computed.calories.toFixed(0)} kcal</div>
                <div>
                  蛋白: {computed.protein.toFixed(1)}g · 碳水: {computed.carb.toFixed(1)}g · 脂肪: {computed.fat.toFixed(1)}g
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal open={manualOpen} onCancel={() => setManualOpen(false)} title="手动添加" footer={null}>
        <ManualForm onSubmit={handleManualSubmit} />
      </Modal>
    </div>
  );
}

function ManualForm({
  onSubmit,
}: {
  onSubmit: (v: {
    foodName: string;
    quantity: number;
    calories: number;
    protein?: number;
    carbohydrate?: number;
    fat?: number;
  }) => Promise<void>;
}) {
  const [foodName, setFoodName] = useState('');
  const [quantity, setQuantity] = useState<number>(100);
  const [calories, setCalories] = useState<number>(0);
  const [protein, setProtein] = useState<number>(0);
  const [carb, setCarb] = useState<number>(0);
  const [fat, setFat] = useState<number>(0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Input placeholder="食物名称" value={foodName} onChange={(e) => setFoodName(e.target.value)} />
      <InputNumber addonBefore="分量" addonAfter="g" value={quantity} onChange={(v) => setQuantity(v || 0)} />
      <InputNumber addonBefore="热量" addonAfter="kcal" value={calories} onChange={(v) => setCalories(v || 0)} />
      <InputNumber addonBefore="蛋白质" addonAfter="g" value={protein} onChange={(v) => setProtein(v || 0)} />
      <InputNumber addonBefore="碳水" addonAfter="g" value={carb} onChange={(v) => setCarb(v || 0)} />
      <InputNumber addonBefore="脂肪" addonAfter="g" value={fat} onChange={(v) => setFat(v || 0)} />
      <Button
        type="primary"
        onClick={() => {
          if (!foodName || !quantity || !calories) return;
          onSubmit({ foodName, quantity, calories, protein, carbohydrate: carb, fat });
        }}
      >
        确认
      </Button>
    </div>
  );
}
