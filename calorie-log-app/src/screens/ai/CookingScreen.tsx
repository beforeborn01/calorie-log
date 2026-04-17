import React, { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import {
  Appbar,
  Button,
  Card,
  Chip,
  Divider,
  IconButton,
  Text,
  TextInput,
} from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import {
  addFavorite,
  getCookingSuggestions,
  type CookingMethod,
  type CookingSuggestionResponse,
} from '../../api/ai';

type Props = NativeStackScreenProps<RootStackParamList, 'Cooking'>;

const GOAL_LABEL: Record<string, string> = { bulk: '增肌', cut: '减脂', general: '均衡' };
const TAG_LABEL: Record<string, string> = { quick: '快手', low_oil: '低油', no_smoke: '无油烟' };

export default function CookingScreen({ navigation }: Props) {
  const [foodName, setFoodName] = useState('');
  const [prefs, setPrefs] = useState<Set<string>>(new Set());
  const [data, setData] = useState<CookingSuggestionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState<Set<string>>(new Set());

  const togglePref = (k: string) => {
    const next = new Set(prefs);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    setPrefs(next);
  };

  const onSubmit = async () => {
    if (!foodName.trim()) return;
    setLoading(true);
    try {
      setData(await getCookingSuggestions(foodName.trim(), Array.from(prefs).join(',')));
      setSaved(new Set());
    } catch (e: any) {
      Alert.alert('获取推荐失败', e.message);
    } finally {
      setLoading(false);
    }
  };

  const onSave = async (m: CookingMethod) => {
    if (!data) return;
    try {
      await addFavorite(data.foodName, m);
      setSaved(new Set([...saved, m.name]));
      Alert.alert('已收藏', m.name);
    } catch (e: any) {
      Alert.alert('收藏失败', e.message);
    }
  };

  return (
    <>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="烹饪方法推荐" />
        <Appbar.Action icon="heart" onPress={() => navigation.navigate('CookingFavorites')} />
      </Appbar.Header>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Card style={{ marginBottom: 12 }}>
          <Card.Content>
            <TextInput
              label="食材名称"
              value={foodName}
              onChangeText={setFoodName}
              onSubmitEditing={onSubmit}
              style={{ marginBottom: 8 }}
            />
            <View style={{ flexDirection: 'row', marginBottom: 8 }}>
              {(['quick', 'low_oil', 'no_smoke'] as const).map((k) => (
                <Chip
                  key={k}
                  selected={prefs.has(k)}
                  onPress={() => togglePref(k)}
                  style={{ marginRight: 6 }}
                >
                  {TAG_LABEL[k]}
                </Chip>
              ))}
            </View>
            <Button mode="contained" loading={loading} onPress={onSubmit}>
              生成推荐
            </Button>
          </Card.Content>
        </Card>

        {data && (
          <Card>
            <Card.Title
              title={`推荐 · 适配 ${GOAL_LABEL[data.goalType] ?? data.goalType}`}
              subtitle={data.llmGenerated ? 'LLM 生成' : '静态兜底'}
            />
            <Card.Content>
              {data.methods.length === 0 && <Text>暂无建议</Text>}
              {data.methods.map((m) => (
                <View key={m.name} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <Text variant="titleMedium">{m.name}</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
                        {m.fitGoals.map((g) => (
                          <Chip key={g} compact style={{ marginRight: 4, marginBottom: 4 }}>
                            {GOAL_LABEL[g] ?? g}
                          </Chip>
                        ))}
                        {m.tags.map((t) => (
                          <Chip key={t} compact style={{ marginRight: 4, marginBottom: 4 }}>
                            {TAG_LABEL[t] ?? t}
                          </Chip>
                        ))}
                      </View>
                    </View>
                    <IconButton
                      icon={saved.has(m.name) ? 'heart' : 'heart-outline'}
                      onPress={() => !saved.has(m.name) && onSave(m)}
                    />
                  </View>
                  <Text variant="bodySmall" style={{ marginTop: 4 }}>
                    {m.advantages}
                  </Text>
                  <Text variant="bodySmall" style={{ color: '#888', marginTop: 2 }}>
                    {Number(m.caloriesPer100g).toFixed(0)} kcal/100g · 用油 {Number(m.oilPerServingG).toFixed(1)}g ·{' '}
                    {m.durationMinutes} 分钟
                  </Text>
                  {m.steps.map((s, i) => (
                    <Text key={i} variant="bodySmall" style={{ marginTop: 2 }}>
                      {i + 1}. {s}
                    </Text>
                  ))}
                  <Divider style={{ marginTop: 8 }} />
                </View>
              ))}
            </Card.Content>
          </Card>
        )}
      </ScrollView>
    </>
  );
}
