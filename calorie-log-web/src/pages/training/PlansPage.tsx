// 训练计划列表 + 新建/编辑（合并自 sports 项目）
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  App,
  Button,
  Card,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Tag,
  Tooltip,
} from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  PlayCircleOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import {
  createPlan,
  deletePlan as deletePlanApi,
  listExercises,
  listPlans,
  type PlanExercise,
  type TrainingExercise,
  updatePlan,
  type WorkoutPlan,
  createSession,
} from '../../api/training';

const TYPE_OPTS = [
  { label: '力量', value: 'strength' },
  { label: '有氧', value: 'cardio' },
  { label: '柔韧', value: 'mobility' },
  { label: '混合', value: 'mixed' },
];

function planTotalMinutes(plan: WorkoutPlan): number {
  if (plan.estimatedDuration) return plan.estimatedDuration;
  // 粗略估算：每组 1 min + 休息时间
  let secs = 0;
  for (const e of plan.exercises || []) {
    secs += (e.sets || 0) * 60 + (e.sets || 0) * (e.restSeconds || 60);
  }
  return Math.round(secs / 60);
}

export default function PlansPage() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<WorkoutPlan | null>(null);
  const [allExercises, setAllExercises] = useState<TrainingExercise[]>([]);

  async function refresh() {
    setLoading(true);
    try {
      const ps = await listPlans();
      setPlans(ps);
    } catch (e) {
      message.error((e as Error).message || '加载训练计划失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    listExercises().then(setAllExercises).catch(() => {});
  }, []);

  async function onStart(plan: WorkoutPlan) {
    try {
      const session = await createSession({
        planId: plan.id,
        name: plan.name,
        status: 'in_progress',
        startTime: new Date().toISOString(),
        source: 'plan',
        exercises: (plan.exercises || []).map((pe) => ({
          exerciseId: pe.exerciseId,
          plannedSets: pe.sets,
          notes: pe.notes,
          completedSets: Array.from({ length: pe.sets }, (_, i) => ({
            setNumber: i + 1,
            reps: pe.reps || 0,
            weight: pe.weight || 0,
            isCompleted: false,
          })),
        })),
      });
      navigate(`/training/active/${session.id}`);
    } catch (e) {
      message.error((e as Error).message || '开始训练失败');
    }
  }

  async function onDelete(plan: WorkoutPlan) {
    Modal.confirm({
      title: `删除 ${plan.name}？`,
      content: '此操作不可撤销',
      okType: 'danger',
      onOk: async () => {
        try {
          await deletePlanApi(plan.id);
          message.success('已删除');
          refresh();
        } catch (e) {
          message.error((e as Error).message || '删除失败');
        }
      },
    });
  }

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <h2 style={{ margin: 0 }}>训练计划</h2>
        <Space>
          <Button onClick={() => navigate('/training/history')}>训练历史</Button>
          <Button onClick={() => navigate('/training/stats')}>统计 / PR</Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditing(null);
              setEditorOpen(true);
            }}
          >
            新建计划
          </Button>
        </Space>
      </div>

      {plans.length === 0 && !loading ? (
        <Empty description="还没有训练计划，新建一个开始吧" />
      ) : (
        <div
          style={{
            display: 'grid',
            gap: 16,
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          }}
        >
          {plans.map((p) => (
            <Card
              key={p.id}
              title={p.name}
              extra={
                <Space>
                  <Tooltip title="开始训练">
                    <Button
                      type="primary"
                      size="small"
                      icon={<PlayCircleOutlined />}
                      onClick={() => onStart(p)}
                    />
                  </Tooltip>
                  <Tooltip title="编辑">
                    <Button
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => {
                        setEditing(p);
                        setEditorOpen(true);
                      }}
                    />
                  </Tooltip>
                  <Tooltip title="删除">
                    <Button
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => onDelete(p)}
                    />
                  </Tooltip>
                </Space>
              }
            >
              {p.description ? (
                <p style={{ color: '#666', marginTop: 0 }}>{p.description}</p>
              ) : null}
              <Space size="small" wrap>
                <Tag color="blue">{TYPE_OPTS.find((t) => t.value === p.type)?.label || p.type}</Tag>
                <Tag>{(p.exercises || []).length} 个动作</Tag>
                <Tag>{planTotalMinutes(p)} 分钟</Tag>
              </Space>
              <div style={{ marginTop: 12, fontSize: 13, color: '#888' }}>
                {(p.exercises || []).slice(0, 4).map((e) => (
                  <div key={e.exerciseId + '-' + e.sortOrder}>
                    {e.exerciseName || `动作#${e.exerciseId}`} · {e.sets}组
                    {e.reps ? `×${e.reps}` : ''}
                    {e.weight ? ` · ${e.weight}kg` : ''}
                  </div>
                ))}
                {(p.exercises || []).length > 4 && <div>...</div>}
              </div>
            </Card>
          ))}
        </div>
      )}

      <PlanEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        plan={editing}
        allExercises={allExercises}
        onSaved={() => {
          setEditorOpen(false);
          refresh();
        }}
      />
    </div>
  );
}

