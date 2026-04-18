import { useEffect, useMemo, useState } from 'react';
import { Button, Card, DatePicker, Space, Statistic, Table, Tag, Typography, message } from 'antd';
import { DownloadOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { getDailyRecords } from '../../api/record';
import apiClient from '../../api/client';
import type { DietRecord } from '../../types';

const MEAL_LABEL: Record<number, string> = { 1: '早餐', 2: '午餐', 3: '晚餐', 4: '加餐' };

interface Row extends DietRecord {
  key: string;
}

export default function HistoryPage() {
  const navigate = useNavigate();
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

  // 手动刷新按钮沿用同一 effect：改 range 引用触发
  const reload = () => setRange([range[0], range[1]]);

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
      // 复用 axios client 的鉴权 + 401 续期逻辑；返回 Blob 绕过统一 JSON 解包拦截
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
    <div className="page-container" style={{ maxWidth: 1100 }}>
      <Card
        title="历史饮食记录"
        extra={
          <Space>
            <DatePicker.RangePicker
              value={range}
              onChange={(r) => r && r[0] && r[1] && setRange([r[0], r[1]])}
              allowClear={false}
            />
            <Button aria-label="刷新" title="刷新" icon={<ReloadOutlined />} onClick={reload} />
            <Button icon={<DownloadOutlined />} onClick={onExport}>
              导出 CSV
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() =>
                navigate(`/food/add?date=${dayjs().format('YYYY-MM-DD')}&meal=1`)
              }
            >
              添加（Ctrl/⌘ + K）
            </Button>
          </Space>
        }
      >
        <Space size="large" style={{ marginBottom: 16 }} wrap>
          <Statistic title="记录条数" value={stats.total} />
          <Statistic title="覆盖天数" value={stats.days} />
          <Statistic title="累计热量" value={stats.calories.toFixed(0)} suffix="kcal" />
        </Space>
        <Table
          size="small"
          loading={loading}
          dataSource={rows}
          pagination={{ pageSize: 20, showSizeChanger: true }}
          columns={[
            { title: '日期', dataIndex: 'recordDate', key: 'recordDate', width: 110, sorter: (a, b) => a.recordDate.localeCompare(b.recordDate) },
            {
              title: '餐次',
              dataIndex: 'mealType',
              key: 'mealType',
              width: 70,
              filters: Object.entries(MEAL_LABEL).map(([v, l]) => ({ text: l, value: Number(v) })),
              onFilter: (value, record) => record.mealType === value,
              render: (v: number) => <Tag>{MEAL_LABEL[v]}</Tag>,
            },
            { title: '食物', dataIndex: 'foodName', key: 'foodName' },
            {
              title: '分量',
              dataIndex: 'quantity',
              key: 'quantity',
              width: 80,
              render: (v: number) => `${Number(v).toFixed(0)} g`,
              sorter: (a, b) => Number(a.quantity ?? 0) - Number(b.quantity ?? 0),
            },
            {
              title: '热量',
              dataIndex: 'calories',
              key: 'calories',
              width: 90,
              render: (v: number) => `${Number(v).toFixed(0)} kcal`,
              sorter: (a, b) => Number(a.calories ?? 0) - Number(b.calories ?? 0),
            },
            { title: '蛋白', dataIndex: 'protein', width: 70, render: (v: number) => v != null ? `${Number(v).toFixed(1)}g` : '-' },
            { title: '碳水', dataIndex: 'carbohydrate', width: 70, render: (v: number) => v != null ? `${Number(v).toFixed(1)}g` : '-' },
            { title: '脂肪', dataIndex: 'fat', width: 70, render: (v: number) => v != null ? `${Number(v).toFixed(1)}g` : '-' },
          ]}
        />
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          CSV 采用 UTF-8 BOM 编码，双击即可在 Excel / Numbers 正常打开。
        </Typography.Text>
      </Card>
    </div>
  );
}
