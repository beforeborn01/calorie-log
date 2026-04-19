import { useEffect, useState } from 'react';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { getRanking, type RankingResponse } from '../../api/social';
import { Chip, PaperCard, Pill } from '../../components/sketch';

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
  const entries = data?.entries ?? [];

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: 24 }}>
      <div style={{ marginBottom: 8 }}>
        <Link className="hand accent" to="/">
          <ArrowLeftOutlined /> 返回首页
        </Link>
      </div>
      <div className="mono ink-soft" style={{ fontSize: 11, letterSpacing: 2 }}>RANKING · 排行</div>
      <h1 className="display" style={{ fontSize: 36, margin: '4px 0 20px' }}>
        <span className="scribble-u">排行榜</span>
      </h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <Pill active={type === 'exp'} onClick={() => setType('exp')}>{TYPE_LABEL.exp}</Pill>
        <Pill active={type === 'score'} onClick={() => setType('score')}>{TYPE_LABEL.score}</Pill>
        <Pill active={type === 'streak'} onClick={() => setType('streak')}>{TYPE_LABEL.streak}</Pill>
      </div>

      {type === 'score' && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <Pill active={period === 'all'} onClick={() => setPeriod('all')}>近 30 天</Pill>
          <Pill active={period === 'week'} onClick={() => setPeriod('week')}>本周</Pill>
          <Pill active={period === 'month'} onClick={() => setPeriod('month')}>本月</Pill>
        </div>
      )}

      {data?.self && (
        <PaperCard style={{ marginBottom: 16, background: 'var(--accent-soft)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'baseline' }}>
            <span className="hand" style={{ fontWeight: 700, fontSize: 16 }}>
              当前排名：第 <span className="mono" style={{ fontSize: 22 }}>{data.self.rank}</span> 位
            </span>
            <span className="hand ink-soft">
              {TYPE_LABEL[type]} <span className="mono">{data.self.score}</span>{SCORE_SUFFIX[type]}
            </span>
            {data.gapToPrevious > 0 && (
              <span className="hand ink-soft">
                距上一名差 <span className="mono">{data.gapToPrevious}</span>{SCORE_SUFFIX[type]}
              </span>
            )}
          </div>
        </PaperCard>
      )}

      {loading && entries.length === 0 ? (
        <PaperCard><div className="hand ink-faint" style={{ padding: '12px 0' }}>加载中…</div></PaperCard>
      ) : entries.length === 0 ? (
        <PaperCard>
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div className="display" style={{ fontSize: 36, color: 'var(--ink-faint)' }}>暂无</div>
            <div className="hand ink-soft" style={{ marginTop: 6 }}>还没有好友，加几个一起比</div>
          </div>
        </PaperCard>
      ) : (
        <div>
          {entries.map((e) => (
            <PaperCard
              key={`${e.rank}-${e.nickname}`}
              style={{
                marginBottom: 10,
                padding: '14px 18px',
                background: e.isSelf ? 'var(--accent-soft)' : undefined,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div
                  className={e.rank <= 3 ? 'display' : 'mono'}
                  style={{
                    width: 44,
                    textAlign: 'center',
                    fontSize: e.rank <= 3 ? 28 : 18,
                    color: e.rank <= 3 ? 'var(--ink)' : 'var(--ink-soft)',
                  }}
                >
                  {e.rank}
                </div>
                <div style={{ flex: 1, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="hand" style={{ fontWeight: 700, fontSize: 15 }}>{e.nickname}</span>
                  <Chip color="var(--paper-2)">Lv {e.level}</Chip>
                  {e.isSelf && <Chip color="var(--accent-soft)">你</Chip>}
                </div>
                <span className="mono" style={{ fontSize: 18, fontWeight: 500 }}>
                  {e.score}{SCORE_SUFFIX[type]}
                </span>
              </div>
            </PaperCard>
          ))}
        </div>
      )}

      <p className="hand ink-soft" style={{ fontSize: 12, marginTop: 16 }}>
        {type === 'score'
          ? `周期：${effectivePeriod === 'all' ? '近 30 天' : effectivePeriod === 'week' ? '本周' : '本月'}平均饮食评分`
          : type === 'exp'
          ? '经验值榜按累计总经验排名'
          : '连续记录天数榜，包括你和好友'}
      </p>
    </div>
  );
}
