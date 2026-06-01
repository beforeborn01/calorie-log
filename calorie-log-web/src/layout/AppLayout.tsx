import { useEffect, useMemo, useState } from 'react';
import { Avatar, Drawer, Dropdown, Layout, Menu, Typography, message } from 'antd';
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
  MenuOutlined,
  MenuUnfoldOutlined,
  PlusOutlined,
  ScheduleOutlined,
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
import { useAddFoodStore } from '../store/addFood';
import AddFoodModal from '../components/AddFoodModal';
import type { UserProfile } from '../types';
import { FEATURES, type FeatureKey } from '../config/features';

const { Sider, Header, Content } = Layout;

type NavLeaf = {
  key: string;
  path: string;
  label: string;
  icon: React.ReactNode;
  flag?: FeatureKey;
};

type NavGroup = {
  key: string;
  label: string;
  icon: React.ReactNode;
  children: NavLeaf[];
};

type NavItem = NavLeaf | NavGroup;

const isGroup = (n: NavItem): n is NavGroup => 'children' in n;

const NAV_ALL: NavItem[] = [
  { key: 'home', path: '/', label: '首页', icon: <HomeOutlined /> },
  { key: 'history', path: '/history', label: '历史记录', icon: <HistoryOutlined /> },
  { key: 'goal', path: '/goal', label: '健身目标', icon: <TrophyOutlined /> },
  { key: 'statistics', path: '/statistics', label: '每日统计', icon: <BarChartOutlined /> },
  { key: 'body', path: '/body', label: '体重体脂', icon: <HeartOutlined /> },
  {
    key: 'sport',
    label: '运动管理',
    icon: <ThunderboltOutlined />,
    children: [
      { key: 'sport-quick', path: '/strength', label: '运动速记', icon: <PlusOutlined /> },
      { key: 'sport-plans', path: '/training/plans', label: '计划', icon: <ScheduleOutlined /> },
      { key: 'sport-history', path: '/training/history', label: '历史', icon: <HistoryOutlined /> },
      { key: 'sport-stats', path: '/training/stats', label: '统计', icon: <BarChartOutlined /> },
    ],
  },
  { key: 'reports', path: '/reports', label: '周月报告', icon: <DashboardOutlined /> },
  { key: 'friends', path: '/friends', label: '好友', icon: <TeamOutlined /> },
  { key: 'ranking', path: '/ranking', label: '排行榜', icon: <CrownOutlined /> },
  { key: 'recognize', path: '/recognize', label: '拍照识别', icon: <CameraOutlined />, flag: 'aiRecognize' },
  { key: 'cooking', path: '/cooking', label: '烹饪推荐', icon: <ExperimentOutlined />, flag: 'aiCooking' },
  { key: 'favorites', path: '/favorites', label: '烹饪收藏', icon: <HeartOutlined />, flag: 'aiFavorites' },
  { key: 'settings', path: '/settings', label: '设置', icon: <SettingOutlined /> },
];

const NAV: NavItem[] = NAV_ALL.flatMap((n): NavItem[] => {
  if (isGroup(n)) {
    const kids = n.children.filter((c) => !c.flag || FEATURES[c.flag]);
    return kids.length === 0 ? [] : [{ ...n, children: kids }];
  }
  return !n.flag || FEATURES[n.flag] ? [n] : [];
});

const NAV_LEAVES: NavLeaf[] = NAV.flatMap((n) => (isGroup(n) ? n.children : [n]));

