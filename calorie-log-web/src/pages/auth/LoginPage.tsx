import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, Form, Input, Modal, Space, Tabs, Tag, Typography, message } from 'antd';
import { WechatOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { login, sendCode } from '../../api/auth';
import { apiGet } from '../../api/client';
import { getWechatQrCode, mockConfirmWechat, pollWechat, type WechatQrCode } from '../../api/wechat';
import { useAuthStore } from '../../store/auth';
import type { UserProfile } from '../../types';

export default function LoginPage() {
  const navigate = useNavigate();
  const [loginType, setLoginType] = useState<'password' | 'code'>('password');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const setTokens = useAuthStore((s) => s.setTokens);
  const setProfile = useAuthStore((s) => s.setProfile);

  const [qrOpen, setQrOpen] = useState(false);
  const [qr, setQr] = useState<WechatQrCode | null>(null);
  const [qrStatus, setQrStatus] = useState<'PENDING' | 'SCANNED' | 'CONFIRMED' | 'EXPIRED'>('PENDING');
  const [qrNickname, setQrNickname] = useState<string | null>(null);
  const pollTimer = useRef<number | null>(null);

  const onCommitToken = async (accessToken: string, refreshToken: string, profileComplete: boolean) => {
    setTokens(accessToken, refreshToken);
    const profile = await apiGet<UserProfile>('/users/profile');
    setProfile(profile);
    if (!profile.profileComplete || !profileComplete) {
      navigate('/profile/setup', { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  };

  const handleSendCode = async () => {
    const identifier = form.getFieldValue('identifier');
    if (!identifier) {
      message.warning('请先输入手机号');
      return;
    }
    setSending(true);
    try {
      const resp = await sendCode(identifier, 'login');
      if (resp.code) message.success(`验证码已发送（dev: ${resp.code}）`);
      else message.success('验证码已发送');
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = async (values: { identifier: string; password?: string; verifyCode?: string }) => {
    setLoading(true);
    try {
      const token = await login({ ...values, loginType });
      await onCommitToken(token.accessToken, token.refreshToken, token.profileComplete);
    } finally {
      setLoading(false);
    }
  };

  const stopPoll = () => {
    if (pollTimer.current) {
      window.clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  };

  const openWechatQr = async () => {
    try {
      const r = await getWechatQrCode();
      setQr(r);
      setQrStatus('PENDING');
      setQrNickname(null);
      setQrOpen(true);
    } catch (e: any) {
      message.error(e?.message || '生成二维码失败');
    }
  };

  useEffect(() => {
    if (!qrOpen || !qr) return;
    pollTimer.current = window.setInterval(async () => {
      try {
        const r = await pollWechat(qr.ticket);
        setQrStatus(r.status);
        if (r.nickname) setQrNickname(r.nickname);
        if (r.status === 'CONFIRMED' && r.token) {
          stopPoll();
          setQrOpen(false);
          message.success('登录成功');
          await onCommitToken(r.token.accessToken, r.token.refreshToken, r.token.profileComplete);
        } else if (r.status === 'EXPIRED') {
          stopPoll();
        }
      } catch {
        /* ignore transient polling errors */
      }
    }, 1500);
    return stopPoll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrOpen, qr?.ticket]);

  const onMockScan = async () => {
    if (!qr) return;
    try {
      await mockConfirmWechat(qr.ticket);
    } catch (e: any) {
      message.error(e?.message || '模拟扫码失败');
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <Card title="登录 食养记" style={{ width: 420 }}>
        <Tabs
          activeKey={loginType}
          onChange={(k) => setLoginType(k as 'password' | 'code')}
          items={[
            { key: 'password', label: '密码登录' },
            { key: 'code', label: '验证码登录' },
          ]}
        />
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label={loginType === 'code' ? '手机号' : '手机号或邮箱'}
            name="identifier"
            rules={[{ required: true, message: '请输入手机号或邮箱' }]}
          >
            <Input placeholder={loginType === 'code' ? '手机号' : '手机号或邮箱'} />
          </Form.Item>
          {loginType === 'password' ? (
            <Form.Item label="密码" name="password" rules={[{ required: true, message: '请输入密码' }]}>
              <Input.Password />
            </Form.Item>
          ) : (
            <Form.Item label="验证码" required>
              <div style={{ display: 'flex', gap: 8 }}>
                <Form.Item name="verifyCode" noStyle rules={[{ required: true, message: '请输入验证码' }]}>
                  <Input placeholder="6 位验证码" />
                </Form.Item>
                <Button onClick={handleSendCode} loading={sending}>
                  获取验证码
                </Button>
              </div>
            </Form.Item>
          )}
          <Button type="primary" htmlType="submit" loading={loading} block>
            登录
          </Button>
        </Form>
        <Button
          icon={<WechatOutlined />}
          block
          style={{ marginTop: 12 }}
          onClick={openWechatQr}
        >
          微信扫码登录
        </Button>
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Link to="/register">还没有账号？立即注册</Link>
          <span style={{ margin: '0 8px', color: '#d9d9d9' }}>|</span>
          <Link to="/reset-password">忘记密码</Link>
        </div>
      </Card>

      <Modal
        open={qrOpen}
        title="微信扫码登录"
        onCancel={() => {
          stopPoll();
          setQrOpen(false);
        }}
        footer={null}
        width={360}
      >
        <Space orientation="vertical" size="middle" style={{ width: '100%', alignItems: 'center' }}>
          {qr?.mocked && (
            <Alert
              type="info"
              showIcon
              title="Dev 模式"
              description="未配置微信开放平台，点击下方按钮模拟扫码确认"
              style={{ width: '100%' }}
            />
          )}
          <div
            style={{
              width: 240,
              minHeight: 220,
              border: '1px solid #eee',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
              background: '#fafafa',
              fontSize: 13,
              color: '#999',
              padding: 12,
              textAlign: 'center',
              wordBreak: 'break-all',
            }}
          >
            {qr?.qrCodeUrl ?? '加载中...'}
          </div>
          <div>
            {qrStatus === 'PENDING' && <Tag color="default">等待扫码</Tag>}
            {qrStatus === 'SCANNED' && <Tag color="blue">已扫码，等待确认</Tag>}
            {qrStatus === 'CONFIRMED' && <Tag color="blue">确认成功</Tag>}
            {qrStatus === 'EXPIRED' && <Tag>二维码已失效</Tag>}
            {qrNickname && (
              <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
                {qrNickname}
              </Typography.Text>
            )}
          </div>
          {qr?.mocked && qrStatus !== 'CONFIRMED' && (
            <Button type="primary" onClick={onMockScan}>
              模拟扫码确认（dev）
            </Button>
          )}
          {qrStatus === 'EXPIRED' && (
            <Button onClick={openWechatQr}>刷新二维码</Button>
          )}
        </Space>
      </Modal>
    </div>
  );
}
