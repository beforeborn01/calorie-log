import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ConfigProvider, Spin, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';

// 遵循 calorie-log-web/DESIGN.md
const designTheme = {
  token: {
    colorPrimary: '#0071e3',
    colorInfo: '#0071e3',
    colorLink: '#0066cc',
    colorLinkHover: '#0066cc',
    colorLinkActive: '#0066cc',
    colorText: '#1d1d1f',
    colorTextSecondary: 'rgba(0, 0, 0, 0.56)',
    colorTextTertiary: 'rgba(0, 0, 0, 0.4)',
    colorBgLayout: '#f5f5f7',
    colorBgContainer: '#ffffff',
    colorBorder: 'rgba(0, 0, 0, 0.08)',
    colorBorderSecondary: 'rgba(0, 0, 0, 0.06)',
    borderRadius: 12,
    borderRadiusLG: 14,
    borderRadiusSM: 8,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "PingFang SC", "Helvetica Neue", Helvetica, Arial, "Microsoft YaHei", sans-serif',
    fontSize: 15,
    fontSizeHeading1: 34,
    fontSizeHeading2: 24,
    fontSizeHeading3: 20,
    lineHeight: 1.47,
    boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 2px 14px rgba(0,0,0,0.04)',
    boxShadowSecondary: '0 1px 2px rgba(0,0,0,0.04), 0 2px 10px rgba(0,0,0,0.03)',
    controlHeight: 36,
    controlHeightLG: 42,
  },
  algorithm: theme.defaultAlgorithm,
  components: {
    Button: {
      borderRadius: 8,
      borderRadiusLG: 10,
      controlHeight: 36,
      fontWeight: 500,
    },
    Layout: {
      headerBg: 'rgba(255, 255, 255, 0.8)',
      bodyBg: '#f5f5f7',
      siderBg: '#ffffff',
    },
    Menu: {
      itemBg: 'transparent',
      itemSelectedBg: 'rgba(0, 113, 227, 0.08)',
      itemSelectedColor: '#0071e3',
      itemHoverBg: 'rgba(0, 0, 0, 0.04)',
      itemBorderRadius: 8,
      itemMarginInline: 8,
    },
    Card: {
      borderRadiusLG: 14,
      boxShadowTertiary: '0 1px 2px rgba(0,0,0,0.04), 0 2px 14px rgba(0,0,0,0.04)',
    },
    Table: {
      headerBg: '#f7f7f9',
      headerColor: 'rgba(0,0,0,0.56)',
      borderColor: 'rgba(0, 0, 0, 0.06)',
    },
    Tag: {
      defaultBg: 'rgba(0, 0, 0, 0.04)',
      defaultColor: 'rgba(0, 0, 0, 0.72)',
    },
    Progress: {
      defaultColor: '#0071e3',
    },
    Statistic: {
      titleFontSize: 13,
    },
    Input: {
      borderRadius: 10,
      controlHeight: 38,
    },
    InputNumber: {
      borderRadius: 10,
      controlHeight: 38,
    },
    Select: {
      borderRadius: 10,
      controlHeight: 38,
    },
    DatePicker: {
      borderRadius: 10,
      controlHeight: 38,
    },
  },
};
import AppLayout from './layout/AppLayout';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import ErrorBoundary from './components/ErrorBoundary';
import ScrollToTop from './components/ScrollToTop';
import { useAuthStore } from './store/auth';
import { tokenStore } from './api/client';

// 热页面保留同步：首页、个人中心、Profile Setup、AddFood
import HomePage from './pages/home/HomePage';
import ProfilePage from './pages/profile/ProfilePage';
import ProfileSetupPage from './pages/profile/ProfileSetupPage';
import AddFoodPage from './pages/food/AddFoodPage';

// 重页面按需懒加载
const HistoryPage = lazy(() => import('./pages/history/HistoryPage'));
const GoalSetupPage = lazy(() => import('./pages/goal/GoalSetupPage'));
const StatisticsPage = lazy(() => import('./pages/statistics/StatisticsPage'));
const BodyPage = lazy(() => import('./pages/body/BodyPage'));
const StrengthPage = lazy(() => import('./pages/strength/StrengthPage'));
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage'));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'));
const FriendsPage = lazy(() => import('./pages/social/FriendsPage'));
const RankingPage = lazy(() => import('./pages/social/RankingPage'));
const RecognizePage = lazy(() => import('./pages/ai/RecognizePage'));
const CookingPage = lazy(() => import('./pages/ai/CookingPage'));
const FavoritesPage = lazy(() => import('./pages/ai/FavoritesPage'));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = tokenStore.get();
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function LayoutGate() {
  const profile = useAuthStore((s) => s.profile);
  if (profile && !profile.profileComplete) return <Navigate to="/profile/setup" replace />;
  return <AppLayout />;
}

function PageFallback() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
      <Spin size="large" />
    </div>
  );
}

function App() {
  return (
    <ConfigProvider locale={zhCN} theme={designTheme}>
      <ErrorBoundary>
        <BrowserRouter>
          <ScrollToTop />
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route
                path="/profile/setup"
                element={
                  <ProtectedRoute>
                    <ProfileSetupPage />
                  </ProtectedRoute>
                }
              />
              <Route
                element={
                  <ProtectedRoute>
                    <LayoutGate />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<HomePage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/food/add" element={<AddFoodPage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/goal" element={<GoalSetupPage />} />
                <Route path="/statistics" element={<StatisticsPage />} />
                <Route path="/body" element={<BodyPage />} />
                <Route path="/strength" element={<StrengthPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/friends" element={<FriendsPage />} />
                <Route path="/ranking" element={<RankingPage />} />
                <Route path="/recognize" element={<RecognizePage />} />
                <Route path="/cooking" element={<CookingPage />} />
                <Route path="/favorites" element={<FavoritesPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ErrorBoundary>
    </ConfigProvider>
  );
}

export default App;
