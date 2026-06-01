// 训练统计 + PR
import { useEffect, useState } from 'react';
import { App, Card, Empty, Space, Statistic, Table, Tag } from 'antd';
import { getTrainingStats, listExercises, type TrainingExercise, type UserStatsResponse } from '../../api/training';

export default function TrainingStatsPage() {
  const { message } = App.useApp();
  const [stats, setStats] = useState<UserStatsResponse | null>(null);
  const [exMap, setExMap] = useState<Map<number, TrainingExercise>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getTrainingStats(), listExercises(true)])
      .then(([s, exs]) => {
        setStats(s);
        const m = new Map<number, TrainingExercise>();
        exs.forEach((e) => m.set(e.id, e));
        setExMap(m);
      })
      .catch((e) => message.error((e as Error).message || '加载失败'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 24 }}>加载中…</div>;
  if (!stats) return <div style={{ padding: 24 }}>暂无数据</div>;

  const prRows = Object.entries(stats.personalRecords || {}).map(([eid, v]) => ({
    key: eid,
    exerciseId: Number(eid),
    exerciseName: exMap.get(Number(eid))?.name || `动作#${eid}`,
    bodyPart: exMap.get(Number(eid))?.bodyPart || '',
    weight: v.weight,
    date: v.date,
  }));
  prRows.sort((a, b) => b.weight - a.weight);

  const netDeficit = stats.todayNetDeficit || 0;
  const burn = stats.todayExerciseCalories || 0;

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ marginTop: 0 }}>运动统计</h2>

      <Card
        title="今日能量闭环"
        style={{ marginBottom: 24, background: netDeficit > 0 ? '#f6ffed' : '#fff7e6' }}
      >
        <Space size="large" wrap>
          <Statistic
            title="今日运动消耗"
            value={burn.toFixed(0)}
            suffix="kcal"
            valueStyle={{ color: '#1677ff' }}
          />
          <Statistic
            title="今日净赤字"
            value={netDeficit.toFixed(0)}
            suffix="kcal"
            valueStyle={{ color: netDeficit > 0 ? '#52c41a' : '#fa8c16' }}
          />
          <div style={{ fontSize: 13, color: '#888', maxWidth: 320 }}>
            {netDeficit > 0
              ? '今天处于赤字，长期保持会减脂。'
              : netDeficit < 0
              ? '今天处于盈余，长期保持会增重。'
              : '请先在「健身目标」填好 TDEE、并记录饮食与运动'}
          </div>
        </Space>
      </Card>

      <Space size="large" wrap style={{ marginBottom: 24 }}>
        <Statistic title="累计完成运动" value={stats.totalWorkouts} suffix="次" />
        <Statistic title="累计运动量" value={(stats.totalVolume || 0).toFixed(1)} suffix="kg·rep" />
        <Statistic title="当前连续运动" value={stats.currentStreak} suffix="天" />
        <Statistic title="最长连续运动" value={stats.longestStreak} suffix="天" />
        <Statistic title="周均运动" value={(stats.weeklyAverage || 0).toFixed(1)} suffix="次/周" />
      </Space>

      <Card title={`个人最佳记录（${prRows.length}）`} style={{ marginBottom: 24 }}>
        {prRows.length === 0 ? (
          <Empty description="还没有 PR 记录，去运动吧" />
        ) : (
          <Table
            size="middle"
            pagination={{ pageSize: 20 }}
            dataSource={prRows}
            columns={[
              { title: '动作', dataIndex: 'exerciseName' },
              {
                title: '部位',
                dataIndex: 'bodyPart',
                render: (v) => <Tag>{v}</Tag>,
              },
              {
                title: '最佳重量(kg)',
                dataIndex: 'weight',
                render: (v: number) => v.toFixed(1),
                sorter: (a, b) => a.weight - b.weight,
              },
              {
                title: '日期',
                dataIndex: 'date',
                render: (v: string) => new Date(v).toLocaleDateString(),
              },
            ]}
          />
        )}
      </Card>

      {stats.lastWorkoutDate && (
        <div style={{ color: '#888' }}>
          上次运动：{new Date(stats.lastWorkoutDate).toLocaleString('zh-CN', { hour12: false })}
        </div>
      )}
    </div>
  );
}
