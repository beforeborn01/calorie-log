import { useEffect, useMemo, useState } from 'react';
import { Button, Card, DatePicker, Modal, Progress, Space, Tag, Typography, message } from 'antd';
import { CrownOutlined, DeleteOutlined, EditOutlined, LeftOutlined, PlusOutlined, RightOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { deleteRecord, getDailyRecords, updateRecord } from '../../api/record';
import { getExperience, type Experience } from '../../api/social';
import { FOOD_ADDED_EVENT, useAddFoodStore } from '../../store/addFood';
import type { DailyRecords, DietRecord } from '../../types';

const MEAL_LABELS: Record<number, string> = { 1: '早餐', 2: '午餐', 3: '晚餐', 4: '加餐' };

export default function HomePage() {
  const openAddFood = useAddFoodStore((s) => s.openModal);
  const [date, setDate] = useState<Dayjs>(dayjs());
  const [daily, setDaily] = useState<DailyRecords | null>(null);
  const [loading, setLoading] = useState(false);
  const [experience, setExperience] = useState<Experience | null>(null);

  const dateStr = date.format('YYYY-MM-DD');

  useEffect(() => {
    getExperience().then(setExperience).catch(() => undefined);
  }, [dateStr]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getDailyRecords(dateStr)
      .then((d) => {
        if (!cancelled) setDaily(d);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [dateStr]);

  useEffect(() => {
    const onAdded = (e: Event) => {
      const detail = (e as CustomEvent<{ date: string }>).detail;
      if (detail?.date !== dateStr) return;
      getDailyRecords(dateStr).then(setDaily).catch(() => undefined);
      getExperience().then(setExperience).catch(() => undefined);
    };
    window.addEventListener(FOOD_ADDED_EVENT, onAdded);
    return () => window.removeEventListener(FOOD_ADDED_EVENT, onAdded);
  }, [dateStr]);

  const caloriesPct = useMemo(() => {
    if (!daily || !daily.targetCalories) return 0;
    return Math.min(100, Math.round((daily.totalCalories / daily.targetCalories) * 100));
  }, [daily]);

  const handleDelete = (record: DietRecord) => {
    Modal.confirm({
      title: '确认删除该条记录？',
      content: `${MEAL_LABELS[record.mealType]} · ${record.foodName}`,
      okType: 'danger',
      onOk: async () => {
        await deleteRecord(record.id);
        message.success('已删除');
        const d = await getDailyRecords(dateStr);
        setDaily(d);
      },
    });
  };

  const handleEdit = async (record: DietRecord) => {
    let val = record.quantity;
    Modal.confirm({
      title: `编辑 ${record.foodName}`,
      content: (
        <div>
          <div style={{ marginBottom: 8 }}>分量（g）:</div>
          <input
            type="number"
            defaultValue={record.quantity}
            style={{ width: '100%', padding: 6 }}
            onChange={(e) => {
              val = Number(e.target.value);
            }}
          />
        </div>
      ),
      onOk: async () => {
        if (!val || val <= 0) {
          message.error('分量必须大于 0');
          return Promise.reject();
        }
        await updateRecord(record.id, { quantity: val });
        message.success('已保存');
        const d = await getDailyRecords(dateStr);
        setDaily(d);
      },
    });
  };

  const renderMeal = (list: DietRecord[] | undefined, type: 1 | 2 | 3 | 4) => (
    <Card
      size="small"
      title={MEAL_LABELS[type]}
      extra={
        <Button type="link" icon={<PlusOutlined />} onClick={() => openAddFood(dateStr, type)}>
          添加
        </Button>
      }
      style={{ marginBottom: 12 }}
    >
      {(list ?? []).length === 0 && <Typography.Text type="secondary">暂无记录</Typography.Text>}
      {(list ?? []).map((r) => (
        <div
          key={r.id}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}
        >
          <div>
            <Typography.Text strong>{r.foodName}</Typography.Text>
            <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
              {Number(r.quantity).toFixed(0)} g · {Number(r.calories).toFixed(0)} kcal
            </Typography.Text>
          </div>
          <Space>
            <Button
              size="small"
              aria-label={`编辑 ${r.foodName}`}
              title="编辑"
              icon={<EditOutlined />}
              onClick={() => handleEdit(r)}
            />
            <Button
              size="small"
              danger
              aria-label={`删除 ${r.foodName}`}
              title="删除"
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(r)}
            />
          </Space>
        </div>
      ))}
    </Card>
  );

  return (
    <div className="page-container" style={{ maxWidth: 820 }}>
      <div className="page-toolbar">
        <Space>
          <Button
            aria-label="前一天"
            title="前一天"
            icon={<LeftOutlined />}
            onClick={() => setDate(date.subtract(1, 'day'))}
          />
          <DatePicker value={date} onChange={(d) => d && setDate(d)} />
          <Button
            aria-label="后一天"
            title="后一天"
            icon={<RightOutlined />}
            onClick={() => setDate(date.add(1, 'day'))}
          />
        </Space>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => openAddFood(dateStr, 1)}
        >
          添加食物<span className="hide-on-mobile">（Ctrl/⌘ + K）</span>
        </Button>
      </div>

      {experience && (
        <Card size="small" style={{ marginBottom: 16 }}>
          <Space size="large" wrap>
            <Typography.Text strong>
              <CrownOutlined /> Lv{experience.level}
            </Typography.Text>
            <Typography.Text type="secondary">
              {experience.totalExp} / {experience.nextLevelExp} exp（距下一级 {experience.expToNextLevel}）
            </Typography.Text>
            <Tag color="blue">连续记录 {experience.continuousDays} 天</Tag>
          </Space>
          <Progress
            percent={Math.round(Number(experience.levelProgress) * 100)}
            showInfo={false}
            style={{ marginTop: 8 }}
          />
        </Card>
      )}

      <Card loading={loading} style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Progress
            type="circle"
            percent={caloriesPct}
            format={() =>
              daily ? `${Number(daily.totalCalories).toFixed(0)}/${Number(daily.targetCalories).toFixed(0)}` : '-'
            }
          />
          <div style={{ flex: 1 }}>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 4 }}>
              热量 (kcal)
            </Typography.Paragraph>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <MacroStat label="蛋白质" value={daily?.totalProtein} unit="g" />
              <MacroStat label="碳水" value={daily?.totalCarb} unit="g" />
              <MacroStat label="脂肪" value={daily?.totalFat} unit="g" />
            </div>
          </div>
        </div>
      </Card>

      {renderMeal(daily?.breakfast, 1)}
      {renderMeal(daily?.lunch, 2)}
      {renderMeal(daily?.dinner, 3)}
      {renderMeal(daily?.snacks, 4)}
    </div>
  );
}

function MacroStat({ label, value, unit }: { label: string; value?: number; unit: string }) {
  return (
    <div>
      <Typography.Text type="secondary" style={{ fontSize: 12, letterSpacing: '-0.01em' }}>
        {label}
      </Typography.Text>
      <div style={{ color: '#1d1d1f', fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em' }}>
        {value != null ? Number(value).toFixed(1) : '-'}{' '}
        <span style={{ color: 'rgba(0,0,0,0.48)', fontSize: 13, fontWeight: 400 }}>{unit}</span>
      </div>
    </div>
  );
}
