import { useEffect, useRef, useState } from 'react';
import { Alert, Form, Input, Modal, Space, message } from 'antd';
import { WechatOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { login, sendCode } from '../../api/auth';
import { apiGet } from '../../api/client';
import { getWechatQrCode, mockConfirmWechat, pollWechat, type WechatQrCode } from '../../api/wechat';
import { useAuthStore } from '../../store/auth';
import type { UserProfile } from '../../types';
import { Chip, PaperCard, Pill, SketchButton } from '../../components/sketch';

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
        <p className="hand ink-soft" style={{ marginBottom: 20 }}>继续记录你的饮食与训练</p>

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
                  <Input placeholder="6 位验证码" />
                </Form.Item>
                <SketchButton onClick={handleSendCode} disabled={sending}>
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

        <SketchButton onClick={openWechatQr} style={{ width: '100%', marginTop: 12 }}>
          <WechatOutlined style={{ marginRight: 6 }} />
          微信扫码登录
        </SketchButton>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <Link className="hand accent" to="/register">还没有账号？立即注册</Link>
          <span className="ink-faint" style={{ margin: '0 8px' }}>·</span>
          <Link className="hand accent" to="/reset-password">忘记密码</Link>
        </div>
      </PaperCard>

      <Modal
        open={qrOpen}
        title={<span className="display" style={{ fontSize: 22 }}>微信扫码登录</span>}
        onCancel={() => {
          stopPoll();
          setQrOpen(false);
        }}
        footer={null}
        width={360}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%', alignItems: 'center' }}>
          {qr?.mocked && (
            <Alert
              type="info"
              showIcon
              message="Dev 模式"
              description="未配置微信开放平台，点击下方按钮模拟扫码确认"
              style={{ width: '100%' }}
            />
          )}
          <div
            style={{
              width: 240,
              minHeight: 220,
              border: '1.5px dashed rgba(0,0,0,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 12,
              background: 'var(--paper-2)',
              fontSize: 13,
              color: 'var(--ink-soft)',
              padding: 12,
              textAlign: 'center',
              wordBreak: 'break-all',
            }}
            className="hand"
          >
            {qr?.qrCodeUrl ?? '加载中…'}
          </div>
          <div>
            {qrStatus === 'PENDING' && <Chip>等待扫码</Chip>}
            {qrStatus === 'SCANNED' && <Chip color="var(--accent-soft)">已扫码，等待确认</Chip>}
            {qrStatus === 'CONFIRMED' && <Chip color="var(--accent-soft)">确认成功</Chip>}
            {qrStatus === 'EXPIRED' && <Chip color="var(--paper-3)">二维码已失效</Chip>}
            {qrNickname && (
              <span className="hand ink-soft" style={{ marginLeft: 8 }}>
                {qrNickname}
              </span>
            )}
          </div>
          {qr?.mocked && qrStatus !== 'CONFIRMED' && (
            <SketchButton primary onClick={onMockScan}>
              模拟扫码确认（dev）
            </SketchButton>
          )}
          {qrStatus === 'EXPIRED' && (
            <SketchButton onClick={openWechatQr}>刷新二维码</SketchButton>
          )}
        </Space>
      </Modal>
    </div>
  );
}
