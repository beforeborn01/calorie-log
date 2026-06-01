import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  message,
} from 'antd';
import { ArrowLeftOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { Link } from 'react-router-dom';
import {
  createCustomExercise,
  listExercises,
  type Exercise,
} from '../../api/strength';
import {
  createSession,
  deleteSession,
  listSessionsByDate,
  type WorkoutSession,
} from '../../api/training';
import { Chip, PaperCard, Pill, SketchButton } from '../../components/sketch';

const BODY_PARTS = ['腿部', '胸部', '背部', '手臂', '肩部', '核心'];

/**
 * 速记一条 → 新建一个 status=completed、source=quick_form 的 mini-session。
 * 单动作单 session：方便单条删除。duration 用「sets × 90s」粗算，够 MET 模型估卡路里。
 */
function buildSessionPayload(
  date: Dayjs,
  exercise: Exercise,
  sets: number,
  repsPerSet: number,
  weight: number | undefined,
  note: string | undefined
): Omit<WorkoutSession, 'id' | 'createdAt' | 'updatedAt'> {
  const occurredAt = date.hour(12).minute(0).second(0).toISOString();
  const duration = Math.max(60, sets * 90);
  const completedSets = Array.from({ length: sets }, (_, i) => ({
    setNumber: i + 1,
    reps: repsPerSet,
    weight: weight ?? 0,
    isCompleted: true,
    completedAt: occurredAt,
  }));
  return {
    name: `${exercise.name} · 速记`,
    status: 'completed',
    startTime: occurredAt,
    endTime: occurredAt,
    duration,
    source: 'quick_form',
    notes: note,
    exercises: [
      {
        exerciseId: exercise.id,
        plannedSets: sets,
        completedSets,
      },
    ],
  };
}

// __CONTINUE_HERE__
export default function StrengthPage() {
  const [date, setDate] = useState<Dayjs>(dayjs());
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [bodyPartTab, setBodyPartTab] = useState<string>(BODY_PARTS[0]);
  const [addOpen, setAddOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [form] = Form.useForm();
  const [customForm] = Form.useForm();

  const dateStr = date.format('YYYY-MM-DD');

  const reloadSessions = async () => {
    setLoading(true);
    try {
      const d = await listSessionsByDate(dateStr);
      // 只把通过本页"速记"建的 session 显示出来；计划训练在「运动管理 → 计划」里看
      setSessions(d.filter((s) => s.source === 'quick_form'));
    } finally {
      setLoading(false);
    }
  };

  // 速记表单的"动作"下拉用全量动作库（按部位筛）
  const reloadExercises = async () => {
    const d = await listExercises({ bodyPart: bodyPartTab });
    setExercises(d);
  };

  useEffect(() => {
    reloadSessions();
  }, [dateStr]);
  useEffect(() => {
    reloadExercises();
  }, [bodyPartTab]);

  // 单条速记一组：组数 × 每组次数 × 重量
  type FlatRecord = {
    sessionId: number;
    exerciseName: string;
    bodyPart?: string;
    sets: number;
    repsPerSet: number;
    weight: number;
    note?: string;
  };

  // 把当天所有 quick_form session 展平：每个 session 就是一条速记记录（单动作单 session）
  const flatRecords = useMemo<FlatRecord[]>(() => {
    const out: FlatRecord[] = [];
    for (const s of sessions) {
      const ex = (s.exercises || [])[0];
      if (!ex) continue;
      const sets = ex.completedSets || [];
      if (sets.length === 0) continue;
      // 速记是同一动作的等组等重等次，取第一组的 reps/weight 显示
      const first = sets[0];
      out.push({
        sessionId: s.id,
        exerciseName: ex.exerciseName ?? s.name.replace(/ · 速记$/, ''),
        sets: sets.length,
        repsPerSet: first.reps ?? 0,
        weight: Number(first.weight ?? 0),
        note: s.notes,
      });
    }
    return out;
  }, [sessions]);

  const totalVolume = useMemo(
    () =>
      flatRecords.reduce(
        (s, r) => s + Number(r.weight || 0) * Number(r.sets) * Number(r.repsPerSet),
        0
      ),
    [flatRecords]
  );

  const onAdd = async () => {
    const v = await form.validateFields();
    const ex = exercises.find((e) => e.id === v.exerciseId);
    if (!ex) {
      message.error('请选择动作');
      return;
    }
    await createSession(
      buildSessionPayload(date, ex, v.sets, v.repsPerSet, v.weight, v.note)
    );
    message.success('已记录');
    setAddOpen(false);
    form.resetFields();
    reloadSessions();
  };

  const onDelete = (sessionId: number) => {
    Modal.confirm({
      title: '删除这条运动记录？',
      okType: 'danger',
      onOk: async () => {
        await deleteSession(sessionId);
        message.success('已删除');
        reloadSessions();
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
          <div className="mono ink-soft" style={{ fontSize: 11, letterSpacing: 2 }}>SPORT · 运动</div>
          <h1 className="display" style={{ fontSize: 36, margin: '4px 0 0' }}>
            <span className="scribble-u">运动速记</span>
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <DatePicker value={date} onChange={(d) => d && setDate(d)} />
          <SketchButton primary onClick={() => setAddOpen(true)}>
            <PlusOutlined style={{ marginRight: 4 }} />速记一条
          </SketchButton>
        </div>
      </div>

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="本页和「运动管理 → 计划」共享数据，已记录会自动计入今日运动消耗"
      />

      <PaperCard style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
          <div>
            <div className="hand ink-soft" style={{ fontSize: 12 }}>当日记录</div>
            <div className="mono" style={{ fontSize: 26, fontWeight: 500 }}>{flatRecords.length} <span className="hand ink-soft" style={{ fontSize: 13 }}>条</span></div>
          </div>
          <div>
            <div className="hand ink-soft" style={{ fontSize: 12 }}>累计容量</div>
            <div className="mono" style={{ fontSize: 26, fontWeight: 500 }}>{totalVolume.toFixed(0)} <span className="hand ink-soft" style={{ fontSize: 13 }}>kg</span></div>
          </div>
        </div>
      </PaperCard>

      <h3 className="display" style={{ fontSize: 22, margin: '24px 0 12px' }}>速记记录</h3>
      {loading && flatRecords.length === 0 ? (
        <PaperCard><div className="hand ink-faint" style={{ padding: '12px 0' }}>加载中…</div></PaperCard>
      ) : flatRecords.length === 0 ? (
        <PaperCard>
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div className="display" style={{ fontSize: 36, color: 'var(--ink-faint)' }}>暂无</div>
            <div className="hand ink-soft" style={{ marginTop: 6 }}>今天还没有速记</div>
            <SketchButton primary style={{ marginTop: 16 }} onClick={() => setAddOpen(true)}>
              + 速记第一条
            </SketchButton>
          </div>
        </PaperCard>
      ) : (
        flatRecords.map((r) => (
          <PaperCard key={r.sessionId} style={{ marginBottom: 10, padding: '14px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="hand" style={{ fontWeight: 700, fontSize: 15 }}>{r.exerciseName}</span>
                </div>
                <div className="hand ink-soft" style={{ fontSize: 13, marginTop: 4 }}>
                  <span className="mono">{r.sets}</span> 组 ×{' '}
                  <span className="mono">{r.repsPerSet}</span> 次 @{' '}
                  <span className="mono">{r.weight ?? 0}</span> kg
                  {r.note && ` · ${r.note}`}
                </div>
              </div>
              <SketchButton size="sm" aria-label="删除" onClick={() => onDelete(r.sessionId)}>
                <DeleteOutlined />
              </SketchButton>
            </div>
          </PaperCard>
        ))
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          margin: '24px 0 12px',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <h3 className="display" style={{ fontSize: 22, margin: 0 }}>动作库</h3>
        <SketchButton size="sm" onClick={() => setCustomOpen(true)}>+ 自定义动作</SketchButton>
      </div>

      <PaperCard>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          {BODY_PARTS.map((p) => (
            <Pill key={p} active={bodyPartTab === p} onClick={() => setBodyPartTab(p)}>{p}</Pill>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {exercises.length === 0 ? (
            <span className="hand ink-faint">暂无动作</span>
          ) : (
            exercises.map((e) => (
              <Chip key={e.id} color={e.isPreset ? 'var(--paper-2)' : 'oklch(0.94 0.06 145)'}>
                {e.name}
              </Chip>
            ))
          )}
        </div>
      </PaperCard>

      <Modal
        title={<span className="display" style={{ fontSize: 22 }}>速记一条（{dateStr}）</span>}
        open={addOpen}
        onCancel={() => setAddOpen(false)}
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <SketchButton onClick={() => setAddOpen(false)}>取消</SketchButton>
            <SketchButton primary onClick={onAdd}>保存</SketchButton>
          </div>
        }
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item name="exerciseId" label={<span className="hand">动作</span>} rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={exercises.map((e) => ({ value: e.id, label: `${e.name} (${e.bodyPart})` }))}
            />
          </Form.Item>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Form.Item name="sets" label={<span className="hand">组数</span>} rules={[{ required: true }]} style={{ flex: 1, minWidth: 100 }}>
              <InputNumber min={1} max={20} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="repsPerSet" label={<span className="hand">每组次数</span>} rules={[{ required: true }]} style={{ flex: 1, minWidth: 120 }}>
              <InputNumber min={1} max={100} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="weight" label={<span className="hand">重量 (kg)</span>} style={{ flex: 1, minWidth: 120 }}>
              <InputNumber min={0} max={500} step={0.5} style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <Form.Item name="note" label={<span className="hand">备注</span>}>
            <Input.TextArea rows={2} maxLength={200} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={<span className="display" style={{ fontSize: 22 }}>添加自定义动作</span>}
        open={customOpen}
        onCancel={() => setCustomOpen(false)}
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <SketchButton onClick={() => setCustomOpen(false)}>取消</SketchButton>
            <SketchButton primary onClick={onCreateCustom}>保存</SketchButton>
          </div>
        }
        destroyOnHidden
      >
        <Form form={customForm} layout="vertical" initialValues={{ bodyPart: bodyPartTab }}>
          <Form.Item name="name" label={<span className="hand">动作名</span>} rules={[{ required: true }]}>
            <Input maxLength={100} />
          </Form.Item>
          <Form.Item name="bodyPart" label={<span className="hand">部位</span>} rules={[{ required: true }]}>
            <Select options={BODY_PARTS.map((p) => ({ value: p, label: p }))} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
