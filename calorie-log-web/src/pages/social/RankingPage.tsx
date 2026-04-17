import { useEffect, useState } from 'react';
import { Alert, Card, Empty, List, Segmented, Space, Tag, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { getRanking, type RankingResponse } from '../../api/social';

type RankType = 'exp' | 'score' | 'streak';
type PeriodType = 'all' | 'week' | 'month';

const TYPE_LABEL: Record<RankType, string> = {
  exp: '经验值',
  score: '饮食评分',
  streak: '连续天数',
};

const SCORE_SUFFIX: Record<RankType, string> = {
  exp: ' exp',
  score: ' 分',
  streak: ' 天',
};

export default function RankingPage() {
  const [type, setType] = useState<RankType>('exp');
  const [period, setPeriod] = useState<PeriodType>('all');
  const [data, setData] = useState<RankingResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getRanking(type, period)
      .then(setData)
      .finally(() => setLoading(false));
  }, [type, period]);

  const effectivePeriod: PeriodType = type === 'score' ? period : 'all';

  return (
    <div style={{ padding: 24, maxWidth: 820, margin: '0 auto' }}>
      <Space style={{ marginBottom: 16 }}>
        <Link to="/">
          <ArrowLeftOutlined /> 返回首页
        </Link>
      </Space>

      <Card>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Segmented
            value={type}
            onChange={(v) => setType(v as RankType)}
            options={[
              { label: TYPE_LABEL.exp, value: 'exp' },
              { label: TYPE_LABEL.score, value: 'score' },
              { label: TYPE_LABEL.streak, value: 'streak' },
            ]}
            block
          />
          {type === 'score' && (
            <Segmented
              value={period}
              onChange={(v) => setPeriod(v as PeriodType)}
              options={[
                { label: '近 30 天', value: 'all' },
                { label: '本周', value: 'week' },
                { label: '本月', value: 'month' },
              ]}
              block
            />
          )}

          {data?.self && (
            <Alert
              type="info"
              message={
                <Space size="small" wrap>
                  <Typography.Text strong>当前排名：第 {data.self.rank} 位</Typography.Text>
                  <Typography.Text type="secondary">
                    {TYPE_LABEL[type]} {data.self.score}
                    {SCORE_SUFFIX[type]}
                  </Typography.Text>
                  {data.gapToPrevious > 0 && (
                    <Typography.Text type="secondary">
                      距上一名差 {data.gapToPrevious}
                      {SCORE_SUFFIX[type]}
                    </Typography.Text>
                  )}
                </Space>
              }
            />
          )}

          <List
            loading={loading}
            locale={{ emptyText: <Empty description="还没有好友，加几个一起比" /> }}
            dataSource={data?.entries ?? []}
            renderItem={(e) => (
              <List.Item
                style={{
                  background: e.isSelf ? '#e6f4ff' : undefined,
                  padding: 12,
                  borderRadius: 8,
                }}
              >
                <List.Item.Meta
                  avatar={
                    <div
                      style={{
                        width: 40,
                        textAlign: 'center',
                        fontSize: e.rank <= 3 ? 22 : 16,
                        fontWeight: 700,
                        color: e.rank === 1 ? '#faad14' : e.rank === 2 ? '#bfbfbf' : e.rank === 3 ? '#d46b08' : undefined,
                      }}
                    >
                      {e.rank}
                    </div>
                  }
                  title={
                    <Space>
                      <Typography.Text strong>{e.nickname}</Typography.Text>
                      <Tag color="gold">Lv{e.level}</Tag>
                      {e.isSelf && <Tag color="blue">你</Tag>}
                    </Space>
                  }
                />
                <Typography.Text strong>
                  {e.score}
                  {SCORE_SUFFIX[type]}
                </Typography.Text>
              </List.Item>
            )}
          />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {type === 'score'
              ? `周期：${effectivePeriod === 'all' ? '近 30 天' : effectivePeriod === 'week' ? '本周' : '本月'}平均饮食评分`
              : type === 'exp'
              ? '经验值榜按累计总经验排名'
              : '连续记录天数榜，包括你和好友'}
          </Typography.Text>
        </Space>
      </Card>
    </div>
  );
}
