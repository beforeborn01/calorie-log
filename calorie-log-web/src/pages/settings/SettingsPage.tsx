import { useEffect, useState } from 'react';
import { Form, Input, Select, Switch, TimePicker, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { Link } from 'react-router-dom';
import {
  changePassword,
  getNotificationSetting,
  saveNotificationSetting,
  type NotificationSetting,
} from '../../api/settings';
import { PaperCard, SketchButton } from '../../components/sketch';

export default function SettingsPage() {
  const [setting, setSetting] = useState<NotificationSetting | null>(null);
  const [form] = Form.useForm();
  const [pwdForm] = Form.useForm();

  useEffect(() => {
    getNotificationSetting().then((d) => {
      setSetting(d);
      form.setFieldsValue({
        breakfastEnabled: d.breakfastEnabled,
        breakfastTime: dayjs(d.breakfastTime, 'HH:mm'),
        lunchEnabled: d.lunchEnabled,
        lunchTime: dayjs(d.lunchTime, 'HH:mm'),
        dinnerEnabled: d.dinnerEnabled,
        dinnerTime: dayjs(d.dinnerTime, 'HH:mm'),
        frequency: d.frequency,
      });
    });
  }, []);

  const onSaveNotification = async () => {
    const v = await form.validateFields();
    await saveNotificationSetting({
      breakfastEnabled: v.breakfastEnabled,
      breakfastTime: v.breakfastTime.format('HH:mm'),
      lunchEnabled: v.lunchEnabled,
      lunchTime: v.lunchTime.format('HH:mm'),
      dinnerEnabled: v.dinnerEnabled,
      dinnerTime: v.dinnerTime.format('HH:mm'),
      frequency: v.frequency,
    });
    message.success('通知设置已保存');
  };

  const onChangePwd = async () => {
    const v = await pwdForm.validateFields();
    await changePassword(v.oldPassword, v.newPassword);
    message.success('密码已修改，请使用新密码重新登录');
    pwdForm.resetFields();
    setTimeout(() => (window.location.href = '/login'), 1000);
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 24 }}>
      <div style={{ marginBottom: 8 }}>
        <Link className="hand accent" to="/">
          <ArrowLeftOutlined /> 返回首页
        </Link>
      </div>
      <div className="mono ink-soft" style={{ fontSize: 11, letterSpacing: 2 }}>SETTINGS · 设置</div>
      <h1 className="display" style={{ fontSize: 40, margin: '4px 0 24px' }}>
        <span className="scribble-u">偏好设置</span>
      </h1>

      <PaperCard style={{ marginBottom: 16 }}>
        <h3 className="display" style={{ fontSize: 22, margin: '0 0 16px' }}>三餐提醒</h3>
        {!setting ? (
          <div className="hand ink-faint" style={{ padding: '12px 0' }}>加载中…</div>
        ) : (
          <Form form={form} layout="vertical">
            {(['breakfast', 'lunch', 'dinner'] as const).map((meal) => {
              const label = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐' }[meal];
              return (
                <div
                  key={meal}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '8px 0',
                  }}
                >
                  <Form.Item name={`${meal}Enabled`} valuePropName="checked" style={{ margin: 0 }}>
                    <Switch />
                  </Form.Item>
                  <span className="hand" style={{ minWidth: 48, fontWeight: 700 }}>{label}</span>
                  <Form.Item name={`${meal}Time`} style={{ margin: 0 }}>
                    <TimePicker format="HH:mm" />
                  </Form.Item>
                </div>
              );
            })}
            <Form.Item name="frequency" label={<span className="hand">频率</span>} style={{ marginTop: 16 }}>
              <Select
                options={[
                  { value: 'daily', label: '每天' },
                  { value: 'weekday', label: '仅工作日' },
                  { value: 'weekend', label: '仅周末' },
                ]}
                style={{ width: 200 }}
              />
            </Form.Item>
            <SketchButton primary onClick={onSaveNotification}>
              保存通知设置
            </SketchButton>
          </Form>
        )}
      </PaperCard>

      <PaperCard>
        <h3 className="display" style={{ fontSize: 22, margin: '0 0 16px' }}>修改密码</h3>
        <Form form={pwdForm} layout="vertical" style={{ maxWidth: 400 }}>
          <Form.Item name="oldPassword" label={<span className="hand">原密码</span>} rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label={<span className="hand">新密码</span>}
            rules={[{ required: true, min: 8, max: 32, message: '密码长度 8~32 位' }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label={<span className="hand">确认新密码</span>}
            dependencies={['newPassword']}
            rules={[
              { required: true },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                  return Promise.reject(new Error('两次密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password />
          </Form.Item>
          <SketchButton primary onClick={onChangePwd}>
            修改密码
          </SketchButton>
          <p className="hand ink-soft" style={{ marginTop: 12, fontSize: 13 }}>
            修改成功后所有登录态失效，需要用新密码重新登录。
          </p>
        </Form>
      </PaperCard>
    </div>
  );
}
