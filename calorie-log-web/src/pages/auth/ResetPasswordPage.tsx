import { useState } from 'react';
import { Button, Card, Form, Input, Space, message } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { apiPost } from '../../api/client';
import { resetPassword } from '../../api/settings';

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
    <div style={{ maxWidth: 400, margin: '80px auto', padding: 16 }}>
      <Card title="忘记密码 · 重置">
        <Form form={form} layout="vertical">
          <Form.Item name="identifier" label="手机号/邮箱" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="verifyCode" label="验证码" rules={[{ required: true }]}>
            <Space.Compact style={{ width: '100%' }}>
              <Input />
              <Button onClick={sendCode} loading={sending}>
                发送
              </Button>
            </Space.Compact>
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[{ required: true, min: 8, max: 32 }]}
          >
            <Input.Password />
          </Form.Item>
          <Button type="primary" block onClick={onSubmit}>
            重置密码
          </Button>
          <div style={{ marginTop: 12, textAlign: 'center' }}>
            <Link to="/login">返回登录</Link>
          </div>
        </Form>
      </Card>
    </div>
  );
}