const MOBILE_BREAKPOINT = 768;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false,
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const on = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches);
    on(mq);
    mq.addEventListener('change', on as (e: MediaQueryListEvent) => void);
    return () => mq.removeEventListener('change', on as (e: MediaQueryListEvent) => void);
  }, []);
  return isMobile;
}

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);
  const doLogout = useAuthStore((s) => s.logout);

  useEffect(() => {
    if (!profile) {
      apiGet<UserProfile>('/users/profile').then(setProfile).catch(() => undefined);
    }
  }, [profile, setProfile]);

  // Ctrl/Cmd + K 快捷键：打开添加食物弹窗（默认今天 · 早餐）
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        useAddFoodStore.getState().openModal(dayjs().format('YYYY-MM-DD'), 1);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const selectedKey = useMemo(() => {
    // 子项的 path 比父级更具体（如 /training/plans），按声明顺序匹配第一个命中即可
    const hit = NAV_LEAVES.find((n) =>
      n.path === '/' ? location.pathname === '/' : location.pathname.startsWith(n.path)
    );
    return hit?.key ?? 'home';
  }, [location.pathname]);

  const openKeys = useMemo(
    () => NAV.filter(isGroup).filter((g) => g.children.some((c) => c.key === selectedKey)).map((g) => g.key),
    [selectedKey]
  );

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

  const menuItems: MenuProps['items'] = NAV.map((n) =>
    isGroup(n)
      ? {
          key: n.key,
          icon: n.icon,
          label: n.label,
          children: n.children.map((c) => ({ key: c.key, icon: c.icon, label: c.label })),
        }
      : { key: n.key, icon: n.icon, label: n.label }
  );

  const menuEl = (
    <Menu
      mode="inline"
      selectedKeys={[selectedKey]}
      defaultOpenKeys={openKeys}
      onClick={({ key }) => {
        const item = NAV_LEAVES.find((n) => n.key === key);
        if (item) {
          navigate(item.path);
          setDrawerOpen(false);
        }
      }}
      items={menuItems}
      style={{ border: 'none', padding: '8px 0' }}
    />
  );

  const brand = (compact: boolean) => (
    <div
      className="display"
      style={{
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: compact ? 'center' : 'flex-start',
        padding: compact ? 0 : '0 20px',
        fontSize: compact ? 22 : 22,
        color: 'var(--ink)',
      }}
    >
      {compact ? '🥗' : '🥗 食养记'}
    </div>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {!isMobile && (
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
            borderRight: '1.5px dashed rgba(0,0,0,0.12)',
            background: 'var(--paper)',
          }}
        >
          {brand(collapsed)}
          {menuEl}
        </Sider>
      )}
      {isMobile && (
        <Drawer
          placement="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          closable={false}
          styles={{ wrapper: { width: 260 }, body: { padding: 0, background: 'var(--paper)' }, header: { display: 'none' } }}
        >
          {brand(false)}
          {menuEl}
        </Drawer>
      )}
      <Layout>
        <Header
          style={{
            height: 56,
            padding: isMobile ? '0 12px' : '0 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(250,247,241,0.9)',
            borderBottom: '1.5px dashed rgba(0,0,0,0.12)',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <button
            type="button"
            aria-label="菜单"
            title="菜单"
            style={{
              cursor: 'pointer',
              fontSize: 18,
              background: 'none',
              border: 'none',
              padding: 6,
              borderRadius: 8,
              color: 'var(--ink-soft)',
            }}
            onClick={() => (isMobile ? setDrawerOpen(true) : setCollapsed(!collapsed))}
          >
            {isMobile ? <MenuOutlined /> : collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </button>
          {!isMobile && (
            <div className="hand ink-soft" style={{ fontSize: 13 }}>
              <kbd
                className="mono"
                style={{
                  background: 'var(--paper-2)',
                  borderRadius: 6,
                  padding: '2px 6px',
                  fontSize: 11,
                }}
              >
                ⌘ K
              </kbd>{' '}
              快速添加食物
            </div>
          )}
          <Dropdown menu={{ items: userMenu }} placement="bottomRight">
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar size="small" style={{ background: 'var(--accent)' }}>
                {profile?.nickname?.[0] ?? 'U'}
              </Avatar>
              {!isMobile && (
                <Typography.Text className="hand" style={{ color: 'var(--ink)' }}>
                  {profile?.nickname ?? '未登录'}
                </Typography.Text>
              )}
            </div>
          </Dropdown>
        </Header>
        <Content style={{ background: 'var(--paper)' }}>
          <Outlet />
        </Content>
      </Layout>
      <AddFoodModal />
    </Layout>
  );
}
