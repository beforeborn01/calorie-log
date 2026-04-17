import { useEffect, useState } from 'react';
import { Avatar, Button, Card, Descriptions, message } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { apiGet } from '../../api/client';
import { logout } from '../../api/auth';
import { useAuthStore } from '../../store/auth';
import type { UserProfile } from '../../types';

const GENDER_MAP: Record<number, string> = { 0: '未设置', 1: '男', 2: '女' };
const ACTIVITY_MAP: Record<number, string> = { 1: '极少', 2: '轻度', 3: '中度', 4: '高强度' };

export default function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setLocalProfile] = useState<UserProfile | null>(null);
  const setProfile = useAuthStore((s) => s.setProfile);
  const doLogout = useAuthStore((s) => s.logout);

  useEffect(() => {
    apiGet<UserProfile>('/users/profile').then((p) => {
      setLocalProfile(p);
      setProfile(p);
    });
  }, [setProfile]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (_) {
      /* ignore */
    }
    doLogout();
    message.success('已登出');
    navigate('/login', { replace: true });
  };

  if (!profile) return null;
  return (
    <div style={{ padding: 24, maxWidth: 640, margin: '0 auto' }}>
      <Card
        title="个人中心"
        extra={
          <Button danger onClick={handleLogout}>
            退出登录
          </Button>
        }
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <Avatar size={64} src={profile.avatarUrl || undefined}>
            {profile.nickname?.slice(0, 1) || '用'}
          </Avatar>
          <div>
            <div style={{ fontSize: 20, fontWeight: 600 }}>{profile.nickname}</div>
            <div style={{ color: '#888' }}>{profile.phone || profile.email}</div>
          </div>
        </div>
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="性别">{GENDER_MAP[profile.gender ?? 0]}</Descriptions.Item>
          <Descriptions.Item label="年龄">{profile.age ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="身高">{profile.height ? `${profile.height} cm` : '-'}</Descriptions.Item>
          <Descriptions.Item label="体重">{profile.weight ? `${profile.weight} kg` : '-'}</Descriptions.Item>
          <Descriptions.Item label="活动量">
            {profile.activityLevel ? ACTIVITY_MAP[profile.activityLevel] : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="时区">{profile.timezone}</Descriptions.Item>
          <Descriptions.Item label="微信绑定">{profile.wechatBound ? '已绑定' : '未绑定'}</Descriptions.Item>
        </Descriptions>
        <div style={{ marginTop: 16 }}>
          <Link to="/profile/setup">
            <Button type="primary">修改个人信息</Button>
          </Link>
          <Link to="/" style={{ marginLeft: 12 }}>
            <Button>返回首页</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
