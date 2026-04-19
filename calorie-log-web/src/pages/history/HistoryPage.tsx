import { useEffect, useMemo, useState } from 'react';
import { DatePicker, Table, message } from 'antd';
import { DownloadOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { getDailyRecords } from '../../api/record';
import apiClient from '../../api/client';
import { FOOD_ADDED_EVENT, useAddFoodStore } from '../../store/addFood';
import type { DietRecord } from '../../types';
import { Chip, PaperCard, SketchButton } from '../../components/sketch';

const MEAL_LABEL: Record<number, string> = { 1: '早餐', 2: '午餐', 3: '晚餐', 4: '加餐' };

interface Row extends DietRecord {
  key: string;
}

function Stat({ label, value, suffix }: { label: string; value: React.ReactNode; suffix?: string }) {
  return (
    <div>
      <div className="hand ink-soft" style={{ fontSize: 12 }}>{label}</div>
      <div style={{ marginTop: 2 }}>
        <span className="mono" style={{ fontSize: 26, fontWeight: 500 }}>{value}</span>
        {suffix && <span className="hand ink-soft" style={{ fontSize: 13, marginLeft: 4 }}>{suffix}</span>}
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const openAddFood = useAddFoodStore((s) => s.openModal);
  const [range, setRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(6, 'day'), dayjs()]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const [from, to] = range;
    const days: string[] = [];
    for (let d = from; d.isBefore(to) || d.isSame(to, 'day'); d = d.add(1, 'day')) {
      days.push(d.format('YYYY-MM-DD'));
    }
    Promise.all(days.map((d) => getDailyRecords(d).catch(() => null)))
      .then((dailies) => {
        if (cancelled) return;
        const list: Row[] = [];
        dailies.forEach((d, idx) => {
          if (!d) return;
          for (const r of [...(d.breakfast ?? []), ...(d.lunch ?? []), ...(d.dinner ?? []), ...(d.snacks ?? [])]) {
            list.push({ ...r, recordDate: days[idx], key: `${days[idx]}-${r.id}` });
          }
        });
        setRows(list);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  const reload = () => setRange([range[0], range[1]]);

  useEffect(() => {
    const onAdded = (e: Event) => {
      const detail = (e as CustomEvent<{ date: string }>).detail;
      if (!detail?.date) return;
      const d = dayjs(detail.date);
      if (d.isBefore(range[0], 'day') || d.isAfter(range[1], 'day')) return;
      reload();
    };
    window.addEventListener(FOOD_ADDED_EVENT, onAdded);
    return () => window.removeEventListener(FOOD_ADDED_EVENT, onAdded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const stats = useMemo(() => {
    const total = rows.length;
    const days = new Set(rows.map((r) => r.recordDate)).size;
    const calories = rows.reduce((sum, r) => sum + Number(r.calories ?? 0), 0);
    return { total, days, calories };
  }, [rows]);

  const onExport = async () => {
    const from = range[0].format('YYYY-MM-DD');
    const to = range[1].format('YYYY-MM-DD');
    try {
      const resp = await apiClient.get('/export/records', {
        params: { startDate: from, endDate: to },
        responseType: 'blob',
        transformResponse: [(data) => data],
      });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(resp.data);
      link.download = `饮食记录_${from}_${to}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
      message.success('已导出');
    } catch (e: any) {
      message.error(e?.message || '导出失败');
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <div className="mono ink-soft" style={{ fontSize: 11, letterSpacing: 2 }}>HISTORY · 历史</div>
          <h1 className="display" style={{ fontSize: 36, margin: '4px 0 0' }}>
            <span className="scribble-u">饮食记录</span>
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <DatePicker.RangePicker
            value={range}
            onChange={(r) => r && r[0] && r[1] && setRange([r[0], r[1]])}
            allowClear={false}
          />
          <SketchButton size="sm" aria-label="刷新" title="刷新" onClick={reload}>
            <ReloadOutlined />
          </SketchButton>
          <SketchButton size="sm" onClick={onExport}>
            <DownloadOutlined style={{ marginRight: 4 }} />导出 CSV
          </SketchButton>
          <SketchButton primary onClick={() => openAddFood(dayjs().format('YYYY-MM-DD'), 1)}>
            <PlusOutlined style={{ marginRight: 4 }} />添加<span className="hide-on-mobile">（⌘ K）</span>
          </SketchButton>
        </div>
      </div>

      <PaperCard style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
          <Stat label="记录条数" value={stats.total} />
          <Stat label="覆盖天数" value={stats.days} />
          <Stat label="累计热量" value={stats.calories.toFixed(0)} suffix="kcal" />
        </div>
      </PaperCard>

      <PaperCard style={{ padding: 12 }}>
        <Table
          size="small"
          loading={loading}
          dataSource={rows}
          pagination={{ pageSize: 20, showSizeChanger: true }}
          scroll={{ x: 680 }}
          columns={[
            { title: '日期', dataIndex: 'recordDate', key: 'recordDate', width: 110, sorter: (a, b) => a.recordDate.localeCompare(b.recordDate) },
            {
              title: '餐次',
              dataIndex: 'mealType',
              key: 'mealType',
              width: 80,
              filters: Object.entries(MEAL_LABEL).map(([v, l]) => ({ text: l, value: Number(v) })),
              onFilter: (value, record) => record.mealType === value,
              render: (v: number) => <Chip color="var(--paper-2)">{MEAL_LABEL[v]}</Chip>,
            },
            { title: '食物', dataIndex: 'foodName', key: 'foodName' },
            {
              title: '分量',
              dataIndex: 'quantity',
              key: 'quantity',
              width: 80,
              render: (v: number) => <span className="mono">{Number(v).toFixed(0)} g</span>,
              sorter: (a, b) => Number(a.quantity ?? 0) - Number(b.quantity ?? 0),
            },
            {
              title: '热量',
              dataIndex: 'calories',
              key: 'calories',
              width: 100,
              render: (v: number) => <span className="mono">{Number(v).toFixed(0)} kcal</span>,
              sorter: (a, b) => Number(a.calories ?? 0) - Number(b.calories ?? 0),
            },
            { title: '蛋白', dataIndex: 'protein', width: 70, render: (v: number) => v != null ? <span className="mono">{Number(v).toFixed(1)}g</span> : '-' },
            { title: '碳水', dataIndex: 'carbohydrate', width: 70, render: (v: number) => v != null ? <span className="mono">{Number(v).toFixed(1)}g</span> : '-' },
            { title: '脂肪', dataIndex: 'fat', width: 70, render: (v: number) => v != null ? <span className="mono">{Number(v).toFixed(1)}g</span> : '-' },
          ]}
        />
        <p className="hand ink-soft" style={{ fontSize: 12, margin: '12px 0 0' }}>
          CSV 采用 UTF-8 BOM 编码，双击即可在 Excel / Numbers 正常打开。
        </p>
      </PaperCard>
    </div>
  );
}
