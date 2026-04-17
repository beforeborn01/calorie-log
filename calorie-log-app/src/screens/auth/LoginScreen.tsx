import React, { useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { Button, SegmentedButtons, Text, TextInput } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { login, sendCode, getProfile } from '../../api/auth';
import { useAuthStore } from '../../store/auth';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const [loginType, setLoginType] = useState<'password' | 'code'>('password');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const setTokens = useAuthStore((s) => s.setTokens);
  const setProfile = useAuthStore((s) => s.setProfile);

  const handleSendCode = async () => {
    if (!identifier) return Alert.alert('请先输入手机号');
    setSending(true);
    try {
      const resp = await sendCode(identifier, 'login');
      Alert.alert('验证码已发送', resp.code ? `dev: ${resp.code}` : '请查看手机');
    } catch (e: any) {
      Alert.alert('发送失败', e.message);
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const tokens = await login({ identifier, loginType, password, verifyCode });
      await setTokens(tokens.accessToken, tokens.refreshToken);
      const profile = await getProfile();
      setProfile(profile);
    } catch (e: any) {
      Alert.alert('登录失败', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 24 }}>
      <Text variant="headlineMedium" style={{ marginBottom: 16 }}>登录</Text>
      <SegmentedButtons
        value={loginType}
        onValueChange={(v) => setLoginType(v as 'password' | 'code')}
        buttons={[
          { value: 'password', label: '密码登录' },
          { value: 'code', label: '验证码登录' },
        ]}
        style={{ marginBottom: 16 }}
      />
      <TextInput
        label={loginType === 'code' ? '手机号' : '手机号或邮箱'}
        value={identifier}
        onChangeText={setIdentifier}
        autoCapitalize="none"
        style={{ marginBottom: 12 }}
      />
      {loginType === 'password' ? (
        <TextInput
          label="密码"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={{ marginBottom: 12 }}
        />
      ) : (
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
      )}
      <Button mode="contained" onPress={handleSubmit} loading={loading} disabled={loading} style={{ marginTop: 8 }}>
        登录
      </Button>
      <Button onPress={() => navigation.navigate('Register')} style={{ marginTop: 12 }}>
        还没有账号？立即注册
      </Button>
      <Button onPress={() => navigation.navigate('ResetPassword')} style={{ marginTop: 4 }}>
        忘记密码
      </Button>
    </ScrollView>
  );
}
