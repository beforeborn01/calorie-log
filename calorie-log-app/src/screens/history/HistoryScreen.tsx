import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Share, View } from 'react-native';
import {
  ActivityIndicator,
  Appbar,
  Card,
  Chip,
  Divider,
  SegmentedButtons,
  Text,
} from 'react-native-paper';
import dayjs from 'dayjs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { getDailyRecords } from '../../api/record';
import apiClient from '../../api/client';
import type { DailyRecords, DietRecord, MealType } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'History'>;

type Range = '7d' | '14d' | '30d';

const MEAL_LABEL: Record<MealType, string> = { 1: '早餐', 2: '午餐', 3: '晚餐', 4: '加餐' };

interface Row extends DietRecord {
  rowKey: string;
  recordDate: string;
}

function rangeToDays(r: Range): number {
  return r === '7d' ? 7 : r === '14d' ? 14 : 30;
}

export default function HistoryScreen({ navigation }: Props) {
  const [range, setRange] = useState<Range>('7d');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [mealFilter, setMealFilter] = useState<MealType | 0>(0); // 0 = all

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const days = rangeToDays(range);
    const todays = Array.from({ length: days }, (_, i) =>
      dayjs().subtract(days - 1 - i, 'day').format('YYYY-MM-DD')
    );

    Promise.all(
      todays.map((d) =>
        getDailyRecords(d).catch((): DailyRecords | null => null)
      )
    )
      .then((all) => {
        if (cancelled) return;
        const out: Row[] = [];
        all.forEach((d, idx) => {
          if (!d) return;
          for (const r of [
            ...(d.breakfast ?? []),
            ...(d.lunch ?? []),
            ...(d.dinner ?? []),
            ...(d.snacks ?? []),
          ]) {
            out.push({ ...r, recordDate: todays[idx], rowKey: `${todays[idx]}-${r.id}` });
          }
        });
        // 倒序显示：最近的日期在上
        out.sort((a, b) => b.recordDate.localeCompare(a.recordDate));
        setRows(out);
      })
      .catch((e: any) => {
        if (!cancelled) Alert.alert('加载失败', e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [range]);

  const onExport = async () => {
    const days = rangeToDays(range);
    const start = dayjs().subtract(days - 1, 'day').format('YYYY-MM-DD');
    const end = dayjs().format('YYYY-MM-DD');
    try {
      // 拉纯文本 CSV，绕过 axios JSON 解析
      const resp = await apiClient.get<string>('/export/records', {
        params: { startDate: start, endDate: end },
        responseType: 'text',
        transformResponse: [(d) => d],
      });
      const text = resp.data ?? '';
      if (!text.trim()) {
        Alert.alert('导出失败', '服务端未返回内容');
        return;
      }
      // RN 无文件系统依赖，这里用内置 Share 以"纯文本"方式分享
      // 超长截断到 ~20KB 防止 iOS 剪贴板/邮件正文限制
      const MAX = 20 * 1024;
      const body = text.length > MAX ? text.slice(0, MAX) + '\n...（已截断，完整导出请在网页端）' : text;
      await Share.share({
        title: `饮食记录 ${start} ~ ${end}`,
        message: body,
      });
    } catch (e: any) {
      Alert.alert('导出失败', e.message);
    }
  };

  const filtered = useMemo(
    () => (mealFilter === 0 ? rows : rows.filter((r) => r.mealType === mealFilter)),
    [rows, mealFilter]
  );

  const stats = useMemo(() => {
    const total = filtered.length;
    const days = new Set(filtered.map((r) => r.recordDate)).size;
    const calories = filtered.reduce((s, r) => s + Number(r.calories ?? 0), 0);
    return { total, days, calories };
  }, [filtered]);

  return (
    <>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="历史记录" />
        <Appbar.Action icon="export" onPress={onExport} />
      </Appbar.Header>

      <View style={{ padding: 16, paddingBottom: 0 }}>
        <SegmentedButtons
          value={range}
          onValueChange={(v) => setRange(v as Range)}
          buttons={[
            { value: '7d', label: '近 7 天' },
            { value: '14d', label: '近 14 天' },
            { value: '30d', label: '近 30 天' },
          ]}
          style={{ marginBottom: 12 }}
        />

        <Card style={{ marginBottom: 12 }}>
          <Card.Content style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <StatCell label="条数" value={String(stats.total)} />
            <StatCell label="覆盖天数" value={String(stats.days)} />
            <StatCell label="累计热量" value={`${stats.calories.toFixed(0)} kcal`} />
          </Card.Content>
        </Card>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
          {([0, 1, 2, 3, 4] as const).map((m) => (
            <Chip
              key={m}
              selected={mealFilter === m}
              onPress={() => setMealFilter(m)}
              style={{ marginRight: 8, marginBottom: 6 }}
            >
              {m === 0 ? '全部' : MEAL_LABEL[m as MealType]}
            </Chip>
          ))}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(r) => r.rowKey}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', color: 'rgba(0,0,0,0.48)', marginTop: 40 }}>
              区间内暂无记录
            </Text>
          }
          renderItem={({ item }) => (
            <View style={{ paddingVertical: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text variant="bodySmall" style={{ color: 'rgba(0,0,0,0.56)', minWidth: 80 }}>
                  {item.recordDate.slice(5)}
                </Text>
                <Chip compact style={{ marginRight: 8 }}>
                  {MEAL_LABEL[item.mealType as MealType]}
                </Chip>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMedium">{item.foodName}</Text>
                  <Text variant="bodySmall" style={{ color: 'rgba(0,0,0,0.56)' }}>
                    {Number(item.quantity).toFixed(0)} g · {Number(item.calories).toFixed(0)} kcal
                  </Text>
                </View>
              </View>
              <Divider style={{ marginTop: 10 }} />
            </View>
          )}
        />
      )}
    </>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text variant="bodySmall" style={{ color: 'rgba(0,0,0,0.48)' }}>
        {label}
      </Text>
      <Text variant="titleMedium" style={{ marginTop: 2 }}>
        {value}
      </Text>
    </View>
  );
}
