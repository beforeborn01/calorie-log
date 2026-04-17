import React, { useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { register, sendCode, getProfile } from '../../api/auth';
import { useAuthStore } from '../../store/auth';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const [identifier, setIdentifier] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const setTokens = useAuthStore((s) => s.setTokens);
  const setProfile = useAuthStore((s) => s.setProfile);

  const handleSendCode = async () => {
    if (!identifier) return Alert.alert('请先输入手机号或邮箱');
    setSending(true);
    try {
      const resp = await sendCode(identifier, 'register');
      Alert.alert('验证码已发送', resp.code ? `dev: ${resp.code}` : '请查看手机/邮箱');
    } catch (e: any) {
      Alert.alert('发送失败', e.message);
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = async () => {
    if (password.length < 8) {
      Alert.alert('密码长度至少 8 位');
      return;
    }
    setLoading(true);
    try {
      const tokens = await register({ identifier, verifyCode, password, nickname: nickname || undefined });
      await setTokens(tokens.accessToken, tokens.refreshToken);
      const profile = await getProfile();
      setProfile(profile);
    } catch (e: any) {
      Alert.alert('注册失败', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 24 }}>
      <Text variant="headlineMedium" style={{ marginBottom: 16 }}>注册</Text>
      <TextInput
        label="手机号或邮箱"
        value={identifier}
        onChangeText={setIdentifier}
        autoCapitalize="none"
        style={{ marginBottom: 12 }}
      />
      <View style={{ flexDirection: 'row', marginBottom: 12, alignItems: 'center' }}>
        <TextInput
          label="验证码"
          value={verifyCode}
          onChangeText={setVerifyCode}
          keyboardType="number-pad"
          style={{ flex: 1, marginRight: 8 }}
        />
        <Button mode="outlined" onPress={handleSendCode} loading={sending} disabled={sending}>
          获取验证码
        </Button>
      </View>
      <TextInput label="密码 (8-32 位)" value={password} onChangeText={setPassword} secureTextEntry style={{ marginBottom: 12 }} />
      <TextInput label="昵称（可选）" value={nickname} onChangeText={setNickname} style={{ marginBottom: 12 }} />
      <Button mode="contained" onPress={handleSubmit} loading={loading} disabled={loading}>
        注册
      </Button>
      <Button onPress={() => navigation.goBack()} style={{ marginTop: 12 }}>
        返回登录
      </Button>
    </ScrollView>
  );
}
