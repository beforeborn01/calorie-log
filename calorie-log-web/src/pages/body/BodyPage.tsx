import { useEffect, useState } from 'react';
import {
  DatePicker,
  Form,
  InputNumber,
  Modal,
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
import { PaperCard, SketchButton } from '../../components/sketch';

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
    <div style={{ maxWidth: 820, margin: '0 auto', padding: 24 }}>
      <div style={{ marginBottom: 8 }}>
        <Link className="hand accent" to="/">
          <ArrowLeftOutlined /> 返回首页
        </Link>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <div className="mono ink-soft" style={{ fontSize: 11, letterSpacing: 2 }}>BODY · 体征</div>
          <h1 className="display" style={{ fontSize: 36, margin: '4px 0 0' }}>
            <span className="scribble-u">体重体脂</span>
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <DatePicker.RangePicker
            value={range}
            onChange={(r) => r && r[0] && r[1] && setRange([r[0], r[1]])}
          />
          <SketchButton primary onClick={() => setModalOpen(true)}>
            <PlusOutlined style={{ marginRight: 4 }} />记录
          </SketchButton>
        </div>
      </div>

      <PaperCard style={{ marginBottom: 16 }}>
        {loading && !trend ? (
          <div className="hand ink-faint" style={{ padding: '12px 0' }}>加载中…</div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
              <Stat label="体重变化" value={trend?.weightChange ?? '-'} suffix="kg" />
              <Stat label="体脂率变化" value={trend?.bodyFatChange ?? '-'} suffix="%" />
              <Stat label="记录条数" value={trend?.records.length ?? 0} />
            </div>

            {trend && trend.records.length > 1 && (
              <div style={{ height: 240, marginTop: 20 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={trend.records.map((r) => ({
                      date: r.recordDate.slice(5),
                      weight: r.weight ?? null,
                      bodyFat: r.bodyFat ?? null,
                    }))}
                    margin={{ top: 8, right: 16, left: -8, bottom: 0 }}
                  >
                    <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" vertical={false} />
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
                      strokeWidth={2.2}
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
          </>
        )}
      </PaperCard>

      <h3 className="display" style={{ fontSize: 22, margin: '24px 0 12px' }}>历史记录</h3>
      {(!trend || trend.records.length === 0) ? (
        <PaperCard>
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div className="display" style={{ fontSize: 36, color: 'var(--ink-faint)' }}>暂无</div>
            <div className="hand ink-soft" style={{ marginTop: 6 }}>还没有体重记录</div>
            <SketchButton primary style={{ marginTop: 16 }} onClick={() => setModalOpen(true)}>
              + 添加第一条
            </SketchButton>
          </div>
        </PaperCard>
      ) : (
        [...trend.records].reverse().map((r) => (
          <PaperCard key={r.id} style={{ marginBottom: 10, padding: '14px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span className="mono" style={{ fontSize: 15, fontWeight: 500 }}>{r.recordDate}</span>
              <div style={{ flex: 1, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {r.weight != null && (
                  <span className="hand">体重 <span className="mono" style={{ fontWeight: 700 }}>{r.weight}</span> kg</span>
                )}
                {r.bodyFat != null && (
                  <span className="hand">体脂 <span className="mono" style={{ fontWeight: 700 }}>{r.bodyFat}</span>%</span>
                )}
              </div>
              <SketchButton size="sm" aria-label="删除" onClick={() => onDelete(r.id)}>
                <DeleteOutlined />
              </SketchButton>
            </div>
          </PaperCard>
        ))
      )}

      <Modal
        title={<span className="display" style={{ fontSize: 22 }}>记录体重体脂</span>}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <SketchButton onClick={() => setModalOpen(false)}>取消</SketchButton>
            <SketchButton primary onClick={onAdd}>保存</SketchButton>
          </div>
        }
        destroyOnHidden
      >
        <Form form={form} layout="vertical" initialValues={{ recordDate: dayjs() }}>
          <Form.Item name="recordDate" label={<span className="hand">日期</span>} rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="weight" label={<span className="hand">体重 (kg)</span>}>
            <InputNumber min={20} max={300} step={0.1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="bodyFat" label={<span className="hand">体脂率 (%)</span>}>
            <InputNumber min={1} max={80} step={0.1} style={{ width: '100%' }} />
          </Form.Item>
          <p className="hand ink-soft" style={{ fontSize: 13 }}>体重与体脂至少填写一项</p>
        </Form>
      </Modal>
    </div>
  );
}
