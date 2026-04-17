import React, { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import {
  Appbar,
  Button,
  Card,
  Chip,
  Divider,
  SegmentedButtons,
  Text,
  TextInput,
} from 'react-native-paper';
import dayjs from 'dayjs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { recognizeFood, type RecognizeResponse } from '../../api/ai';
import { createRecord } from '../../api/record';

type Props = NativeStackScreenProps<RootStackParamList, 'Recognize'>;

/**
 * RN 端的拍照识别屏幕。真实相机 / 图库集成需引入 react-native-image-picker，
 * 当前版本先提供"粘贴 base64"与"使用内置 mock 图"两种方式，保持主流程可演示。
 */
export default function RecognizeScreen({ navigation }: Props) {
  const [mealType, setMealType] = useState<1 | 2 | 3 | 4>(1);
  const [base64, setBase64] = useState('');
  const [result, setResult] = useState<RecognizeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [quantities, setQuantities] = useState<Record<number, string>>({});

  const onRecognize = async (payload: string) => {
    if (!payload.trim()) {
      Alert.alert('请粘贴图片 base64 或使用示例');
      return;
    }
    setLoading(true);
    try {
      setResult(await recognizeFood(payload.replace(/^data:[^,]+,/, '')));
    } catch (e: any) {
      Alert.alert('识别失败', e.message);
    } finally {
      setLoading(false);
    }
  };

  const onUseSample = () => {
    // 极小的 PNG base64（单像素），足够触发 mock 识别逻辑
    const sample =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    setBase64(sample);
    onRecognize(sample);
  };

  const onAdd = async (idx: number) => {
    const c = result!.candidates[idx];
    const qty = Number(quantities[idx] ?? '100');
    if (!qty || qty <= 0) {
      Alert.alert('请输入有效分量 (g)');
      return;
    }
    try {
      await createRecord({
        recordDate: dayjs().format('YYYY-MM-DD'),
        mealType,
        foodId: c.foodId ?? undefined,
        foodName: c.foodId ? undefined : c.name,
        quantity: qty,
        calories: c.foodId ? undefined : 150,
        addMethod: 3,
      });
      Alert.alert('已添加', `${c.name} ${qty}g`);
    } catch (e: any) {
      Alert.alert('添加失败', e.message);
    }
  };

  return (
    <>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="拍照识别食物" />
      </Appbar.Header>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <SegmentedButtons
          value={String(mealType)}
          onValueChange={(v) => setMealType(Number(v) as 1 | 2 | 3 | 4)}
          buttons={[
            { value: '1', label: '早餐' },
            { value: '2', label: '午餐' },
            { value: '3', label: '晚餐' },
            { value: '4', label: '加餐' },
          ]}
          style={{ marginBottom: 12 }}
        />
        <Card style={{ marginBottom: 12 }}>
          <Card.Content>
            <Text variant="bodySmall" style={{ marginBottom: 6 }}>
              当前 RN 版本未集成相机 / 相册（需要 react-native-image-picker），
              先提供 base64 粘贴与示例图两种入口验证主流程。
            </Text>
            <TextInput
              multiline
              mode="outlined"
              label="图片 base64（可选，最大 2MB）"
              value={base64}
              onChangeText={setBase64}
              numberOfLines={3}
              style={{ marginBottom: 8 }}
            />
            <View style={{ flexDirection: 'row' }}>
              <Button
                mode="contained"
                loading={loading}
                disabled={loading}
                onPress={() => onRecognize(base64)}
                style={{ marginRight: 8 }}
              >
                识别
              </Button>
              <Button mode="outlined" onPress={onUseSample}>
                使用示例图
              </Button>
            </View>
          </Card.Content>
        </Card>

        {result && (
          <Card>
            <Card.Title
              title={`识别结果（${result.candidates.length} 项）`}
              subtitle={result.mocked ? 'Mock 数据（未配置百度 AI key）' : '百度 AI 菜品识别'}
            />
            <Card.Content>
              {result.candidates.length === 0 && <Text>未识别到食物</Text>}
              {result.candidates.map((c, idx) => (
                <View key={c.name}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyLarge" style={{ fontWeight: '600' }}>
                        {c.name}
                      </Text>
                      <View style={{ flexDirection: 'row', marginTop: 2 }}>
                        <Chip compact>{Math.round(c.probability * 100)}%</Chip>
                        <Chip
                          compact
                          style={{ marginLeft: 6 }}
                          mode={c.foodId ? 'flat' : 'outlined'}
                        >
                          {c.foodId ? '已匹配食物库' : '需手动录入'}
                        </Chip>
                      </View>
                      {c.caloriesPer100g != null && (
                        <Text variant="bodySmall" style={{ marginTop: 2 }}>
                          {Number(c.caloriesPer100g).toFixed(0)} kcal / 100g · {c.category ?? '-'}
                        </Text>
                      )}
                    </View>
                    <TextInput
                      mode="outlined"
                      dense
                      label="分量 g"
                      value={quantities[idx] ?? '100'}
                      onChangeText={(v) => setQuantities({ ...quantities, [idx]: v })}
                      keyboardType="number-pad"
                      style={{ width: 90, marginRight: 8 }}
                    />
                    <Button mode="contained" onPress={() => onAdd(idx)}>
                      加入
                    </Button>
                  </View>
                  <Divider />
                </View>
              ))}
            </Card.Content>
          </Card>
        )}
      </ScrollView>
    </>
  );
}
