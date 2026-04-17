import React, { useEffect, useState } from 'react';
import { ScrollView, View, Alert } from 'react-native';
import { Button, Card, Checkbox, SegmentedButtons, Text, TextInput } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { getCurrentGoal, getTrainingSchedule, saveTrainingSchedule, setGoal, type Goal } from '../../api/goal';

type Props = NativeStackScreenProps<RootStackParamList, 'GoalSetup'>;

const WEEKDAYS = [
  { key: 1, label: '一' }, { key: 2, label: '二' }, { key: 3, label: '三' },
  { key: 4, label: '四' }, { key: 5, label: '五' }, { key: 6, label: '六' }, { key: 7, label: '日' },
];

export default function GoalSetupScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [goalType, setGoalType] = useState<1 | 2>(1);
  const [goal, setGoalState] = useState<Goal | null>(null);
  const [weekdays, setWeekdays] = useState<number[]>([1, 3, 5]);
  const [intensity, setIntensity] = useState<1 | 2 | 3>(2);
  const [targetTraining, setTargetTraining] = useState('');
  const [targetRest, setTargetRest] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const g = await getCurrentGoal().catch(() => null);
        if (g) {
          setGoalState(g);
          setGoalType(g.goalType);
          setTargetTraining(String(Math.round(g.targetCaloriesTraining)));
          setTargetRest(String(Math.round(g.targetCaloriesRest)));
        }
        const s = await getTrainingSchedule().catch(() => null);
        if (s) {
          setWeekdays(s.trainingWeekdays ?? []);
          setIntensity((s.defaultIntensity || 2) as 1 | 2 | 3);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleWeekday = (d: number) => {
    setWeekdays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const g = await setGoal({
        goalType,
        targetCaloriesTraining: targetTraining ? Number(targetTraining) : undefined,
        targetCaloriesRest: targetRest ? Number(targetRest) : undefined,
      });
      await saveTrainingSchedule({ trainingWeekdays: weekdays, defaultIntensity: intensity });
      setGoalState(g);
      Alert.alert('已保存');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('保存失败', e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text variant="headlineSmall" style={{ marginBottom: 12 }}>设置健身目标</Text>
      <SegmentedButtons
        value={String(goalType)}
        onValueChange={(v) => setGoalType(Number(v) as 1 | 2)}
        buttons={[
          { value: '1', label: '增肌塑型' },
          { value: '2', label: '减脂增肌' },
        ]}
        style={{ marginBottom: 12 }}
      />
      {goal && (
        <Card style={{ marginBottom: 12 }}>
          <Card.Content>
            <Text>BMR: {Number(goal.bmr).toFixed(0)} kcal</Text>
            <Text>基础 TDEE: {Number(goal.tdeeBase).toFixed(0)} kcal</Text>
            <Text>训练日目标: {Number(goal.targetCaloriesTraining).toFixed(0)} kcal</Text>
            <Text>休息日目标: {Number(goal.targetCaloriesRest).toFixed(0)} kcal</Text>
            <Text>蛋白/碳水/脂肪: {goal.proteinRatio}% / {goal.carbRatio}% / {goal.fatRatio}%</Text>
          </Card.Content>
        </Card>
      )}
      <TextInput
        label="训练日目标热量 (kcal)"
        value={targetTraining}
        onChangeText={setTargetTraining}
        keyboardType="numeric"
        style={{ marginBottom: 8 }}
      />
      <TextInput
        label="休息日目标热量 (kcal)"
        value={targetRest}
        onChangeText={setTargetRest}
        keyboardType="numeric"
        style={{ marginBottom: 12 }}
      />
      <Text style={{ marginBottom: 4 }}>每周训练日</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
        {WEEKDAYS.map((d) => (
          <View key={d.key} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
            <Checkbox
              status={weekdays.includes(d.key) ? 'checked' : 'unchecked'}
              onPress={() => toggleWeekday(d.key)}
            />
            <Text>{d.label}</Text>
          </View>
        ))}
      </View>
      <Text style={{ marginBottom: 4 }}>默认训练强度</Text>
      <SegmentedButtons
        value={String(intensity)}
        onValueChange={(v) => setIntensity(Number(v) as 1 | 2 | 3)}
        buttons={[
          { value: '1', label: '低' },
          { value: '2', label: '中' },
          { value: '3', label: '高' },
        ]}
        style={{ marginBottom: 16 }}
      />
      <Button mode="contained" onPress={handleSave} loading={saving} disabled={saving}>
        保存
      </Button>
    </ScrollView>
  );
}
