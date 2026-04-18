import { useEffect, useState } from 'react';
import { Alert, Card, DatePicker, Space, Statistic, Tabs, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
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
import { getMonthly, getWeekly, type PeriodReport } from '../../api/reports';
import { chartTheme, tooltipStyle, axisStyle } from '../../components/ChartTheme';

export default function ReportsPage() {
  const [tab, setTab] = useState<'weekly' | 'monthly'>('weekly');
  const [weekStart, setWeekStart] = useState<Dayjs>(dayjs().startOf('week'));
  const [month, setMonth] = useState<Dayjs>(dayjs().startOf('month'));
  const [report, setReport] = useState<PeriodReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const p =
      tab === 'weekly'
        ? getWeekly(weekStart.format('YYYY-MM-DD'))
        : getMonthly(month.format('YYYY-MM'));
    p.then((d) => !cancelled && setReport(d))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [tab, weekStart, month]);

  return (
    <div style={{ padding: 24, maxWidth: 820, margin: '0 auto' }}>
      <Space style={{ marginBottom: 16 }}>
        <Link to="/">
          <ArrowLeftOutlined /> 返回首页
        </Link>
      </Space>
      <Tabs
        activeKey={tab}
        onChange={(k) => setTab(k as 'weekly' | 'monthly')}
        items={[
          { key: 'weekly', label: '周报' },
          { key: 'monthly', label: '月报' },
        ]}
      />
      <Space style={{ marginBottom: 16 }}>
        {tab === 'weekly' ? (
          <DatePicker
            value={weekStart}
            picker="week"
            onChange={(d) => d && setWeekStart(d.startOf('week'))}
          />
        ) : (
          <DatePicker value={month} picker="month" onChange={(d) => d && setMonth(d)} />
        )}
      </Space>

      {report && report.conclusion && (
        <Alert type="info" showIcon message={report.conclusion} style={{ marginBottom: 16 }} />
      )}

      <Card loading={loading} title="饮食" style={{ marginBottom: 16 }}>
        <Space size="large" wrap>
          <Statistic title="记录天数" value={report?.daysWithRecords ?? 0} suffix="天" />
          <Statistic
            title="日均热量"
            value={report?.avgCalories ?? '-'}
            precision={0}
            suffix="kcal"
          />
          <Statistic
            title="日均缺口/盈余"
            value={report?.avgCalorieGap ?? '-'}
            precision={0}
            suffix="kcal"
          />
          <Statistic
            title="日均评分"
            value={report?.avgDietScore ?? '-'}
            precision={1}
            suffix="/100"
          />
        </Space>
        {report?.bestDate && (
          <Typography.Paragraph type="secondary" style={{ marginTop: 12 }}>
            最佳：{report.bestDate} · {report.bestDietScore?.toFixed(1)} 分
            {report.worstDate && report.worstDate !== report.bestDate && (
              <>
                　　待改进：{report.worstDate} · {report.worstDietScore?.toFixed(1)} 分
              </>
            )}
          </Typography.Paragraph>
        )}

        {report && report.dailyPoints && report.dailyPoints.length > 1 && (
          <div style={{ height: 260, marginTop: 16 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={report.dailyPoints.map((p) => ({
                  date: p.date.slice(5),
                  calories: p.calories,
                  dietScore: p.dietScore,
                }))}
                margin={{ top: 8, right: 16, left: -8, bottom: 0 }}
              >
                <CartesianGrid stroke={chartTheme.grid} vertical={false} />
                <XAxis dataKey="date" tick={axisStyle} tickLine={false} axisLine={false} />
                <YAxis
                  yAxisId="cal"
                  tick={axisStyle}
                  tickLine={false}
                  axisLine={false}
                  width={46}
                />
                <YAxis
                  yAxisId="score"
                  orientation="right"
                  domain={[0, 100]}
                  tick={axisStyle}
                  tickLine={false}
                  axisLine={false}
                  width={30}
                />
                <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: chartTheme.grid }} />
                <Line
                  yAxisId="cal"
                  type="monotone"
                  dataKey="calories"
                  name="热量 kcal"
                  stroke={chartTheme.primary}
                  strokeWidth={2}
                  dot={{ r: 3, fill: chartTheme.primary, strokeWidth: 0 }}
                  connectNulls
                />
                <Line
                  yAxisId="score"
                  type="monotone"
                  dataKey="dietScore"
                  name="评分"
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
      </Card>

      <Card title="体重体脂" style={{ marginBottom: 16 }}>
        <Space size="large" wrap>
          <Statistic
            title="体重变化"
            value={report?.weightChange ?? '-'}
            suffix="kg"
            valueStyle={{ color: '#1d1d1f', fontWeight: 600 }}
          />
          <Statistic
            title="体脂变化"
            value={report?.bodyFatChange ?? '-'}
            suffix="%"
            valueStyle={{ color: '#1d1d1f', fontWeight: 600 }}
          />
          <Statistic title="起始" value={`${report?.weightStart ?? '-'} kg`} />
          <Statistic title="终值" value={`${report?.weightEnd ?? '-'} kg`} />
        </Space>
      </Card>

      <Card title="力量训练">
        <Space size="large" wrap>
          <Statistic title="训练天数" value={report?.strengthTrainingDays ?? 0} suffix="天" />
          <Statistic title="总组数" value={report?.strengthTotalSets ?? 0} />
          <Statistic title="总次数" value={report?.strengthTotalReps ?? 0} />
          <Statistic
            title="总容量"
            value={report?.strengthTotalVolume ?? 0}
            precision={0}
            suffix="kg"
          />
        </Space>
      </Card>
    </div>
  );
}
