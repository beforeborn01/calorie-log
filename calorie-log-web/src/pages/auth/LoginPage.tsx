import { useState } from 'react';
import { Button, Card, Form, Input, Tabs, message } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { login, sendCode } from '../../api/auth';
import { apiGet } from '../../api/client';
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
      setTokens(token.accessToken, token.refreshToken);
      const profile = await apiGet<UserProfile>('/users/profile');
      setProfile(profile);
      if (!profile.profileComplete) {
        navigate('/profile/setup', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <Card title="登录 食养记" style={{ width: 380 }}>
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
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Link to="/register">还没有账号？立即注册</Link>
          <span style={{ margin: '0 8px', color: '#d9d9d9' }}>|</span>
          <Link to="/reset-password">忘记密码</Link>
        </div>
      </Card>
    </div>
  );
}