function PlanEditor({
  open,
  onClose,
  plan,
  allExercises,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  plan: WorkoutPlan | null;
  allExercises: TrainingExercise[];
  onSaved: () => void;
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [exercises, setExercises] = useState<PlanExercise[]>([]);
  const [saving, setSaving] = useState(false);
  const exMap = useMemo(() => {
    const m = new Map<number, TrainingExercise>();
    allExercises.forEach((e) => m.set(e.id, e));
    return m;
  }, [allExercises]);

  useEffect(() => {
    if (open) {
      if (plan) {
        form.setFieldsValue({
          name: plan.name,
          description: plan.description,
          type: plan.type || 'strength',
        });
        setExercises(plan.exercises || []);
      } else {
        form.resetFields();
        form.setFieldsValue({ type: 'strength' });
        setExercises([]);
      }
    }
  }, [open, plan, form]);

  function addExercise(eid: number) {
    if (!eid) return;
    if (exercises.find((x) => x.exerciseId === eid)) {
      message.info('已经添加过该动作');
      return;
    }
    const ex = exMap.get(eid);
    setExercises([
      ...exercises,
      {
        exerciseId: eid,
        exerciseName: ex?.name,
        bodyPart: ex?.bodyPart,
        sets: 3,
        reps: 10,
        weight: undefined,
        restSeconds: 60,
        sortOrder: exercises.length,
      },
    ]);
  }

  function patchExercise(idx: number, patch: Partial<PlanExercise>) {
    setExercises(exercises.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  }

  function removeExercise(idx: number) {
    setExercises(exercises.filter((_, i) => i !== idx));
  }

  async function onFinish(vals: { name: string; description?: string; type: string }) {
    setSaving(true);
    try {
      const payload = {
        name: vals.name,
        description: vals.description,
        type: vals.type,
        isTemplate: false,
        exercises: exercises.map((e, i) => ({ ...e, sortOrder: i })),
      };
      if (plan) await updatePlan(plan.id, payload);
      else await createPlan(payload);
      message.success('已保存');
      onSaved();
    } catch (e) {
      message.error((e as Error).message || '保存失败');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer
      title={plan ? `编辑：${plan.name}` : '新建训练计划'}
      open={open}
      onClose={onClose}
      width={640}
      destroyOnClose
      extra={
        <Button type="primary" loading={saving} onClick={() => form.submit()}>
          保存
        </Button>
      }
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item name="name" label="名称" rules={[{ required: true, message: '请填写名称' }]}>
          <Input placeholder="例：胸 + 三头" />
        </Form.Item>
        <Form.Item name="description" label="描述">
          <Input.TextArea rows={2} placeholder="可选" />
        </Form.Item>
        <Form.Item name="type" label="类型">
          <Select options={TYPE_OPTS} />
        </Form.Item>
      </Form>

      <h3 style={{ marginTop: 24 }}>动作清单</h3>
      <Select
        showSearch
        placeholder="搜索并添加动作..."
        style={{ width: '100%', marginBottom: 12 }}
        value={null}
        onChange={(v) => v && addExercise(v)}
        filterOption={(input, opt) =>
          (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())
        }
        options={allExercises.map((e) => ({
          value: e.id,
          label: `${e.name} · ${e.bodyPart}`,
        }))}
      />

      {exercises.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没添加动作" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {exercises.map((e, i) => (
            <Card
              key={`${e.exerciseId}-${i}`}
              size="small"
              title={`${i + 1}. ${e.exerciseName || `动作#${e.exerciseId}`}`}
              extra={
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => removeExercise(i)}
                />
              }
            >
              <Space wrap>
                <span>
                  组数
                  <InputNumber
                    min={1}
                    max={20}
                    value={e.sets}
                    onChange={(v) => patchExercise(i, { sets: v ?? 1 })}
                    style={{ marginLeft: 4, width: 70 }}
                  />
                </span>
                <span>
                  次数
                  <InputNumber
                    min={0}
                    max={100}
                    value={e.reps}
                    onChange={(v) => patchExercise(i, { reps: v ?? undefined })}
                    style={{ marginLeft: 4, width: 70 }}
                  />
                </span>
                <span>
                  重量(kg)
                  <InputNumber
                    min={0}
                    max={500}
                    step={0.5}
                    value={e.weight}
                    onChange={(v) => patchExercise(i, { weight: v ?? undefined })}
                    style={{ marginLeft: 4, width: 80 }}
                  />
                </span>
                <span>
                  休息(秒)
                  <InputNumber
                    min={0}
                    max={600}
                    step={15}
                    value={e.restSeconds}
                    onChange={(v) => patchExercise(i, { restSeconds: v ?? 60 })}
                    style={{ marginLeft: 4, width: 80 }}
                  />
                </span>
              </Space>
            </Card>
          ))}
        </div>
      )}
    </Drawer>
  );
}
