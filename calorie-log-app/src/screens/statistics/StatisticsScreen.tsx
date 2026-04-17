import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Appbar, Card, Chip, ProgressBar, Text } from 'react-native-paper';
import dayjs, { Dayjs } from 'dayjs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import {
  getDailyStatistics,
  getDietScore,
  getDietSuggestions,
  type DailyStatistics,
  type DietScore,
  type DietSuggestions,
} from '../../api/statistics';

type Props = NativeStackScreenProps<RootStackParamList, 'Statistics'>;

const STATUS_COLOR: Record<string, string> = {
  balanced: '#52c41a',
  surplus: '#faad14',
  deficit: '#f5222d',
  unknown: '#8c8c8c',
};

const SEVERITY_COLOR: Record<string, string> = {
  critical: '#f5222d',
  warn: '#faad14',
  info: '#1677ff',
};

export default function StatisticsScreen({ navigation }: Props) {
  const [date, setDate] = useState<Dayjs>(dayjs());
  const [daily, setDaily] = useState<DailyStatistics | null>(null);
  const [score, setScore] = useState<DietScore | null>(null);
  const [suggestions, setSuggestions] = useState<DietSuggestions | null>(null);

  const dateStr = date.format('YYYY-MM-DD');

  useEffect(() => {
    let cancelled = false;
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
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [dateStr]);

  return (
    <>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Action icon="chevron-left" onPress={() => setDate(date.subtract(1, 'day'))} />
        <Appbar.Content title={dateStr} />
        <Appbar.Action icon="chevron-right" onPress={() => setDate(date.add(1, 'day'))} />
      </Appbar.Header>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {daily && (
          <Card style={{ marginBottom: 12 }}>
            <Card.Content>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
                {daily.dayType != null && (
                  <Chip style={{ marginRight: 8 }} compact>
                    {daily.dayType === 1 ? '训练日' : '休息日'}
                  </Chip>
                )}
                <Chip
                  style={{ backgroundColor: STATUS_COLOR[daily.calorieStatus] + '22' }}
                  textStyle={{ color: STATUS_COLOR[daily.calorieStatus] }}
                  compact
                >
                  {daily.statusHint}
                </Chip>
              </View>
              <Text variant="bodyMedium">
                摄入 {Number(daily.totalCalories).toFixed(0)} / 目标 {daily.targetCalories ? Number(daily.targetCalories).toFixed(0) : '-'} kcal
              </Text>
              {daily.tdee != null && (
                <Text variant="bodySmall">TDEE: {Number(daily.tdee).toFixed(0)} kcal</Text>
              )}
              {daily.calorieGap != null && (
                <Text
                  variant="bodySmall"
                  style={{ color: daily.calorieGap > 0 ? '#cf1322' : '#3f8600' }}
                >
                  {daily.calorieGap > 0 ? '盈余' : '缺口'} {Math.abs(Number(daily.calorieGap)).toFixed(0)} kcal
                </Text>
              )}
            </Card.Content>
          </Card>
        )}

        {score && (
          <Card style={{ marginBottom: 12 }}>
            <Card.Title title={`饮食评分 ${Number(score.totalScore).toFixed(0)} / 100`} />
            <Card.Content>
              <ScoreBar label="热量达标" value={Number(score.calorieScore)} max={30} />
              <ScoreBar label="营养素合规" value={Number(score.nutrientScore)} max={35} />
              <ScoreBar label="餐次分配" value={Number(score.mealDistributionScore)} max={20} />
              <ScoreBar label="食物多样性" value={Number(score.varietyScore)} max={15} />
              <Text variant="bodySmall" style={{ marginTop: 8 }}>
                今日食物种类：{score.varietyCount} 种
              </Text>
            </Card.Content>
          </Card>
        )}

        {suggestions && suggestions.suggestions.length > 0 && (
          <Card>
            <Card.Title title="优化建议" />
            <Card.Content>
              {suggestions.suggestions.map((s, idx) => (
                <View key={idx} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Chip
                      style={{ backgroundColor: SEVERITY_COLOR[s.severity] + '22', marginRight: 6 }}
                      textStyle={{ color: SEVERITY_COLOR[s.severity] }}
                      compact
                    >
                      {s.title}
                    </Chip>
                  </View>
                  <Text variant="bodySmall">{s.detail}</Text>
                  {s.recommendedFoods && s.recommendedFoods.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
                      {s.recommendedFoods.map((f) => (
                        <Chip key={f} compact style={{ marginRight: 4, marginBottom: 4 }}>
                          {f}
                        </Chip>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </Card.Content>
          </Card>
        )}

        {suggestions && suggestions.suggestions.length === 0 && (
          <Card>
            <Card.Content>
              <Text>今日表现很棒！没有发现需要优化的点。</Text>
            </Card.Content>
          </Card>
        )}
      </ScrollView>
    </>
  );
}

function ScoreBar({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <View style={{ marginBottom: 8 }}>
      <Text variant="bodySmall">
        {label}: {value.toFixed(1)} / {max}
      </Text>
      <ProgressBar progress={value / max} style={{ marginTop: 4, height: 6 }} />
    </View>
  );
}
