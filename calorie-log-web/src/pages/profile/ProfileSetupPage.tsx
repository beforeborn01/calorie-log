import { useEffect } from 'react';
import { Form, InputNumber, Radio, Select, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { apiPut } from '../../api/client';
import { useAuthStore } from '../../store/auth';
import type { UserProfile } from '../../types';
import { PaperCard, SketchButton } from '../../components/sketch';

export default function ProfileSetupPage() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);

  useEffect(() => {
    if (profile) {
      form.setFieldsValue({
        gender: profile.gender || 1,
        age: profile.age || undefined,
        height: profile.height || undefined,
        weight: profile.weight || undefined,
        activityLevel: profile.activityLevel || 2,
      });
    }
  }, [profile, form]);

  const handleSubmit = async (values: {
    gender: number;
    age: number;
    height: number;
    weight: number;
    activityLevel: number;
  }) => {
    const updated = await apiPut<UserProfile>('/users/profile', values);
    setProfile(updated);
    message.success('资料已保存');
    navigate('/', { replace: true });
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--paper)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '40px 24px',
      }}
    >
      <PaperCard style={{ width: 460, padding: 32 }}>
        <div className="mono ink-soft" style={{ fontSize: 11, letterSpacing: 2, marginBottom: 8 }}>
          ONBOARDING · 完善
        </div>
        <h1 className="display" style={{ fontSize: 36, lineHeight: 1.05, margin: '0 0 8px' }}>
          <span className="scribble-u">个人信息</span>
        </h1>
        <p className="hand ink-soft" style={{ marginBottom: 20 }}>
          填几条基础数据，帮你算每日所需热量
        </p>

        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item label={<span className="hand">性别</span>} name="gender" rules={[{ required: true }]}>
            <Radio.Group>
              <Radio value={1}>男</Radio>
              <Radio value={2}>女</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item label={<span className="hand">年龄</span>} name="age" rules={[{ required: true }]}>
            <InputNumber min={10} max={120} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label={<span className="hand">身高 (cm)</span>} name="height" rules={[{ required: true }]}>
            <InputNumber min={100} max={250} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label={<span className="hand">体重 (kg)</span>} name="weight" rules={[{ required: true }]}>
            <InputNumber min={20} max={300} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label={<span className="hand">活动量</span>} name="activityLevel" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 1, label: '极少运动（久坐）' },
                { value: 2, label: '轻度（每周 1~3 次）' },
                { value: 3, label: '中度（每周 3~5 次）' },
                { value: 4, label: '高强度（每周 6+ 次）' },
              ]}
            />
          </Form.Item>
          <SketchButton
            primary
            size="lg"
            onClick={() => form.submit()}
            style={{ width: '100%', marginTop: 4 }}
          >
            保存
          </SketchButton>
        </Form>
      </PaperCard>
    </div>
  );
}
