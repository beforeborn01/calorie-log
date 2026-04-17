import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Select,
  Space,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import { ArrowLeftOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { Link } from 'react-router-dom';
import {
  createCustomExercise,
  createStrengthRecord,
  deleteStrengthRecord,
  listExercises,
  listStrengthRecords,
  type Exercise,
  type StrengthRecord,
} from '../../api/strength';

const BODY_PARTS = ['腿部', '胸部', '背部', '手臂', '肩部', '核心'];

export default function StrengthPage() {
  const [date, setDate] = useState<Dayjs>(dayjs());
  const [records, setRecords] = useState<StrengthRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [bodyPartTab, setBodyPartTab] = useState<string>(BODY_PARTS[0]);
  const [addOpen, setAddOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [form] = Form.useForm();
  const [customForm] = Form.useForm();
  const [notTraining, setNotTraining] = useState(false);

  const dateStr = date.format('YYYY-MM-DD');

  const reloadRecords = async () => {
    setLoading(true);
    try {
      const d = await listStrengthRecords(dateStr);
      setRecords(d);
    } finally {
      setLoading(false);
    }
  };

  const reloadExercises = async () => {
    const d = await listExercises({ bodyPart: bodyPartTab });
    setExercises(d);
  };

  useEffect(() => {
    reloadRecords();
  }, [dateStr]);
  useEffect(() => {
    reloadExercises();
  }, [bodyPartTab]);

  const totalVolume = useMemo(
    () =>
      records.reduce(
        (s, r) => s + Number(r.weight || 0) * Number(r.sets) * Number(r.repsPerSet),
        0
      ),
    [records]
  );

  const onAdd = async () => {
    const v = await form.validateFields();
    try {
      await createStrengthRecord({
        recordDate: dateStr,
        exerciseId: v.exerciseId,
        sets: v.sets,
        repsPerSet: v.repsPerSet,
        weight: v.weight,
        note: v.note,
      });
      message.success('已记录');
      setAddOpen(false);
      form.resetFields();
      setNotTraining(false);
      reloadRecords();
    } catch (e) {
      const m = e instanceof Error ? e.message : '';
      if (m.includes('休息日')) setNotTraining(true);
    }
  };

  const onDelete = (id: number) => {
    Modal.confirm({
      title: '删除这条训练记录？',
      okType: 'danger',
      onOk: async () => {
        await deleteStrengthRecord(id);
        message.success('已删除');
        reloadRecords();
      },
    });
  };

  const onCreateCustom = async () => {
    const v = await customForm.validateFields();
    await createCustomExercise({ name: v.name, bodyPart: v.bodyPart });
    message.success('已添加动作');
    setCustomOpen(false);
    customForm.resetFields();
    reloadExercises();
  };

  return (
    <div style={{ padding: 24, maxWidth: 820, margin: '0 auto' }}>
      <Space style={{ marginBottom: 16 }}>
        <Link to="/">
          <ArrowLeftOutlined /> 返回首页
        </Link>
        <DatePicker value={date} onChange={(d) => d && setDate(d)} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>
          添加训练
        </Button>
      </Space>

      <Card loading={loading} style={{ marginBottom: 16 }}>
        <Space size="large" wrap>
          <Typography.Text>当日记录 {records.length} 条</Typography.Text>
          <Typography.Text>累计容量 {totalVolume.toFixed(0)} kg</Typography.Text>
        </Space>
      </Card>

      <Card title="训练记录" style={{ marginBottom: 16 }}>
        {records.length === 0 ? (
          <Empty description="暂无训练记录" />
        ) : (
          <List
            dataSource={records}
            renderItem={(r) => (
              <List.Item
                actions={[<Button key="del" size="small" danger icon={<DeleteOutlined />} onClick={() => onDelete(r.id)} />]}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <Typography.Text strong>{r.exerciseName}</Typography.Text>
                      <Tag color="blue">{r.bodyPart}</Tag>
                    </Space>
                  }
                  description={`${r.sets} 组 × ${r.repsPerSet} 次 @ ${r.weight ?? 0} kg${r.note ? ` · ${r.note}` : ''}`}
                />
              </List.Item>
            )}
          />
        )}
      </Card>

      <Card
        title="动作库"
        extra={
          <Button size="small" onClick={() => setCustomOpen(true)}>
            + 自定义动作
          </Button>
        }
      >
        <Tabs
          activeKey={bodyPartTab}
          onChange={setBodyPartTab}
          items={BODY_PARTS.map((p) => ({
            key: p,
            label: p,
            children: (
              <Space wrap>
                {exercises.map((e) => (
                  <Tag key={e.id} color={e.isPreset ? 'default' : 'green'}>
                    {e.name}
                  </Tag>
                ))}
              </Space>
            ),
          }))}
        />
      </Card>

      <Modal
        title={`添加训练（${dateStr}）`}
        open={addOpen}
        onOk={onAdd}
        onCancel={() => {
          setAddOpen(false);
          setNotTraining(false);
        }}
        destroyOnClose
      >
        {notTraining && (
          <Typography.Paragraph type="danger">当前为休息日，无法记录力量训练</Typography.Paragraph>
        )}
        <Form form={form} layout="vertical">
          <Form.Item name="exerciseId" label="动作" rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={exercises.map((e) => ({ value: e.id, label: `${e.name} (${e.bodyPart})` }))}
            />
          </Form.Item>
          <Space>
            <Form.Item name="sets" label="组数" rules={[{ required: true }]}>
              <InputNumber min={1} max={20} />
            </Form.Item>
            <Form.Item name="repsPerSet" label="每组次数" rules={[{ required: true }]}>
              <InputNumber min={1} max={100} />
            </Form.Item>
            <Form.Item name="weight" label="重量 (kg)">
              <InputNumber min={0} max={500} step={0.5} />
            </Form.Item>
          </Space>
          <Form.Item name="note" label="备注">
            <Input.TextArea rows={2} maxLength={200} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="添加自定义动作"
        open={customOpen}
        onOk={onCreateCustom}
        onCancel={() => setCustomOpen(false)}
        destroyOnClose
      >
        <Form form={customForm} layout="vertical" initialValues={{ bodyPart: bodyPartTab }}>
          <Form.Item name="name" label="动作名" rules={[{ required: true }]}>
            <Input maxLength={100} />
          </Form.Item>
          <Form.Item name="bodyPart" label="部位" rules={[{ required: true }]}>
            <Select options={BODY_PARTS.map((p) => ({ value: p, label: p }))} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
