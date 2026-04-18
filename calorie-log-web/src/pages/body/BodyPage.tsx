import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  DatePicker,
  Empty,
  Form,
  InputNumber,
  List,
  Modal,
  Space,
  Statistic,
  Typography,
  message,
} from 'antd';
import { ArrowLeftOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { Link } from 'react-router-dom';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { deleteBodyRecord, getBodyTrend, saveBodyRecord, type BodyTrend } from '../../api/body';
import { chartTheme, tooltipStyle, axisStyle } from '../../components/ChartTheme';

export default function BodyPage() {
  const [range, setRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(30, 'day'), dayjs()]);
  const [trend, setTrend] = useState<BodyTrend | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const reload = async () => {
    setLoading(true);
    try {
      const d = await getBodyTrend(range[0].format('YYYY-MM-DD'), range[1].format('YYYY-MM-DD'));
      setTrend(d);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, [range]);

  const onAdd = async () => {
    const v = await form.validateFields();
    await saveBodyRecord({
      recordDate: v.recordDate.format('YYYY-MM-DD'),
      weight: v.weight ?? undefined,
      bodyFat: v.bodyFat ?? undefined,
    });
    message.success('已保存');
    setModalOpen(false);
    form.resetFields();
    reload();
  };

  const onDelete = (id: number) => {
    Modal.confirm({
      title: '删除这条体重记录？',
      okType: 'danger',
      onOk: async () => {
        await deleteBodyRecord(id);
        message.success('已删除');
        reload();
      },
    });
  };

  return (
    <div style={{ padding: 24, maxWidth: 820, margin: '0 auto' }}>
      <Space style={{ marginBottom: 16 }}>
        <Link to="/">
          <ArrowLeftOutlined /> 返回首页
        </Link>
        <DatePicker.RangePicker
          value={range}
          onChange={(r) => r && r[0] && r[1] && setRange([r[0], r[1]])}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          记录
        </Button>
      </Space>

      <Card loading={loading} style={{ marginBottom: 16 }}>
        <Space size="large" wrap>
          <Statistic
            title="体重变化"
            value={trend?.weightChange ?? '-'}
            suffix="kg"
            valueStyle={{ color: '#1d1d1f', fontWeight: 600 }}
          />
          <Statistic
            title="体脂率变化"
            value={trend?.bodyFatChange ?? '-'}
            suffix="%"
            valueStyle={{ color: '#1d1d1f', fontWeight: 600 }}
          />
          <Statistic title="记录条数" value={trend?.records.length ?? 0} />
        </Space>

        {trend && trend.records.length > 1 && (
          <div style={{ height: 240, marginTop: 20 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={trend.records.map((r) => ({
                  date: r.recordDate.slice(5), // MM-DD
                  weight: r.weight ?? null,
                  bodyFat: r.bodyFat ?? null,
                }))}
                margin={{ top: 8, right: 16, left: -8, bottom: 0 }}
              >
                <CartesianGrid stroke={chartTheme.grid} vertical={false} />
                <XAxis dataKey="date" tick={axisStyle} tickLine={false} axisLine={false} />
                <YAxis
                  yAxisId="w"
                  tick={axisStyle}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                  domain={['dataMin - 1', 'dataMax + 1']}
                  tickFormatter={(v) => `${Number(v).toFixed(1)}`}
                />
                <YAxis
                  yAxisId="bf"
                  orientation="right"
                  tick={axisStyle}
                  tickLine={false}
                  axisLine={false}
                  width={36}
                  domain={['dataMin - 1', 'dataMax + 1']}
                  tickFormatter={(v) => `${Number(v).toFixed(1)}`}
                />
                <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: chartTheme.grid }} />
                <Line
                  yAxisId="w"
                  type="monotone"
                  dataKey="weight"
                  name="体重 kg"
                  stroke={chartTheme.primary}
                  strokeWidth={2}
                  dot={{ r: 3, fill: chartTheme.primary, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
                <Line
                  yAxisId="bf"
                  type="monotone"
                  dataKey="bodyFat"
                  name="体脂 %"
                  stroke={chartTheme.secondary}
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  dot={{ r: 2, fill: chartTheme.secondary, strokeWidth: 0 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card title="历史记录">
        {(!trend || trend.records.length === 0) ? (
          <Empty description="暂无数据" />
        ) : (
          <List
            dataSource={[...trend.records].reverse()}
            renderItem={(r) => (
              <List.Item
                actions={[<Button key="del" danger icon={<DeleteOutlined />} size="small" onClick={() => onDelete(r.id)} />]}
              >
                <List.Item.Meta
                  title={r.recordDate}
                  description={
                    <Space>
                      {r.weight != null && <Typography.Text>体重 {r.weight} kg</Typography.Text>}
                      {r.bodyFat != null && <Typography.Text>体脂 {r.bodyFat}%</Typography.Text>}
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>

      <Modal
        title="记录体重体脂"
        open={modalOpen}
        onOk={onAdd}
        onCancel={() => setModalOpen(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical" initialValues={{ recordDate: dayjs() }}>
          <Form.Item name="recordDate" label="日期" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="weight" label="体重 (kg)">
            <InputNumber min={20} max={300} step={0.1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="bodyFat" label="体脂率 (%)">
            <InputNumber min={1} max={80} step={0.1} style={{ width: '100%' }} />
          </Form.Item>
          <Typography.Text type="secondary">体重与体脂至少填写一项</Typography.Text>
        </Form>
      </Modal>
    </div>
  );
}
