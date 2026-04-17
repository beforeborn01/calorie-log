import React, { useEffect, useState } from 'react';
import { ScrollView, View, Alert, FlatList } from 'react-native';
import { Button, Card, Dialog, Portal, Searchbar, Text, TextInput } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { searchFood } from '../../api/food';
import { createRecord } from '../../api/record';
import type { Food, MealType } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'AddFood'>;

const MEAL_LABELS: Record<MealType, string> = { 1: '早餐', 2: '午餐', 3: '晚餐', 4: '加餐' };

export default function AddFoodScreen({ navigation, route }: Props) {
  const { date, mealType } = route.params;
  const [keyword, setKeyword] = useState('');
  const [list, setList] = useState<Food[]>([]);
  const [selected, setSelected] = useState<Food | null>(null);
  const [quantity, setQuantity] = useState('100');
  const [manualOpen, setManualOpen] = useState(false);
  const [manual, setManual] = useState({ foodName: '', quantity: '100', calories: '', protein: '', carb: '', fat: '' });

  const doSearch = async () => {
    if (!keyword.trim()) return;
    try {
      const resp = await searchFood(keyword.trim());
      setList(resp.list || []);
    } catch (e: any) {
      Alert.alert('搜索失败', e.message);
    }
  };

  useEffect(() => {
    doSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConfirm = async () => {
    if (!selected) return;
    const q = Number(quantity);
    if (!q || q <= 0) {
      Alert.alert('请输入分量');
      return;
    }
    try {
      await createRecord({
        recordDate: date,
        mealType,
        foodId: selected.id,
        quantity: q,
        addMethod: 1,
      });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('添加失败', e.message);
    }
  };

  const handleManual = async () => {
    if (!manual.foodName || !manual.quantity || !manual.calories) {
      Alert.alert('请填写名称、分量、热量');
      return;
    }
    try {
      await createRecord({
        recordDate: date,
        mealType,
        foodName: manual.foodName,
        quantity: Number(manual.quantity),
        calories: Number(manual.calories),
        protein: manual.protein ? Number(manual.protein) : undefined,
        carbohydrate: manual.carb ? Number(manual.carb) : undefined,
        fat: manual.fat ? Number(manual.fat) : undefined,
        addMethod: 2,
      });
      setManualOpen(false);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('添加失败', e.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={{ marginBottom: 8 }}>{date} · {MEAL_LABELS[mealType]}</Text>
      <Searchbar placeholder="搜索食物" value={keyword} onChangeText={setKeyword} onSubmitEditing={doSearch} />
      <FlatList
        scrollEnabled={false}
        style={{ marginTop: 12 }}
        data={list}
        keyExtractor={(f) => String(f.id)}
        ListEmptyComponent={<Text>未找到，可手动添加</Text>}
        renderItem={({ item }) => (
          <Card style={{ marginBottom: 8 }} onPress={() => setSelected(item)}>
            <Card.Content>
              <Text variant="titleMedium">{item.name}</Text>
              <Text variant="bodySmall">
                每100g {Number(item.calories).toFixed(0)} kcal · 蛋白 {Number(item.protein || 0).toFixed(1)}g · 碳水 {Number(item.carbohydrate || 0).toFixed(1)}g · 脂肪 {Number(item.fat || 0).toFixed(1)}g
              </Text>
            </Card.Content>
          </Card>
        )}
      />
      <Button mode="outlined" onPress={() => setManualOpen(true)} style={{ marginTop: 12 }}>
        手动添加
      </Button>

      <Portal>
        <Dialog visible={!!selected} onDismiss={() => setSelected(null)}>
          <Dialog.Title>{selected?.name}</Dialog.Title>
          <Dialog.Content>
            <Text>每100g {Number(selected?.calories ?? 0).toFixed(0)} kcal</Text>
            <TextInput
              label="分量 (g)"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
              style={{ marginTop: 8 }}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setSelected(null)}>取消</Button>
            <Button onPress={handleConfirm}>添加</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={manualOpen} onDismiss={() => setManualOpen(false)}>
          <Dialog.Title>手动添加</Dialog.Title>
          <Dialog.Content>
            <TextInput label="食物名称" value={manual.foodName} onChangeText={(v) => setManual({ ...manual, foodName: v })} />
            <TextInput label="分量 (g)" value={manual.quantity} onChangeText={(v) => setManual({ ...manual, quantity: v })} keyboardType="numeric" />
            <TextInput label="热量 (kcal)" value={manual.calories} onChangeText={(v) => setManual({ ...manual, calories: v })} keyboardType="numeric" />
            <TextInput label="蛋白 (g)" value={manual.protein} onChangeText={(v) => setManual({ ...manual, protein: v })} keyboardType="numeric" />
            <TextInput label="碳水 (g)" value={manual.carb} onChangeText={(v) => setManual({ ...manual, carb: v })} keyboardType="numeric" />
            <TextInput label="脂肪 (g)" value={manual.fat} onChangeText={(v) => setManual({ ...manual, fat: v })} keyboardType="numeric" />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setManualOpen(false)}>取消</Button>
            <Button onPress={handleManual}>确认</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
}
