// 训练历史
import { useEffect, useState } from 'react';
import { App, Button, Card, Empty, Space, Statistic, Tag } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { listSessions, type WorkoutSession } from '../../api/training';
import { useNavigate } from 'react-router-dom';
import QuickLogModal from './QuickLogModal';

function statusColor(s: WorkoutSession['status']) {
  if (s === 'completed') return 'success';
  if (s === 'in_progress') return 'processing';
  if (s === 'abandoned') return 'default';
  return 'default';
}
function statusLabel(s: WorkoutSession['status']) {
  return { completed: '已完成', in_progress: '进行中', abandoned: '已放弃', planned: '计划中' }[s] || s;
}

export default function SessionsPage() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);

  function reload() {
    setLoading(true);
    listSessions(1, 50)
      .then(setSessions)
      .catch((e) => message.error((e as Error).message || '加载失败'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    reload();
  }, []);

  const totalVolume = sessions
    .filter((s) => s.status === 'completed')
    .reduce((acc, s) => acc + (s.totalVolume || 0), 0);
  const totalCompleted = sessions.filter((s) => s.status === 'completed').length;

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
        <h2 style={{ margin: 0 }}>训练历史</h2>
        <Space>
          <Button icon={<EditOutlined />} onClick={() => setQuickOpen(true)}>
            补录
          </Button>
          <Button onClick={() => navigate('/training/plans')}>训练计划</Button>
          <Button onClick={() => navigate('/training/stats')}>统计 / PR</Button>
        </Space>
      </div>

      <Space size="large" style={{ marginBottom: 16 }}>
        <Statistic title="累计完成训练" value={totalCompleted} suffix="次" />
        <Statistic title="累计训练量" value={totalVolume.toFixed(1)} suffix="kg·rep" />
      </Space>

      {loading ? (
        <div>加载中…</div>
      ) : sessions.length === 0 ? (
        <Empty description="还没有训练记录" />
      ) : (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {sessions.map((s) => (
            <Card
              key={s.id}
              title={s.name}
              extra={<Tag color={statusColor(s.status)}>{statusLabel(s.status)}</Tag>}
              onClick={() => {
                if (s.status === 'in_progress') {
                  navigate(`/training/active/${s.id}`);
                }
              }}
              hoverable={s.status === 'in_progress'}
            >
              <Space size="large" wrap>
                <span style={{ color: '#888' }}>
                  {new Date(s.startTime).toLocaleString('zh-CN', { hour12: false })}
                </span>
                {s.duration ? <Tag>{Math.round(s.duration / 60)} 分钟</Tag> : null}
                {s.totalVolume ? <Tag color="blue">{s.totalVolume.toFixed(0)} kg·rep</Tag> : null}
                <Tag>{(s.exercises || []).length} 个动作</Tag>
                {s.source === 'quick_log' ? <Tag color="purple">补录</Tag> : null}
              </Space>
              {s.notes ? (
                <div style={{ marginTop: 8, color: '#666', fontSize: 13 }}>{s.notes}</div>
              ) : null}
            </Card>
          ))}
        </Space>
      )}

      <QuickLogModal
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        onSuccess={() => reload()}
      />
    </div>
  );
}
