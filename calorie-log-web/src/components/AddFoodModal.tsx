import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Checkbox,
  Input,
  InputNumber,
  List,
  Modal,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { createCustomFood, searchFood } from '../api/food';
import { createRecord } from '../api/record';
import { emitFoodAdded, useAddFoodStore } from '../store/addFood';
import type { Food } from '../types';

const MEAL_LABELS: Record<number, string> = { 1: '早餐', 2: '午餐', 3: '晚餐', 4: '加餐' };

export default function AddFoodModal() {
  const open = useAddFoodStore((s) => s.open);
  const date = useAddFoodStore((s) => s.date);
  const mealType = useAddFoodStore((s) => s.mealType);
  const closeModal = useAddFoodStore((s) => s.closeModal);

  const [keyword, setKeyword] = useState('');
  const [list, setList] = useState<Food[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Food | null>(null);
  const [quantity, setQuantity] = useState<number | null>(100);
  const [isGross, setIsGross] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      setKeyword('');
      setList([]);
      setSelected(null);
      setQuantity(100);
      setIsGross(false);
      setManualOpen(false);
    }
  }, [open]);

  const doSearch = async (kw?: string) => {
    const q = (kw ?? keyword).trim();
    if (!q) return;
    setLoading(true);
    try {
      const resp = await searchFood(q);
      setList(resp.list || []);
    } finally {
      setLoading(false);
    }
  };

  const computed = useMemo(() => {
    if (!selected || !quantity) return null;
    const scale = Number(quantity) / 100;
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
    emitFoodAdded(date);
    setSelected(null);
    closeModal();
  };

  const handleManualSubmit = async (values: ManualValues) => {
    const food = await createCustomFood({
      name: values.foodName,
      alias: values.alias || undefined,
      category: values.category || undefined,
      calories: values.caloriesPer100g,
      protein: values.proteinPer100g,
      carbohydrate: values.carbPer100g,
      fat: values.fatPer100g,
      isHardToWeigh: values.isHardToWeigh,
    });

    if (values.logQuantity && values.logQuantity > 0) {
      await createRecord({
        recordDate: date,
        mealType,
        foodId: food.id,
        quantity: values.logQuantity,
        addMethod: 2,
      });
      message.success('已补录到食物库，并记录本次摄入');
      emitFoodAdded(date);
      setManualOpen(false);
      closeModal();
    } else {
      message.success('已补录到食物库，可直接搜索使用');
      setManualOpen(false);
      setKeyword(food.name);
      await doSearch(food.name);
    }
  };

  return (
    <>
      <Modal
        open={open}
        title={
          <Space wrap>
            <span>添加食物</span>
            {date && <Tag color="blue">{date} · {MEAL_LABELS[mealType]}</Tag>}
          </Space>
        }
        onCancel={closeModal}
        footer={null}
        width={560}
        destroyOnHidden
      >
        <Input.Search
          placeholder="搜索食物，例如“土豆”“鸡胸肉”"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onSearch={(v) => doSearch(v)}
          enterButton={<SearchOutlined />}
          allowClear
          autoFocus
        />
        <List
          style={{ marginTop: 12 }}
          loading={loading}
          dataSource={list}
          locale={{ emptyText: keyword ? '未找到，可手动添加' : '输入关键字搜索' }}
          renderItem={(f) => (
            <List.Item
              actions={[
                <Button key="pick" type="link" onClick={() => setSelected(f)}>
                  选择
                </Button>,
              ]}
            >
              <List.Item.Meta
                title={
                  <span>
                    {f.name}
                    {f.isHardToWeigh && <Tag style={{ marginLeft: 8 }}>难称重</Tag>}
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
            没找到？手动录入并补全到食物库
          </Button>
        </div>
      </Modal>

      <Modal
        open={!!selected}
        title={selected?.name}
        onCancel={() => setSelected(null)}
        onOk={handleConfirm}
        okText="添加"
        destroyOnHidden
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

      <Modal
        open={manualOpen}
        onCancel={() => setManualOpen(false)}
        title="手动录入食物"
        footer={null}
        destroyOnHidden
        width={520}
      >
        <ManualForm onSubmit={handleManualSubmit} />
      </Modal>
    </>
  );
}

interface ManualValues {
  foodName: string;
  alias?: string;
  category?: string;
  caloriesPer100g: number;
  proteinPer100g?: number;
  carbPer100g?: number;
  fatPer100g?: number;
  isHardToWeigh?: boolean;
  logQuantity?: number;
}

const CATEGORY_OPTIONS = [
  '谷薯主食',
  '肉禽蛋水产',
  '蔬菜',
  '水果',
  '豆类',
  '奶及奶制品',
  '坚果',
  '油脂调味',
  '零食饮料',
  '其他',
].map((c) => ({ label: c, value: c }));

function ManualForm({ onSubmit }: { onSubmit: (v: ManualValues) => Promise<void> }) {
  const [foodName, setFoodName] = useState('');
  const [alias, setAlias] = useState('');
  const [category, setCategory] = useState<string | undefined>();
  const [caloriesPer100g, setCaloriesPer100g] = useState<number | null>(null);
  const [proteinPer100g, setProteinPer100g] = useState<number | null>(null);
  const [carbPer100g, setCarbPer100g] = useState<number | null>(null);
  const [fatPer100g, setFatPer100g] = useState<number | null>(null);
  const [isHardToWeigh, setIsHardToWeigh] = useState(false);
  const [logQuantity, setLogQuantity] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!foodName.trim()) {
      message.error('请填写食物名称');
      return;
    }
    if (!caloriesPer100g || caloriesPer100g <= 0) {
      message.error('请填写每 100g 的热量');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        foodName: foodName.trim(),
        alias: alias.trim(),
        category,
        caloriesPer100g,
        proteinPer100g: proteinPer100g ?? undefined,
        carbPer100g: carbPer100g ?? undefined,
        fatPer100g: fatPer100g ?? undefined,
        isHardToWeigh,
        logQuantity: logQuantity ?? undefined,
      });
    } catch (e: any) {
      message.error(e?.message || '补录失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        补录后会进入你的食物库，下次搜索可直接复用。
      </Typography.Text>
      <Input
        placeholder="食物名称（必填，如“蒸紫薯”）"
        value={foodName}
        onChange={(e) => setFoodName(e.target.value)}
      />
      <Input
        placeholder="别名（选填，空格分隔，搜索时可命中）"
        value={alias}
        onChange={(e) => setAlias(e.target.value)}
      />
      <Select
        placeholder="分类（选填）"
        value={category}
        onChange={setCategory}
        options={CATEGORY_OPTIONS}
        allowClear
      />

      <Typography.Text strong style={{ marginTop: 4 }}>
        每 100g 的营养成分
      </Typography.Text>
      <InputNumber
        addonBefore="热量"
        addonAfter="kcal"
        value={caloriesPer100g}
        onChange={setCaloriesPer100g}
        min={0}
        max={9000}
        style={{ width: '100%' }}
      />
      <InputNumber
        addonBefore="蛋白质"
        addonAfter="g"
        value={proteinPer100g}
        onChange={setProteinPer100g}
        min={0}
        max={100}
        style={{ width: '100%' }}
      />
      <InputNumber
        addonBefore="碳水"
        addonAfter="g"
        value={carbPer100g}
        onChange={setCarbPer100g}
        min={0}
        max={100}
        style={{ width: '100%' }}
      />
      <InputNumber
        addonBefore="脂肪"
        addonAfter="g"
        value={fatPer100g}
        onChange={setFatPer100g}
        min={0}
        max={100}
        style={{ width: '100%' }}
      />
      <Checkbox checked={isHardToWeigh} onChange={(e) => setIsHardToWeigh(e.target.checked)}>
        难称重（如带骨/带壳，录入时可按毛重换算）
      </Checkbox>

      <Typography.Text strong style={{ marginTop: 4 }}>
        本次摄入（可选）
      </Typography.Text>
      <InputNumber
        addonBefore="分量"
        addonAfter="g"
        value={logQuantity}
        onChange={setLogQuantity}
        min={0}
        max={5000}
        placeholder="留空则仅补录到食物库"
        style={{ width: '100%' }}
      />

      <Button type="primary" onClick={submit} loading={submitting} style={{ marginTop: 4 }}>
        {logQuantity && logQuantity > 0 ? '补录并记录本次摄入' : '补录到食物库'}
      </Button>
    </div>
  );
}
