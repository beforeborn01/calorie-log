import React, { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { Appbar, Button, Text, TextInput } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { apiPost } from '../../api/client';
import { resetPassword } from '../../api/settings';

type Props = NativeStackScreenProps<RootStackParamList, 'ResetPassword'>;

export default function ResetPasswordScreen({ navigation }: Props) {
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [sending, setSending] = useState(false);

  const sendCode = async () => {
    if (!identifier) {
      Alert.alert('请先填写手机号/邮箱');
      return;
    }
    setSending(true);
    try {
      const resp = await apiPost<{ code?: string; sent: boolean }>('/auth/send-code', {
        identifier,
        scene: 'reset_password',
      });
      Alert.alert('已发送', resp.code ? `dev mock: ${resp.code}` : '');
    } catch (e: any) {
      Alert.alert('发送失败', e.message);
    } finally {
      setSending(false);
    }
  };

  const onSubmit = async () => {
    if (!identifier || !code || newPwd.length < 8) {
      Alert.alert('请填写完整，新密码至少 8 位');
      return;
    }
    try {
      await resetPassword(identifier, code, newPwd);
      Alert.alert('重置成功', '请用新密码登录', [
        { text: '确定', onPress: () => navigation.replace('Login') },
      ]);
    } catch (e: any) {
      Alert.alert('重置失败', e.message);
    }
  };

  return (
    <>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="重置密码" />
      </Appbar.Header>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <TextInput label="手机号/邮箱" value={identifier} onChangeText={setIdentifier} style={{ marginBottom: 8 }} />
        <View style={{ flexDirection: 'row', marginBottom: 8 }}>
          <TextInput label="验证码" value={code} onChangeText={setCode} style={{ flex: 1, marginRight: 8 }} />
          <Button mode="outlined" onPress={sendCode} loading={sending}>
            发送
          </Button>
        </View>
        <TextInput label="新密码" secureTextEntry value={newPwd} onChangeText={setNewPwd} />
        <Button mode="contained" style={{ marginTop: 16 }} onPress={onSubmit}>
          重置密码
        </Button>
      </ScrollView>
    </>
  );
}
