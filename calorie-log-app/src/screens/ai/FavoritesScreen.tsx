import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { Appbar, Button, Card, Chip, Divider, IconButton, Text } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { deleteFavorite, listFavorites, type CookingFavorite, type CookingMethod } from '../../api/ai';

type Props = NativeStackScreenProps<RootStackParamList, 'CookingFavorites'>;

const GOAL_LABEL: Record<string, string> = { bulk: '增肌', cut: '减脂', general: '均衡' };
const TAG_LABEL: Record<string, string> = { quick: '快手', low_oil: '低油', no_smoke: '无油烟' };

export default function FavoritesScreen({ navigation }: Props) {
  const [list, setList] = useState<CookingFavorite[]>([]);

  const reload = useCallback(async () => {
    try {
      setList(await listFavorites());
    } catch (e: any) {
      Alert.alert('加载失败', e.message);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const onDelete = (id: number) => {
    Alert.alert('取消收藏？', '', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          await deleteFavorite(id);
          reload();
        },
      },
    ]);
  };

  return (
    <>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="我的烹饪收藏" />
      </Appbar.Header>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Card>
          <Card.Content>
            {list.length === 0 && (
              <View>
                <Text style={{ marginBottom: 8 }}>还没有收藏任何烹饪方法</Text>
                <Button mode="contained" onPress={() => navigation.navigate('Cooking')}>
                  去搜索推荐
                </Button>
              </View>
            )}
            {list.map((f) => {
              let m: CookingMethod | null = null;
              try {
                m = JSON.parse(f.content);
              } catch {
                m = null;
              }
              return (
                <View key={f.id} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <Text variant="titleMedium">
                        {f.cookingMethod}
                      </Text>
                      <Text variant="bodySmall" style={{ color: '#888' }}>
                        {f.foodName}
                      </Text>
                      {m && (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
                          {m.fitGoals?.map((g) => (
                            <Chip key={g} compact style={{ marginRight: 4, marginBottom: 4 }}>
                              {GOAL_LABEL[g] ?? g}
                            </Chip>
                          ))}
                          {m.tags?.map((t) => (
                            <Chip key={t} compact style={{ marginRight: 4, marginBottom: 4 }}>
                              {TAG_LABEL[t] ?? t}
                            </Chip>
                          ))}
                        </View>
                      )}
                    </View>
                    <IconButton icon="delete" onPress={() => onDelete(f.id)} />
                  </View>
                  {m && (
                    <>
                      <Text variant="bodySmall" style={{ marginTop: 4 }}>
                        {m.advantages}
                      </Text>
                      {m.steps?.map((s, i) => (
                        <Text key={i} variant="bodySmall" style={{ marginTop: 2 }}>
                          {i + 1}. {s}
                        </Text>
                      ))}
                    </>
                  )}
                  <Divider style={{ marginTop: 8 }} />
                </View>
              );
            })}
          </Card.Content>
        </Card>
      </ScrollView>
    </>
  );
}
