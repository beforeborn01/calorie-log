import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, View, Alert } from 'react-native';
import { Appbar, Button, Card, IconButton, ProgressBar, Text } from 'react-native-paper';
import dayjs, { Dayjs } from 'dayjs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { deleteRecord, getDailyRecords, updateRecord } from '../../api/record';
import { getExperience, type Experience } from '../../api/social';
import type { DailyRecords, DietRecord, MealType } from '../../types';
import { useFocusEffect } from '@react-navigation/native';

const MEAL_LABELS: Record<MealType, string> = { 1: '早餐', 2: '午餐', 3: '晚餐', 4: '加餐' };

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const [date, setDate] = useState<Dayjs>(dayjs());
  const [daily, setDaily] = useState<DailyRecords | null>(null);
  const [exp, setExp] = useState<Experience | null>(null);
  const dateStr = date.format('YYYY-MM-DD');

  const load = useCallback(async () => {
    try {
      const d = await getDailyRecords(dateStr);
      setDaily(d);
    } catch (e: any) {
      Alert.alert('加载失败', e.message);
    }
  }, [dateStr]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    getExperience().then(setExp).catch(() => undefined);
  }, [dateStr]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const caloriesPct = useMemo(() => {
    if (!daily || !daily.targetCalories) return 0;
    return Math.min(1, daily.totalCalories / daily.targetCalories);
  }, [daily]);

  const handleDelete = (record: DietRecord) => {
    Alert.alert('删除此记录？', record.foodName, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          await deleteRecord(record.id);
          load();
        },
      },
    ]);
  };

  const handleEdit = (record: DietRecord) => {
    Alert.prompt(
      `编辑 ${record.foodName}`,
      '新的分量 (g)',
      async (text) => {
        const q = Number(text);
        if (!q || q <= 0) return;
        try {
          await updateRecord(record.id, { quantity: q });
          load();
        } catch (e: any) {
          Alert.alert('保存失败', e.message);
        }
      },
      'plain-text',
      String(record.quantity)
    );
  };

  const renderMeal = (list: DietRecord[] | undefined, type: MealType) => (
    <Card key={type} style={{ marginBottom: 12 }}>
      <Card.Title
        title={MEAL_LABELS[type]}
        right={(props) => (
          <Button
            {...props}
            onPress={() =>
              navigation.navigate('AddFood', { date: dateStr, mealType: type })
            }
          >
            添加
          </Button>
        )}
      />
      <Card.Content>
        {(list ?? []).length === 0 && <Text>暂无记录</Text>}
        {(list ?? []).map((r) => (
          <View
            key={r.id}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }}
          >
            <View style={{ flex: 1 }}>
              <Text variant="bodyMedium">{r.foodName}</Text>
              <Text variant="bodySmall">
                {Number(r.quantity).toFixed(0)} g · {Number(r.calories).toFixed(0)} kcal
              </Text>
            </View>
            <IconButton icon="pencil" onPress={() => handleEdit(r)} />
            <IconButton icon="delete" onPress={() => handleDelete(r)} />
          </View>
        ))}
      </Card.Content>
    </Card>
  );

  return (
    <>
      <Appbar.Header>
        <Appbar.Action icon="chevron-left" onPress={() => setDate(date.subtract(1, 'day'))} />
        <Appbar.Content title={dateStr} />
        <Appbar.Action icon="chevron-right" onPress={() => setDate(date.add(1, 'day'))} />
        <Appbar.Action icon="target" onPress={() => navigation.navigate('GoalSetup')} />
        <Appbar.Action icon="chart-bar" onPress={() => navigation.navigate('Statistics')} />
        <Appbar.Action icon="heart-pulse" onPress={() => navigation.navigate('Body')} />
        <Appbar.Action icon="dumbbell" onPress={() => navigation.navigate('Strength')} />
        <Appbar.Action icon="calendar-clock" onPress={() => navigation.navigate('Reports')} />
        <Appbar.Action icon="account-multiple" onPress={() => navigation.navigate('Friends')} />
        <Appbar.Action icon="trophy" onPress={() => navigation.navigate('Ranking')} />
        <Appbar.Action icon="camera" onPress={() => navigation.navigate('Recognize')} />
        <Appbar.Action icon="silverware-fork-knife" onPress={() => navigation.navigate('Cooking')} />
        <Appbar.Action icon="cog" onPress={() => navigation.navigate('Settings')} />
        <Appbar.Action icon="account" onPress={() => navigation.navigate('Profile')} />
      </Appbar.Header>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {exp && (
          <Card style={{ marginBottom: 12 }}>
            <Card.Content>
              <Text variant="bodyMedium">
                Lv{exp.level} · {exp.totalExp}/{exp.nextLevelExp} exp · 连续 {exp.continuousDays} 天
              </Text>
              <ProgressBar progress={Number(exp.levelProgress)} style={{ marginTop: 6 }} />
            </Card.Content>
          </Card>
        )}
        <Card style={{ marginBottom: 12 }}>
          <Card.Content>
            <Text variant="titleMedium">
              热量 {Number(daily?.totalCalories ?? 0).toFixed(0)} / {Number(daily?.targetCalories ?? 2000).toFixed(0)} kcal
            </Text>
            <ProgressBar progress={caloriesPct} style={{ marginVertical: 8, height: 8 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
              <Macro label="蛋白质" value={daily?.totalProtein} />
              <Macro label="碳水" value={daily?.totalCarb} />
              <Macro label="脂肪" value={daily?.totalFat} />
            </View>
          </Card.Content>
        </Card>
        {renderMeal(daily?.breakfast, 1)}
        {renderMeal(daily?.lunch, 2)}
        {renderMeal(daily?.dinner, 3)}
        {renderMeal(daily?.snacks, 4)}
      </ScrollView>
    </>
  );
}

function Macro({ label, value }: { label: string; value?: number }) {
  return (
    <View>
      <Text variant="bodySmall">{label}</Text>
      <Text variant="titleMedium">{value != null ? Number(value).toFixed(1) : '-'} g</Text>
    </View>
  );
}
