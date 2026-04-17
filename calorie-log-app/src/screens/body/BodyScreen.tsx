import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { Appbar, Button, Card, Dialog, IconButton, Portal, Text, TextInput } from 'react-native-paper';
import dayjs from 'dayjs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { deleteBodyRecord, getBodyTrend, saveBodyRecord, type BodyTrend } from '../../api/body';

type Props = NativeStackScreenProps<RootStackParamList, 'Body'>;

export default function BodyScreen({ navigation }: Props) {
  const [trend, setTrend] = useState<BodyTrend | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');

  const load = useCallback(async () => {
    const d = await getBodyTrend(
      dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
      dayjs().format('YYYY-MM-DD')
    );
    setTrend(d);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onSave = async () => {
    const w = weight ? Number(weight) : undefined;
    const f = bodyFat ? Number(bodyFat) : undefined;
    if (!w && !f) {
      Alert.alert('请至少填写体重或体脂');
      return;
    }
    try {
      await saveBodyRecord({ recordDate: dayjs().format('YYYY-MM-DD'), weight: w, bodyFat: f });
      setDialogOpen(false);
      setWeight('');
      setBodyFat('');
      load();
    } catch (e: any) {
      Alert.alert('保存失败', e.message);
    }
  };

  const onDelete = (id: number) => {
    Alert.alert('删除记录？', '', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          await deleteBodyRecord(id);
          load();
        },
      },
    ]);
  };

  return (
    <>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="体重体脂" />
        <Appbar.Action icon="plus" onPress={() => setDialogOpen(true)} />
      </Appbar.Header>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Card style={{ marginBottom: 12 }}>
          <Card.Content>
            <Text variant="bodyMedium">
              近 30 天体重变化：{trend?.weightChange != null ? trend.weightChange.toFixed(1) + ' kg' : '-'}
            </Text>
            <Text variant="bodyMedium">
              体脂变化：{trend?.bodyFatChange != null ? trend.bodyFatChange.toFixed(1) + '%' : '-'}
            </Text>
          </Card.Content>
        </Card>
        {(trend?.records ?? []).slice().reverse().map((r) => (
          <Card key={r.id} style={{ marginBottom: 8 }}>
            <Card.Content
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <View>
                <Text variant="titleMedium">{r.recordDate}</Text>
                <Text variant="bodySmall">
                  {r.weight != null ? `体重 ${r.weight} kg` : ''}
                  {r.weight != null && r.bodyFat != null ? '  ·  ' : ''}
                  {r.bodyFat != null ? `体脂 ${r.bodyFat}%` : ''}
                </Text>
              </View>
              <IconButton icon="delete" onPress={() => onDelete(r.id)} />
            </Card.Content>
          </Card>
        ))}
      </ScrollView>
      <Portal>
        <Dialog visible={dialogOpen} onDismiss={() => setDialogOpen(false)}>
          <Dialog.Title>今日体重体脂</Dialog.Title>
          <Dialog.Content>
            <TextInput label="体重 (kg)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" />
            <TextInput
              label="体脂率 (%)"
              value={bodyFat}
              onChangeText={setBodyFat}
              keyboardType="decimal-pad"
              style={{ marginTop: 8 }}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogOpen(false)}>取消</Button>
            <Button onPress={onSave}>保存</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}
