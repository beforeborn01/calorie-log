import React, { useEffect, useRef, useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Dialog,
  Portal,
  SegmentedButtons,
  Text,
  TextInput,
} from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { login, sendCode, getProfile } from '../../api/auth';
import {
  getWechatQrCode,
  mockConfirmWechat,
  pollWechat,
  type WechatPollResponse,
  type WechatQrCode,
} from '../../api/wechat';
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

  const [qrOpen, setQrOpen] = useState(false);
  const [qr, setQr] = useState<WechatQrCode | null>(null);
  const [qrStatus, setQrStatus] = useState<WechatPollResponse['status']>('PENDING');
  const [qrNickname, setQrNickname] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  };

  useEffect(() => stopPolling, []);

  const openWechat = async () => {
    stopPolling();
    setQr(null);
    setQrStatus('PENDING');
    setQrNickname(null);
    setQrOpen(true);
    try {
      const data = await getWechatQrCode();
      setQr(data);
      // 每 1.5s 轮询一次，最多 90 次（~2min）
      let ticks = 0;
      pollTimer.current = setInterval(async () => {
        ticks += 1;
        try {
          const r = await pollWechat(data.ticket);
          setQrStatus(r.status);
          if (r.nickname) setQrNickname(r.nickname);
          if (r.status === 'CONFIRMED' && r.token) {
            stopPolling();
            await setTokens(r.token.accessToken, r.token.refreshToken);
            const prof = await getProfile();
            setProfile(prof);
            setQrOpen(false);
          } else if (r.status === 'EXPIRED' || ticks >= 90) {
            stopPolling();
          }
        } catch {
          /* 轮询期间的网络错误忽略 */
        }
      }, 1500);
    } catch (e: any) {
      Alert.alert('获取二维码失败', e.message);
      setQrOpen(false);
    }
  };

  const onMockConfirm = async () => {
    if (!qr) return;
    try {
      await mockConfirmWechat(qr.ticket);
      // 触发立刻再轮询一次以获取 token
    } catch (e: any) {
      Alert.alert('模拟确认失败', e.message);
    }
  };

  const closeQr = () => {
    stopPolling();
    setQrOpen(false);
  };

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
      <Button mode="outlined" icon="wechat" onPress={openWechat} style={{ marginTop: 12 }}>
        微信扫码登录
      </Button>
      <Button onPress={() => navigation.navigate('Register')} style={{ marginTop: 12 }}>
        还没有账号？立即注册
      </Button>
      <Button onPress={() => navigation.navigate('ResetPassword')} style={{ marginTop: 4 }}>
        忘记密码
      </Button>

      <Portal>
        <Dialog visible={qrOpen} onDismiss={closeQr}>
          <Dialog.Title>微信扫码登录</Dialog.Title>
          <Dialog.Content>
            {!qr ? (
              <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                <ActivityIndicator />
              </View>
            ) : (
              <View>
                <Text variant="bodySmall" style={{ color: 'rgba(0,0,0,0.56)', marginBottom: 8 }}>
                  二维码 URL：
                </Text>
                <Text
                  selectable
                  style={{
                    fontSize: 11,
                    padding: 8,
                    backgroundColor: '#f5f5f7',
                    borderRadius: 8,
                    marginBottom: 12,
                  }}
                >
                  {qr.qrCodeUrl}
                </Text>
                <Text variant="bodyMedium" style={{ marginBottom: 4 }}>
                  状态：{qrStatusText(qrStatus)}
                  {qrNickname ? ` · ${qrNickname}` : ''}
                </Text>
                {qr.mocked && qrStatus !== 'CONFIRMED' && (
                  <Text variant="bodySmall" style={{ color: 'rgba(0,0,0,0.56)', marginTop: 4 }}>
                    dev 模式：真机上需配置 react-native-wechat-lib 原生 SDK。
                  </Text>
                )}
              </View>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={closeQr}>关闭</Button>
            {qr?.mocked && qrStatus !== 'CONFIRMED' && (
              <Button mode="contained" onPress={onMockConfirm}>
                模拟扫码确认（dev）
              </Button>
            )}
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
}

function qrStatusText(s: WechatPollResponse['status']): string {
  switch (s) {
    case 'PENDING':
      return '等待扫码';
    case 'SCANNED':
      return '已扫码，等待确认';
    case 'CONFIRMED':
      return '确认成功';
    case 'EXPIRED':
      return '已失效';
    default:
      return s;
  }
}
