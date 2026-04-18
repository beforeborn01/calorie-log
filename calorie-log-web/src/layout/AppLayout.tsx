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
        width={228}
        trigger={null}
        breakpoint="lg"
        collapsedWidth={72}
        style={{
          borderRight: '1px solid rgba(0,0,0,0.06)',
          background: '#ffffff',
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? 0 : '0 20px',
            fontWeight: 600,
            fontSize: 17,
            letterSpacing: '-0.01em',
            color: '#1d1d1f',
          }}
        >
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
          style={{ border: 'none', padding: '8px 0' }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            height: 56,
            padding: '0 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255,255,255,0.8)',
            backdropFilter: 'saturate(180%) blur(20px)',
            WebkitBackdropFilter: 'saturate(180%) blur(20px)',
            borderBottom: '1px solid rgba(0,0,0,0.06)',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <button
            type="button"
            aria-label={collapsed ? '展开侧边栏' : '收起侧边栏'}
            title={collapsed ? '展开侧边栏' : '收起侧边栏'}
            style={{
              cursor: 'pointer',
              fontSize: 18,
              background: 'none',
              border: 'none',
              padding: 6,
              borderRadius: 8,
              color: 'rgba(0,0,0,0.72)',
            }}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </button>
          <div style={{ color: 'rgba(0,0,0,0.48)', fontSize: 12, letterSpacing: '-0.01em' }}>
            <kbd
              style={{
                background: 'rgba(0,0,0,0.06)',
                borderRadius: 6,
                padding: '2px 6px',
                fontSize: 11,
                fontFamily: 'inherit',
              }}
            >
              ⌘ K
            </kbd>{' '}
            快速添加食物
          </div>
          <Dropdown menu={{ items: userMenu }} placement="bottomRight">
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar size="small" style={{ background: '#0071e3' }}>
                {profile?.nickname?.[0] ?? 'U'}
              </Avatar>
              <Typography.Text style={{ color: '#1d1d1f' }}>
                {profile?.nickname ?? '未登录'}
              </Typography.Text>
            </div>
          </Dropdown>
        </Header>
        <Content style={{ background: '#f5f5f7' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
