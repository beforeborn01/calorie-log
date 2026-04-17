import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import {
  Appbar,
  Button,
  Card,
  Chip,
  Dialog,
  IconButton,
  Menu,
  Portal,
  Text,
  TextInput,
} from 'react-native-paper';
import dayjs, { Dayjs } from 'dayjs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import {
  createStrengthRecord,
  deleteStrengthRecord,
  listExercises,
  listStrengthRecords,
  type Exercise,
  type StrengthRecord,
} from '../../api/strength';

type Props = NativeStackScreenProps<RootStackParamList, 'Strength'>;

export default function StrengthScreen({ navigation }: Props) {
  const [date, setDate] = useState<Dayjs>(dayjs());
  const [records, setRecords] = useState<StrengthRecord[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selected, setSelected] = useState<Exercise | null>(null);
  const [sets, setSets] = useState('4');
  const [reps, setReps] = useState('10');
  const [weight, setWeight] = useState('');
  const [note, setNote] = useState('');

  const dateStr = date.format('YYYY-MM-DD');

  const load = useCallback(async () => {
    try {
      const [r, e] = await Promise.all([listStrengthRecords(dateStr), listExercises()]);
      setRecords(r);
      setExercises(e);
    } catch (err: any) {
      Alert.alert('加载失败', err.message);
    }
  }, [dateStr]);

  useEffect(() => {
    load();
  }, [load]);

  const onAdd = async () => {
    if (!selected) {
      Alert.alert('请选择动作');
      return;
    }
    try {
      await createStrengthRecord({
        recordDate: dateStr,
        exerciseId: selected.id,
        sets: Number(sets),
        repsPerSet: Number(reps),
        weight: weight ? Number(weight) : undefined,
        note: note || undefined,
      });
      setAddOpen(false);
      setSelected(null);
      setWeight('');
      setNote('');
      load();
    } catch (e: any) {
      Alert.alert('无法记录', e.message);
    }
  };

  const onDelete = (id: number) => {
    Alert.alert('删除训练记录？', '', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          await deleteStrengthRecord(id);
          load();
        },
      },
    ]);
  };

  return (
    <>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Action icon="chevron-left" onPress={() => setDate(date.subtract(1, 'day'))} />
        <Appbar.Content title={`力量 · ${dateStr}`} />
        <Appbar.Action icon="chevron-right" onPress={() => setDate(date.add(1, 'day'))} />
        <Appbar.Action icon="plus" onPress={() => setAddOpen(true)} />
      </Appbar.Header>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {records.length === 0 && (
          <Card>
            <Card.Content>
              <Text>暂无训练记录</Text>
            </Card.Content>
          </Card>
        )}
        {records.map((r) => (
          <Card key={r.id} style={{ marginBottom: 8 }}>
            <Card.Content
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text variant="titleMedium">{r.exerciseName}</Text>
                  <Chip compact style={{ marginLeft: 8 }}>
                    {r.bodyPart}
                  </Chip>
                </View>
                <Text variant="bodySmall">
                  {r.sets} 组 × {r.repsPerSet} 次 @ {r.weight ?? 0} kg
                  {r.note ? `  ·  ${r.note}` : ''}
                </Text>
              </View>
              <IconButton icon="delete" onPress={() => onDelete(r.id)} />
            </Card.Content>
          </Card>
        ))}
      </ScrollView>

      <Portal>
        <Dialog visible={addOpen} onDismiss={() => setAddOpen(false)}>
          <Dialog.Title>添加训练</Dialog.Title>
          <Dialog.Content>
            <Menu
              visible={menuOpen}
              onDismiss={() => setMenuOpen(false)}
              anchor={
                <Button mode="outlined" onPress={() => setMenuOpen(true)}>
                  {selected ? `${selected.name} (${selected.bodyPart})` : '选择动作'}
                </Button>
              }
            >
              <ScrollView style={{ maxHeight: 300 }}>
                {exercises.slice(0, 40).map((e) => (
                  <Menu.Item
                    key={e.id}
                    title={`${e.name} · ${e.bodyPart}`}
                    onPress={() => {
                      setSelected(e);
                      setMenuOpen(false);
                    }}
                  />
                ))}
              </ScrollView>
            </Menu>
            <View style={{ flexDirection: 'row', marginTop: 8 }}>
              <TextInput label="组数" value={sets} onChangeText={setSets} keyboardType="number-pad" style={{ flex: 1, marginRight: 4 }} />
              <TextInput label="每组次数" value={reps} onChangeText={setReps} keyboardType="number-pad" style={{ flex: 1, marginHorizontal: 4 }} />
              <TextInput label="重量 kg" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" style={{ flex: 1, marginLeft: 4 }} />
            </View>
            <TextInput label="备注" value={note} onChangeText={setNote} style={{ marginTop: 8 }} />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setAddOpen(false)}>取消</Button>
            <Button onPress={onAdd}>保存</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}
