import { useState } from 'react';
import { Form, Input, message } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { apiPost } from '../../api/client';
import { resetPassword } from '../../api/settings';
import { PaperCard, SketchButton } from '../../components/sketch';

export default function ResetPasswordPage() {
  const nav = useNavigate();
  const [form] = Form.useForm();
  const [sending, setSending] = useState(false);

  const sendCode = async () => {
    const identifier = form.getFieldValue('identifier');
    if (!identifier) {
      message.error('请先填写手机号/邮箱');
      return;
    }
    setSending(true);
    try {
      await apiPost('/auth/send-code', { identifier, scene: 'reset_password' });
      message.success('验证码已发送（dev 模式用 123456）');
    } finally {
      setSending(false);
    }
  };

  const onSubmit = async () => {
    const v = await form.validateFields();
    await resetPassword(v.identifier, v.verifyCode, v.newPassword);
    message.success('密码已重置，请重新登录');
    nav('/login');
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
          RECOVER · 找回
        </div>
        <h1 className="display" style={{ fontSize: 40, lineHeight: 1.05, margin: '0 0 8px' }}>
          <span className="scribble-u">重置密码</span>
        </h1>
        <p className="hand ink-soft" style={{ marginBottom: 20 }}>用验证码替换旧密码</p>

        <Form form={form} layout="vertical">
          <Form.Item name="identifier" label={<span className="hand">手机号/邮箱</span>} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label={<span className="hand">验证码</span>} required>
            <div style={{ display: 'flex', gap: 8 }}>
              <Form.Item name="verifyCode" noStyle rules={[{ required: true }]}>
                <Input placeholder="6 位验证码" style={{ flex: 1 }} />
              </Form.Item>
              <SketchButton onClick={sendCode} disabled={sending} style={{ whiteSpace: 'nowrap', flex: '0 0 auto' }}>
                {sending ? '发送中…' : '发送验证码'}
              </SketchButton>
            </div>
          </Form.Item>
          <Form.Item
            name="newPassword"
            label={<span className="hand">新密码</span>}
            rules={[{ required: true, min: 8, max: 32, message: '密码长度 8~32 位' }]}
          >
            <Input.Password />
          </Form.Item>
          <SketchButton primary size="lg" onClick={onSubmit} style={{ width: '100%', marginTop: 4 }}>
            重置密码
          </SketchButton>
          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <Link className="hand accent" to="/login">返回登录</Link>
          </div>
        </Form>
      </PaperCard>
    </div>
  );
}
