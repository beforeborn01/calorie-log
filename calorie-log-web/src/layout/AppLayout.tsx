import { useEffect, useMemo, useState } from 'react';
import { Avatar, Dropdown, Layout, Menu, Typography, message } from 'antd';
import type { MenuProps } from 'antd';
import {
  BarChartOutlined,
  CameraOutlined,
  CrownOutlined,
  DashboardOutlined,
  ExperimentOutlined,
  HeartOutlined,
  HistoryOutlined,
  HomeOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SettingOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  TrophyOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { logout } from '../api/auth';
import { apiGet } from '../api/client';
import { useAuthStore } from '../store/auth';
import type { UserProfile } from '../types';

const { Sider, Header, Content } = Layout;

const NAV: { key: string; path: string; label: string; icon: React.ReactNode }[] = [
  { key: 'home', path: '/', label: '首页', icon: <HomeOutlined /> },
  { key: 'history', path: '/history', label: '历史记录', icon: <HistoryOutlined /> },
  { key: 'goal', path: '/goal', label: '健身目标', icon: <TrophyOutlined /> },
  { key: 'statistics', path: '/statistics', label: '每日统计', icon: <BarChartOutlined /> },
  { key: 'body', path: '/body', label: '体重体脂', icon: <HeartOutlined /> },
  { key: 'strength', path: '/strength', label: '力量训练', icon: <ThunderboltOutlined /> },
  { key: 'reports', path: '/reports', label: '周月报告', icon: <DashboardOutlined /> },
  { key: 'friends', path: '/friends', label: '好友', icon: <TeamOutlined /> },
  { key: 'ranking', path: '/ranking', label: '排行榜', icon: <CrownOutlined /> },
  { key: 'recognize', path: '/recognize', label: '拍照识别', icon: <CameraOutlined /> },
  { key: 'cooking', path: '/cooking', label: '烹饪推荐', icon: <ExperimentOutlined /> },
  { key: 'favorites', path: '/favorites', label: '烹饪收藏', icon: <HeartOutlined /> },
  { key: 'settings', path: '/settings', label: '设置', icon: <SettingOutlined /> },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);
  const doLogout = useAuthStore((s) => s.logout);

  useEffect(() => {
    if (!profile) {
      apiGet<UserProfile>('/users/profile').then(setProfile).catch(() => undefined);
    }
  }, [profile, setProfile]);

  // Ctrl/Cmd + K 快捷键：跳到添加食物
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        navigate(`/food/add?date=${dayjs().format('YYYY-MM-DD')}&meal=1`);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);

  const selectedKey = useMemo(() => {
    const hit = NAV.find((n) => (n.path === '/' ? location.pathname === '/' : location.pathname.startsWith(n.path)));
    return hit?.key ?? 'home';
  }, [location.pathname]);

  const onLogout = async () => {
    try {
      await logout();
    } catch {
      /* ignore */
    }
    doLogout();
    message.success('已登出');
    navigate('/login', { replace: true });
  };

  const userMenu: MenuProps['items'] = [
    { key: 'profile', icon: <UserOutlined />, label: '个人中心', onClick: () => navigate('/profile') },
    { type: 'divider' as const },
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: onLogout },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="light"
        width={220}
        trigger={null}
        breakpoint="lg"
        collapsedWidth={64}
      >
        <div style={{ height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18 }}>
          {collapsed ? '🥗' : '🥗 食养记'}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          onClick={({ key }) => {
            const item = NAV.find((n) => n.key === key);
            if (item) navigate(item.path);
          }}
          items={NAV.map(({ key, label, icon }) => ({ key, icon, label }))}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <button
            type="button"
            aria-label={collapsed ? '展开侧边栏' : '收起侧边栏'}
            title={collapsed ? '展开侧边栏' : '收起侧边栏'}
            style={{ cursor: 'pointer', fontSize: 18, background: 'none', border: 'none', padding: 0 }}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </button>
          <div style={{ color: '#888', fontSize: 12 }}>
            ⌨︎ 快捷键 <kbd>Ctrl/⌘ + K</kbd> 快速添加食物
          </div>
          <Dropdown menu={{ items: userMenu }} placement="bottomRight">
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar size="small">{profile?.nickname?.[0] ?? 'U'}</Avatar>
              <Typography.Text>{profile?.nickname ?? '未登录'}</Typography.Text>
            </div>
          </Dropdown>
        </Header>
        <Content style={{ background: '#f5f5f5' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
