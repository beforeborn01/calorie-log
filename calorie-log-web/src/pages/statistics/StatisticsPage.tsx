import { useEffect, useState } from 'react';
import { Alert, Card, DatePicker, List, Progress, Space, Spin, Statistic, Tag, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { Link } from 'react-router-dom';
import {
  getDailyStatistics,
  getDietScore,
  getDietSuggestions,
  type DailyStatistics,
  type DietScore,
  type DietSuggestions,
} from '../../api/statistics';

// 遵循 DESIGN.md 单一强调色：蓝 = 中性信息，default = 弱中性；严重度用粗细/标题表达，不用色板
const STATUS_COLOR: Record<string, string> = {
  balanced: 'default',
  surplus: 'default',
  deficit: 'default',
  unknown: 'default',
};

const SEVERITY_COLOR: Record<string, string | undefined> = {
  critical: undefined, // default tag
  warn: undefined,
  info: 'blue',
};

export default function StatisticsPage() {
  const [date, setDate] = useState<Dayjs>(dayjs());
  const [daily, setDaily] = useState<DailyStatistics | null>(null);
  const [score, setScore] = useState<DietScore | null>(null);
  const [suggestions, setSuggestions] = useState<DietSuggestions | null>(null);
  const [loading, setLoading] = useState(false);

  const dateStr = date.format('YYYY-MM-DD');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getDailyStatistics(dateStr),
      getDietScore(dateStr),
      getDietSuggestions(dateStr),
    ])
      .then(([d, s, g]) => {
        if (cancelled) return;
        setDaily(d);
        setScore(s);
        setSuggestions(g);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [dateStr]);

  return (
    <div style={{ padding: 24, maxWidth: 820, margin: '0 auto' }}>
      <Space style={{ marginBottom: 16 }}>
        <Link to="/">
          <ArrowLeftOutlined /> 返回首页
        </Link>
        <DatePicker value={date} onChange={(d) => d && setDate(d)} />
      </Space>

      {loading && <Spin style={{ display: 'block', margin: '40px auto' }} />}

      {daily && (
        <Card style={{ marginBottom: 16 }}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Space>
              {daily.dayType != null && (
                <Tag color={daily.dayType === 1 ? 'blue' : 'default'}>
                  {daily.dayType === 1 ? '训练日' : '休息日'}
                </Tag>
              )}
              <Tag color={STATUS_COLOR[daily.calorieStatus]}>{daily.statusHint}</Tag>
            </Space>
            <Space size="large" wrap>
              <Statistic title="摄入" value={Number(daily.totalCalories).toFixed(0)} suffix="kcal" />
              <Statistic
                title="目标"
                value={daily.targetCalories == null ? '-' : Number(daily.targetCalories).toFixed(0)}
                suffix="kcal"
              />
              <Statistic
                title="TDEE"
                value={daily.tdee == null ? '-' : Number(daily.tdee).toFixed(0)}
                suffix="kcal"
              />
              <Statistic
                title="缺口/盈余"
                value={daily.calorieGap == null ? '-' : Number(daily.calorieGap).toFixed(0)}
                suffix="kcal"
                valueStyle={{ color: '#1d1d1f', fontWeight: 600 }}
              />
            </Space>
          </Space>
        </Card>
      )}

      {score && (
        <Card title={`饮食评分 ${Number(score.totalScore).toFixed(0)} / 100`} style={{ marginBottom: 16 }}>
          <ScoreBar label="热量达标" value={Number(score.calorieScore)} max={30} />
          <ScoreBar label="营养素合规" value={Number(score.nutrientScore)} max={35} />
          <ScoreBar label="餐次分配" value={Number(score.mealDistributionScore)} max={20} />
          <ScoreBar label="食物多样性" value={Number(score.varietyScore)} max={15} />
          <Typography.Text type="secondary">
            今日食物种类：{score.varietyCount} 种
          </Typography.Text>
        </Card>
      )}

      {suggestions && suggestions.suggestions.length > 0 && (
        <Card title="优化建议">
          <List
            dataSource={suggestions.suggestions}
            renderItem={(s) => (
              <List.Item>
                <List.Item.Meta
                  title={
                    <Space>
                      <Tag color={SEVERITY_COLOR[s.severity]}>{s.title}</Tag>
                    </Space>
                  }
                  description={
                    <div>
                      <div>{s.detail}</div>
                      {s.recommendedFoods && s.recommendedFoods.length > 0 && (
                        <div style={{ marginTop: 4 }}>
                          <Typography.Text type="secondary">推荐：</Typography.Text>
                          {s.recommendedFoods.map((f) => (
                            <Tag key={f}>{f}</Tag>
                          ))}
                        </div>
                      )}
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      )}

      {suggestions && suggestions.suggestions.length === 0 && daily && (
        <Alert type="success" showIcon message="今日表现很棒！没有发现需要优化的点。" />
      )}
    </div>
  );
}

function ScoreBar({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <Typography.Text>{label}</Typography.Text>
      <Progress
        percent={Math.round((value / max) * 100)}
        format={() => `${Number(value).toFixed(1)} / ${max}`}
      />
    </div>
  );
}
