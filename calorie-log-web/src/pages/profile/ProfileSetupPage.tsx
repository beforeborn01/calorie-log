import { useEffect } from 'react';
import { Button, Card, Form, InputNumber, Radio, Select, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { apiPut } from '../../api/client';
import { useAuthStore } from '../../store/auth';
import type { UserProfile } from '../../types';

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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 40 }}>
      <Card title="完善个人信息" style={{ width: 420 }}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item label="性别" name="gender" rules={[{ required: true }]}>
            <Radio.Group>
              <Radio value={1}>男</Radio>
              <Radio value={2}>女</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item label="年龄" name="age" rules={[{ required: true }]}>
            <InputNumber min={10} max={120} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="身高 (cm)" name="height" rules={[{ required: true }]}>
            <InputNumber min={100} max={250} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="体重 (kg)" name="weight" rules={[{ required: true }]}>
            <InputNumber min={20} max={300} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="活动量" name="activityLevel" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 1, label: '极少运动（久坐）' },
                { value: 2, label: '轻度（每周 1~3 次）' },
                { value: 3, label: '中度（每周 3~5 次）' },
                { value: 4, label: '高强度（每周 6+ 次）' },
              ]}
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>
            保存
          </Button>
        </Form>
      </Card>
    </div>
  );
}
