import { useState } from 'react';
import { Form, Input, message } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { register, sendCode } from '../../api/auth';
import { apiGet } from '../../api/client';
import { useAuthStore } from '../../store/auth';
import type { UserProfile } from '../../types';
import { PaperCard, SketchButton } from '../../components/sketch';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const setTokens = useAuthStore((s) => s.setTokens);
  const setProfile = useAuthStore((s) => s.setProfile);

  const handleSendCode = async () => {
    const identifier = form.getFieldValue('identifier');
    if (!identifier) {
      message.warning('请先输入手机号或邮箱');
      return;
    }
    setSending(true);
    try {
      const resp = await sendCode(identifier, 'register');
      if (resp.code) message.success(`验证码已发送（dev: ${resp.code}）`);
      else message.success('验证码已发送');
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = async (values: {
    identifier: string;
    verifyCode: string;
    password: string;
    nickname?: string;
  }) => {
    setLoading(true);
    try {
      const token = await register(values);
      setTokens(token.accessToken, token.refreshToken);
      const profile = await apiGet<UserProfile>('/users/profile');
      setProfile(profile);
      navigate('/profile/setup', { replace: true });
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
          JOIN · 加入
        </div>
        <h1 className="display" style={{ fontSize: 40, lineHeight: 1.05, margin: '0 0 8px' }}>
          <span className="scribble-u">注册</span>
        </h1>
        <p className="hand ink-soft" style={{ marginBottom: 20 }}>开始你的饮食与训练日记</p>

        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label={<span className="hand">手机号或邮箱</span>}
            name="identifier"
            rules={[{ required: true, message: '请输入手机号或邮箱' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item label={<span className="hand">验证码</span>} required>
            <div style={{ display: 'flex', gap: 8 }}>
              <Form.Item name="verifyCode" noStyle rules={[{ required: true }]}>
                <Input placeholder="6 位验证码" />
              </Form.Item>
              <SketchButton onClick={handleSendCode} disabled={sending}>
                {sending ? '发送中…' : '获取验证码'}
              </SketchButton>
            </div>
          </Form.Item>
          <Form.Item
            label={<span className="hand">密码</span>}
            name="password"
            rules={[
              { required: true, min: 8, max: 32, message: '密码长度 8~32 位' },
            ]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item label={<span className="hand">昵称（可选）</span>} name="nickname">
            <Input />
          </Form.Item>
          <SketchButton
            primary
            size="lg"
            onClick={() => form.submit()}
            disabled={loading}
            style={{ width: '100%', marginTop: 4 }}
          >
            {loading ? '注册中…' : '注册'}
          </SketchButton>
        </Form>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <Link className="hand accent" to="/login">已有账号？去登录</Link>
        </div>
      </PaperCard>
    </div>
  );
}
