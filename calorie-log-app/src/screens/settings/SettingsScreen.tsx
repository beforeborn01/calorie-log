import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { Appbar, Button, Card, SegmentedButtons, Switch, Text, TextInput } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import {
  changePassword,
  getNotificationSetting,
  saveNotificationSetting,
  type NotificationSetting,
} from '../../api/settings';
import { useAuthStore } from '../../store/auth';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export default function SettingsScreen({ navigation }: Props) {
  const [setting, setSetting] = useState<NotificationSetting | null>(null);
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    getNotificationSetting().then(setSetting);
  }, []);

  const onSaveNotification = async () => {
    if (!setting) return;
    try {
      const saved = await saveNotificationSetting(setting);
      setSetting(saved);
      Alert.alert('已保存');
    } catch (e: any) {
      Alert.alert('保存失败', e.message);
    }
  };

  const onChangePwd = async () => {
    if (!oldPwd || newPwd.length < 8) {
      Alert.alert('提示', '原密码必填；新密码至少 8 位');
      return;
    }
    try {
      await changePassword(oldPwd, newPwd);
      Alert.alert('密码已修改', '请重新登录', [
        {
          text: '确定',
          onPress: () => logout(),
        },
      ]);
    } catch (e: any) {
      Alert.alert('修改失败', e.message);
    }
  };

  return (
    <>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="设置" />
      </Appbar.Header>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Card style={{ marginBottom: 12 }}>
          <Card.Title title="三餐提醒" />
          <Card.Content>
            {setting &&
              (['breakfast', 'lunch', 'dinner'] as const).map((meal) => {
                const label = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐' }[meal];
                const enabledKey = `${meal}Enabled` as const;
                const timeKey = `${meal}Time` as const;
                return (
                  <View
                    key={meal}
                    style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}
                  >
                    <Text style={{ width: 60 }}>{label}</Text>
                    <Switch
                      value={setting[enabledKey]}
                      onValueChange={(v) => setSetting({ ...setting, [enabledKey]: v })}
                    />
                    <TextInput
                      dense
                      value={setting[timeKey]}
                      onChangeText={(v) => setSetting({ ...setting, [timeKey]: v })}
                      style={{ marginLeft: 12, width: 120 }}
                      placeholder="HH:mm"
                    />
                  </View>
                );
              })}
            {setting && (
              <SegmentedButtons
                style={{ marginTop: 8 }}
                value={setting.frequency}
                onValueChange={(v) => setSetting({ ...setting, frequency: v as NotificationSetting['frequency'] })}
                buttons={[
                  { value: 'daily', label: '每天' },
                  { value: 'weekday', label: '工作日' },
                  { value: 'weekend', label: '周末' },
                ]}
              />
            )}
            <Button mode="contained" style={{ marginTop: 12 }} onPress={onSaveNotification}>
              保存
            </Button>
          </Card.Content>
        </Card>

        <Card>
          <Card.Title title="修改密码" />
          <Card.Content>
            <TextInput
              label="原密码"
              secureTextEntry
              value={oldPwd}
              onChangeText={setOldPwd}
              style={{ marginBottom: 8 }}
            />
            <TextInput
              label="新密码 (≥8位)"
              secureTextEntry
              value={newPwd}
              onChangeText={setNewPwd}
            />
            <Button mode="contained" style={{ marginTop: 12 }} onPress={onChangePwd}>
              修改密码
            </Button>
            <Text variant="bodySmall" style={{ marginTop: 8, color: '#8c8c8c' }}>
              修改后所有登录态失效，需重新登录。
            </Text>
          </Card.Content>
        </Card>
      </ScrollView>
    </>
  );
}
