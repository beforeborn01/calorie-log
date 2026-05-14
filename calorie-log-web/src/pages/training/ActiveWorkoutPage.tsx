// 训练执行页（合并自 sports 项目）
// 功能：勾选完成、修改重量/次数、组间休息计时器、结束训练 → 写入 PR + 统计
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  App,
  Button,
  Card,
  Checkbox,
  InputNumber,
  Modal,
  Progress,
  Space,
  Statistic,
  Tag,
  Typography,
} from 'antd';
import {
  CheckOutlined,
  PauseOutlined,
  PlayCircleOutlined,
  StopOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import {
  abortSession,
  finishSession,
  getSession,
  updateSession,
  type CompletedSet,
  type ExerciseSession,
  type FinishSessionResponse,
  type WorkoutSession,
} from '../../api/training';

const REST_PRESETS = [30, 60, 90, 120, 180];

export default function ActiveWorkoutPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { message, modal } = App.useApp();

  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 休息计时器：endAt 是绝对时间戳，存到 localStorage 让切应用回来不丢
  const restKey = sessionId ? `clog_rest_${sessionId}` : null;
  const [restEndAt, setRestEndAt] = useState<number | null>(null);
  const [restTotal, setRestTotal] = useState(0);
  const [restPaused, setRestPaused] = useState(false);
  const [restPauseLeft, setRestPauseLeft] = useState(0); // 暂停时剩余秒数
  const [now, setNow] = useState(() => Date.now());
  const restTimer = useRef<number | null>(null);

  const restRemaining = restPaused
    ? restPauseLeft
    : restEndAt
    ? Math.max(0, Math.ceil((restEndAt - now) / 1000))
    : 0;

  // 完成总结 modal
  const [finishResult, setFinishResult] = useState<FinishSessionResponse | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    getSession(Number(sessionId))
      .then(setSession)
      .catch((e) => message.error((e as Error).message || '加载训练失败'))
      .finally(() => setLoading(false));
  }, [sessionId]);

  // 从 localStorage 还原计时器（切应用回来时）
  useEffect(() => {
    if (!restKey) return;
    const raw = localStorage.getItem(restKey);
    if (!raw) return;
    try {
      const p = JSON.parse(raw) as { endAt?: number; total?: number; pauseLeft?: number; paused?: boolean };
      if (p.paused && p.pauseLeft) {
        setRestPauseLeft(p.pauseLeft);
        setRestPaused(true);
        setRestTotal(p.total || 0);
      } else if (p.endAt && p.endAt > Date.now()) {
        setRestEndAt(p.endAt);
        setRestTotal(p.total || 0);
      } else {
        localStorage.removeItem(restKey);
      }
    } catch {
      /* noop */
    }
  }, [restKey]);

  // 持久化计时器状态
  useEffect(() => {
    if (!restKey) return;
    if (!restEndAt && !restPaused) {
      localStorage.removeItem(restKey);
      return;
    }
    localStorage.setItem(
      restKey,
      JSON.stringify({ endAt: restEndAt, total: restTotal, paused: restPaused, pauseLeft: restPauseLeft })
    );
  }, [restEndAt, restTotal, restPaused, restPauseLeft, restKey]);

  // 每秒 tick 一次（基于真实时间戳，回到前台立刻校准）
  useEffect(() => {
    if (restTimer.current) window.clearInterval(restTimer.current);
    if (!restEndAt || restPaused) return;
    restTimer.current = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= restEndAt) {
        if (restTimer.current) window.clearInterval(restTimer.current);
        try {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          osc.frequency.value = 880;
          osc.connect(ctx.destination);
          osc.start();
          setTimeout(() => {
            osc.stop();
            ctx.close();
          }, 200);
        } catch {
          /* noop */
        }
        setRestEndAt(null);
      }
    }, 1000) as unknown as number;
    return () => {
      if (restTimer.current) window.clearInterval(restTimer.current);
    };
  }, [restEndAt, restPaused]);

  function startRest(seconds: number) {
    setRestTotal(seconds);
    setRestEndAt(Date.now() + seconds * 1000);
    setRestPaused(false);
    setRestPauseLeft(0);
  }

  function pauseRest() {
    if (!restEndAt) return;
    setRestPauseLeft(Math.max(0, Math.ceil((restEndAt - Date.now()) / 1000)));
    setRestEndAt(null);
    setRestPaused(true);
  }

  function resumeRest() {
    if (restPauseLeft <= 0) return;
    setRestEndAt(Date.now() + restPauseLeft * 1000);
    setRestPaused(false);
  }

  function skipRest() {
    setRestEndAt(null);
    setRestPaused(false);
    setRestPauseLeft(0);
  }

  function toggleSet(exIdx: number, setIdx: number) {
    if (!session) return;
    const exercises = session.exercises.map((ex, i) => {
      if (i !== exIdx) return ex;
      const sets = ex.completedSets.map((s, j) => {
        if (j !== setIdx) return s;
        const nowCompleted = !s.isCompleted;
        return {
          ...s,
          isCompleted: nowCompleted,
          completedAt: nowCompleted ? new Date().toISOString() : s.completedAt,
        };
      });
      return { ...ex, completedSets: sets };
    });
    setSession({ ...session, exercises });
    // 自动起休息
    const set = session.exercises[exIdx].completedSets[setIdx];
    if (!set.isCompleted) {
      startRest(60);
    } else {
      skipRest(); // 取消勾选 → 终止休息
    }
  }

  function patchSet(exIdx: number, setIdx: number, patch: Partial<CompletedSet>) {
    if (!session) return;
    const exercises = session.exercises.map((ex, i) => {
      if (i !== exIdx) return ex;
      const sets = ex.completedSets.map((s, j) => (j !== setIdx ? s : { ...s, ...patch }));
      return { ...ex, completedSets: sets };
    });
    setSession({ ...session, exercises });
  }

  async function persist(silent = false) {
    if (!session || !sessionId) return;
    setSaving(true);
    try {
      await updateSession(Number(sessionId), { exercises: session.exercises });
      if (!silent) message.success('已保存');
    } catch (e) {
      message.error((e as Error).message || '保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function onFinish() {
    if (!session || !sessionId) return;
    modal.confirm({
      title: '结束训练？',
      content: '会写入总训练量、PR 与统计',
      onOk: async () => {
        try {
          await persist(true);
          const res = await finishSession(Number(sessionId), {
            endTime: new Date().toISOString(),
            duration: session.startTime
              ? Math.floor((Date.now() - new Date(session.startTime).getTime()) / 1000)
              : undefined,
          });
          if (restKey) localStorage.removeItem(restKey);
          setFinishResult(res);
        } catch (e) {
          message.error((e as Error).message || '结束失败');
        }
      },
    });
  }

  async function onAbort() {
    if (!sessionId) return;
    modal.confirm({
      title: '放弃本次训练？',
      content: '本次记录会被标记为已放弃，不计入统计',
      okType: 'danger',
      onOk: async () => {
        try {
          await abortSession(Number(sessionId));
          message.info('已放弃');
          navigate('/training/plans');
        } catch (e) {
          message.error((e as Error).message || '放弃失败');
        }
      },
    });
  }

  if (loading || !session) return <div style={{ padding: 24 }}>加载中…</div>;

  const totalSets = session.exercises.reduce((s, ex) => s + ex.completedSets.length, 0);
  const doneSets = session.exercises.reduce(
    (s, ex) => s + ex.completedSets.filter((x) => x.isCompleted).length,
    0
  );

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>{session.name}</h2>
          <div style={{ color: '#888', fontSize: 13 }}>
            开始于 {new Date(session.startTime).toLocaleTimeString()} · 进度 {doneSets}/{totalSets}
          </div>
        </div>
        <Space>
          <Button onClick={() => persist()} loading={saving}>
            保存进度
          </Button>
          <Button danger icon={<StopOutlined />} onClick={onAbort}>
            放弃
          </Button>
          <Button type="primary" icon={<CheckOutlined />} onClick={onFinish}>
            结束训练
          </Button>
        </Space>
      </div>

      {(restRemaining > 0 || restPaused) && (
        <Card style={{ marginBottom: 16, background: '#fffbe6', borderColor: '#ffe58f' }}>
          <Space size="large" align="center">
            <Statistic title="组间休息" value={restRemaining} suffix="秒" />
            <Progress
              type="circle"
              percent={
                restTotal > 0 ? Math.round(((restTotal - restRemaining) / restTotal) * 100) : 0
              }
              size={64}
            />
            <Space>
              {!restPaused ? (
                <Button icon={<PauseOutlined />} onClick={pauseRest}>
                  暂停
                </Button>
              ) : (
                <Button icon={<PlayCircleOutlined />} onClick={resumeRest}>
                  继续
                </Button>
              )}
              <Button onClick={skipRest}>跳过</Button>
            </Space>
          </Space>
        </Card>
      )}

      <Space wrap style={{ marginBottom: 12 }}>
        <span style={{ color: '#888' }}>快捷休息：</span>
        {REST_PRESETS.map((sec) => (
          <Button key={sec} size="small" onClick={() => startRest(sec)}>
            {sec}s
          </Button>
        ))}
      </Space>

      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {session.exercises.map((ex, exIdx) => (
          <ExerciseCard
            key={exIdx}
            exercise={ex}
            index={exIdx}
            onToggle={(setIdx) => toggleSet(exIdx, setIdx)}
            onPatch={(setIdx, patch) => patchSet(exIdx, setIdx, patch)}
          />
        ))}
      </Space>

      <FinishSummaryModal
        result={finishResult}
        onClose={() => {
          setFinishResult(null);
          navigate('/training/history');
        }}
      />
    </div>
  );
}

