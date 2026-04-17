import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Appbar, Card, Chip, SegmentedButtons, Text } from 'react-native-paper';
import dayjs, { Dayjs } from 'dayjs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { getMonthly, getWeekly, type PeriodReport } from '../../api/reports';

type Props = NativeStackScreenProps<RootStackParamList, 'Reports'>;

export default function ReportsScreen({ navigation }: Props) {
  const [tab, setTab] = useState<'weekly' | 'monthly'>('weekly');
  const [anchor, setAnchor] = useState<Dayjs>(dayjs());
  const [report, setReport] = useState<PeriodReport | null>(null);

  const load = useCallback(async () => {
    if (tab === 'weekly') {
      setReport(await getWeekly(anchor.startOf('week').format('YYYY-MM-DD')));
    } else {
      setReport(await getMonthly(anchor.format('YYYY-MM')));
    }
  }, [tab, anchor]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Action icon="chevron-left" onPress={() => setAnchor(anchor.subtract(1, tab === 'weekly' ? 'week' : 'month'))} />
        <Appbar.Content title={tab === 'weekly' ? `周报 ${report?.startDate}` : `月报 ${anchor.format('YYYY-MM')}`} />
        <Appbar.Action icon="chevron-right" onPress={() => setAnchor(anchor.add(1, tab === 'weekly' ? 'week' : 'month'))} />
      </Appbar.Header>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <SegmentedButtons
          value={tab}
          onValueChange={(v) => setTab(v as 'weekly' | 'monthly')}
          buttons={[
            { value: 'weekly', label: '周报' },
            { value: 'monthly', label: '月报' },
          ]}
          style={{ marginBottom: 12 }}
        />
        {report?.conclusion && (
          <Card style={{ marginBottom: 12, backgroundColor: '#e6f4ff' }}>
            <Card.Content>
              <Text>{report.conclusion}</Text>
            </Card.Content>
          </Card>
        )}
        <Card style={{ marginBottom: 12 }}>
          <Card.Title title="饮食" />
          <Card.Content>
            <Row label="记录天数" value={`${report?.daysWithRecords ?? 0} 天`} />
            <Row
              label="日均热量"
              value={report?.avgCalories != null ? `${report.avgCalories.toFixed(0)} kcal` : '-'}
            />
            <Row
              label="日均缺口/盈余"
              value={report?.avgCalorieGap != null ? `${report.avgCalorieGap.toFixed(0)} kcal` : '-'}
            />
            <Row
              label="日均评分"
              value={report?.avgDietScore != null ? `${report.avgDietScore.toFixed(1)} / 100` : '-'}
            />
            {report?.bestDate && (
              <View style={{ flexDirection: 'row', marginTop: 4 }}>
                <Chip compact style={{ marginRight: 6, backgroundColor: '#f6ffed' }}>
                  最佳 {report.bestDate}
                </Chip>
                {report.worstDate && report.worstDate !== report.bestDate && (
                  <Chip compact style={{ backgroundColor: '#fff2e8' }}>
                    待改进 {report.worstDate}
                  </Chip>
                )}
              </View>
            )}
          </Card.Content>
        </Card>
        <Card style={{ marginBottom: 12 }}>
          <Card.Title title="体重体脂" />
          <Card.Content>
            <Row
              label="体重"
              value={
                report?.weightStart != null && report?.weightEnd != null
                  ? `${report.weightStart} → ${report.weightEnd} kg  (${(report.weightChange ?? 0).toFixed(1)})`
                  : '-'
              }
            />
            <Row
              label="体脂"
              value={
                report?.bodyFatStart != null && report?.bodyFatEnd != null
                  ? `${report.bodyFatStart} → ${report.bodyFatEnd}%  (${(report.bodyFatChange ?? 0).toFixed(1)})`
                  : '-'
              }
            />
          </Card.Content>
        </Card>
        <Card>
          <Card.Title title="力量训练" />
          <Card.Content>
            <Row label="训练天数" value={`${report?.strengthTrainingDays ?? 0} 天`} />
            <Row label="总组数" value={`${report?.strengthTotalSets ?? 0}`} />
            <Row label="总次数" value={`${report?.strengthTotalReps ?? 0}`} />
            <Row
              label="总容量"
              value={report?.strengthTotalVolume != null ? `${report.strengthTotalVolume.toFixed(0)} kg` : '-'}
            />
          </Card.Content>
        </Card>
      </ScrollView>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
      <Text variant="bodyMedium">{label}</Text>
      <Text variant="bodyMedium">{value}</Text>
    </View>
  );
}
