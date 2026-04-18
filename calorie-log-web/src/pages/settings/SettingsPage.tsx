import { useEffect, useState } from 'react';
import { Button, Card, Form, Input, Select, Space, Switch, TimePicker, Typography, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { Link } from 'react-router-dom';
import {
  changePassword,
  getNotificationSetting,
  saveNotificationSetting,
  type NotificationSetting,
} from '../../api/settings';

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
    <div className="page-container" style={{ maxWidth: 820 }}>
      <Space style={{ marginBottom: 16 }}>
        <Link to="/">
          <ArrowLeftOutlined /> 返回首页
        </Link>
      </Space>

      <Card title="三餐提醒" style={{ marginBottom: 16 }} loading={!setting}>
        <Form form={form} layout="vertical">
          {(['breakfast', 'lunch', 'dinner'] as const).map((meal) => {
            const label = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐' }[meal];
            return (
              <Space key={meal} style={{ display: 'flex', marginBottom: 8 }}>
                <Form.Item name={`${meal}Enabled`} valuePropName="checked" style={{ margin: 0 }}>
                  <Switch />
                </Form.Item>
                <Typography.Text style={{ minWidth: 40 }}>{label}</Typography.Text>
                <Form.Item name={`${meal}Time`} style={{ margin: 0 }}>
                  <TimePicker format="HH:mm" />
                </Form.Item>
              </Space>
            );
          })}
          <Form.Item name="frequency" label="频率">
            <Select
              options={[
                { value: 'daily', label: '每天' },
                { value: 'weekday', label: '仅工作日' },
                { value: 'weekend', label: '仅周末' },
              ]}
              style={{ width: 160 }}
            />
          </Form.Item>
          <Button type="primary" onClick={onSaveNotification}>
            保存通知设置
          </Button>
        </Form>
      </Card>

      <Card title="修改密码">
        <Form form={pwdForm} layout="vertical" style={{ maxWidth: 400 }}>
          <Form.Item name="oldPassword" label="原密码" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[{ required: true, min: 8, max: 32, message: '密码长度 8~32 位' }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="确认新密码"
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
          <Button type="primary" onClick={onChangePwd}>
            修改密码
          </Button>
          <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
            修改成功后所有登录态失效，需要用新密码重新登录。
          </Typography.Paragraph>
        </Form>
      </Card>
    </div>
  );
}