function FinishSummaryModal({
  result,
  onClose,
}: {
  result: FinishSessionResponse | null;
  onClose: () => void;
}) {
  if (!result) return null;
  const { session, newPersonalRecords } = result;
  const prCount = Object.keys(newPersonalRecords || {}).length;
  const duration = session.duration ? Math.round(session.duration / 60) : 0;
  const volume = session.totalVolume ? Math.round(session.totalVolume) : 0;
  return (
    <Modal
      open={!!result}
      onCancel={onClose}
      onOk={onClose}
      okText="完成"
      cancelButtonProps={{ style: { display: 'none' } }}
      width={520}
      centered
      title={
        <Space>
          <TrophyOutlined style={{ color: '#fadb14' }} />
          训练完成
        </Space>
      }
    >
      <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
        {session.name}
      </Typography.Paragraph>
      <Space size="large" wrap style={{ marginBottom: 16 }}>
        <Statistic title="时长" value={duration} suffix="分钟" />
        <Statistic title="训练量" value={volume} suffix="kg·rep" />
        <Statistic title="新 PR" value={prCount} suffix="个" valueStyle={prCount > 0 ? { color: '#52c41a' } : {}} />
      </Space>
      {prCount > 0 && (
        <Card size="small" style={{ background: '#f6ffed', borderColor: '#b7eb8f' }}>
          <Typography.Text strong>🎉 新打破的记录：</Typography.Text>
          <ul style={{ marginTop: 8, paddingLeft: 20, marginBottom: 0 }}>
            {Object.entries(newPersonalRecords).map(([eid, v]) => (
              <li key={eid}>
                动作 #{eid} — {Number(v.weight).toFixed(1)} kg
              </li>
            ))}
          </ul>
        </Card>
      )}
    </Modal>
  );
}

