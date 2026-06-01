import { useState } from 'react';
import { Form, Input, message } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { login, sendCode } from '../../api/auth';
import { apiGet } from '../../api/client';
import { useAuthStore } from '../../store/auth';
import type { UserProfile } from '../../types';
import { PaperCard, Pill, SketchButton } from '../../components/sketch';

export default function LoginPage() {
  const navigate = useNavigate();
  const [loginType, setLoginType] = useState<'password' | 'code'>('password');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const setTokens = useAuthStore((s) => s.setTokens);
  const setProfile = useAuthStore((s) => s.setProfile);

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
      await sendCode(identifier, 'login');
      message.success('验证码已发送');
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

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--paper)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <PaperCard style={{ width: 420, padding: 32 }}>
        <div className="mono ink-soft" style={{ fontSize: 11, letterSpacing: 2, marginBottom: 8 }}>
          WELCOME · 欢迎
        </div>
        <h1 className="display" style={{ fontSize: 40, lineHeight: 1.05, margin: '0 0 8px' }}>
          <span className="scribble-u">登录</span>
        </h1>
        <p className="hand ink-soft" style={{ marginBottom: 20 }}>继续记录你的饮食与运动</p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <Pill active={loginType === 'password'} onClick={() => setLoginType('password')}>
            密码登录
          </Pill>
          <Pill active={loginType === 'code'} onClick={() => setLoginType('code')}>
            验证码登录
          </Pill>
        </div>

        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label={<span className="hand">{loginType === 'code' ? '手机号' : '手机号或邮箱'}</span>}
            name="identifier"
            rules={[{ required: true, message: '请输入手机号或邮箱' }]}
          >
            <Input placeholder={loginType === 'code' ? '手机号' : '手机号或邮箱'} />
          </Form.Item>
          {loginType === 'password' ? (
            <Form.Item
              label={<span className="hand">密码</span>}
              name="password"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password />
            </Form.Item>
          ) : (
            <Form.Item label={<span className="hand">验证码</span>} required>
              <div style={{ display: 'flex', gap: 8 }}>
                <Form.Item name="verifyCode" noStyle rules={[{ required: true, message: '请输入验证码' }]}>
                  <Input placeholder="6 位验证码" style={{ flex: 1 }} />
                </Form.Item>
                <SketchButton onClick={handleSendCode} disabled={sending} style={{ whiteSpace: 'nowrap', flex: '0 0 auto' }}>
                  {sending ? '发送中…' : '获取验证码'}
                </SketchButton>
              </div>
            </Form.Item>
          )}
          <SketchButton
            primary
            size="lg"
            onClick={() => form.submit()}
            disabled={loading}
            style={{ width: '100%', marginTop: 4 }}
          >
            {loading ? '登录中…' : '登录'}
          </SketchButton>
        </Form>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <Link className="hand accent" to="/register">还没有账号？立即注册</Link>
          <span className="ink-faint" style={{ margin: '0 8px' }}>·</span>
          <Link className="hand accent" to="/reset-password">忘记密码</Link>
        </div>
      </PaperCard>
    </div>
  );
}
