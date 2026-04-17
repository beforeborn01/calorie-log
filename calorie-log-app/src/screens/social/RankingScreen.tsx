import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Appbar, Card, Chip, SegmentedButtons, Text } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { getRanking, type RankingResponse } from '../../api/social';

type Props = NativeStackScreenProps<RootStackParamList, 'Ranking'>;

type RankType = 'exp' | 'score' | 'streak';
type PeriodType = 'all' | 'week' | 'month';

const TYPE_LABEL: Record<RankType, string> = {
  exp: '经验值',
  score: '饮食评分',
  streak: '连续天数',
};

const SUFFIX: Record<RankType, string> = {
  exp: ' exp',
  score: ' 分',
  streak: ' 天',
};

export default function RankingScreen({ navigation }: Props) {
  const [type, setType] = useState<RankType>('exp');
  const [period, setPeriod] = useState<PeriodType>('all');
  const [data, setData] = useState<RankingResponse | null>(null);

  const load = useCallback(async () => {
    setData(await getRanking(type, period));
  }, [type, period]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="排行榜" />
      </Appbar.Header>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <SegmentedButtons
          value={type}
          onValueChange={(v) => setType(v as RankType)}
          buttons={[
            { value: 'exp', label: '经验' },
            { value: 'score', label: '评分' },
            { value: 'streak', label: '连续' },
          ]}
          style={{ marginBottom: 12 }}
        />
        {type === 'score' && (
          <SegmentedButtons
            value={period}
            onValueChange={(v) => setPeriod(v as PeriodType)}
            buttons={[
              { value: 'all', label: '近30天' },
              { value: 'week', label: '本周' },
              { value: 'month', label: '本月' },
            ]}
            style={{ marginBottom: 12 }}
          />
        )}
        {data?.self && (
          <Card style={{ backgroundColor: '#e6f4ff', marginBottom: 12 }}>
            <Card.Content>
              <Text variant="bodyMedium">
                当前第 {data.self.rank} 名 · {TYPE_LABEL[type]} {data.self.score}
                {SUFFIX[type]}
              </Text>
              {data.gapToPrevious > 0 && (
                <Text variant="bodySmall">
                  距上一名差 {data.gapToPrevious}
                  {SUFFIX[type]}
                </Text>
              )}
            </Card.Content>
          </Card>
        )}
        <Card>
          <Card.Content>
            {(data?.entries ?? []).length === 0 && <Text>还没有数据，快加几个好友</Text>}
            {(data?.entries ?? []).map((e) => (
              <View
                key={e.userId}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 8,
                  backgroundColor: e.isSelf ? '#e6f4ff' : undefined,
                  paddingHorizontal: 8,
                  borderRadius: 6,
                  marginBottom: 4,
                }}
              >
                <Text
                  style={{
                    width: 28,
                    fontWeight: '700',
                    fontSize: e.rank <= 3 ? 20 : 14,
                    color: e.rank === 1 ? '#faad14' : e.rank === 2 ? '#bfbfbf' : e.rank === 3 ? '#d46b08' : '#333',
                  }}
                >
                  {e.rank}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMedium" style={{ fontWeight: '600' }}>
                    {e.nickname} {e.isSelf && '(你)'}
                  </Text>
                  <Chip compact style={{ alignSelf: 'flex-start', marginTop: 4 }}>
                    Lv{e.level}
                  </Chip>
                </View>
                <Text variant="bodyMedium" style={{ fontWeight: '700' }}>
                  {e.score}
                  {SUFFIX[type]}
                </Text>
              </View>
            ))}
          </Card.Content>
        </Card>
      </ScrollView>
    </>
  );
}