function ExerciseCard({
  exercise,
  index,
  onToggle,
  onPatch,
}: {
  exercise: ExerciseSession;
  index: number;
  onToggle: (setIdx: number) => void;
  onPatch: (setIdx: number, patch: Partial<CompletedSet>) => void;
}) {
  const done = exercise.completedSets.filter((s) => s.isCompleted).length;
  const total = exercise.completedSets.length;
  return (
    <Card
      title={`${index + 1}. ${exercise.exerciseName || `动作#${exercise.exerciseId}`}`}
      extra={
        <Tag color={done === total ? 'success' : 'processing'}>
          {done}/{total}
        </Tag>
      }
    >
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', color: '#888', fontSize: 12 }}>
            <th style={{ width: 50 }}>组</th>
            <th>次数</th>
            <th>重量(kg)</th>
            <th>RPE</th>
            <th style={{ width: 80 }}>完成</th>
          </tr>
        </thead>
        <tbody>
          {exercise.completedSets.map((s, idx) => (
            <tr key={idx} style={{ borderTop: '1px solid #f0f0f0' }}>
              <td>{s.setNumber}</td>
              <td>
                <InputNumber
                  min={0}
                  max={100}
                  value={s.reps}
                  onChange={(v) => onPatch(idx, { reps: v ?? 0 })}
                  style={{ width: 80 }}
                />
              </td>
              <td>
                <InputNumber
                  min={0}
                  max={500}
                  step={0.5}
                  value={s.weight}
                  onChange={(v) => onPatch(idx, { weight: v ?? 0 })}
                  style={{ width: 90 }}
                />
              </td>
              <td>
                <InputNumber
                  min={1}
                  max={10}
                  value={s.rpe}
                  onChange={(v) => onPatch(idx, { rpe: v ?? undefined })}
                  style={{ width: 70 }}
                />
              </td>
              <td>
                <Checkbox checked={s.isCompleted} onChange={() => onToggle(idx)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
