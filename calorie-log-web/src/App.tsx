import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ConfigProvider, Spin } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { antdTheme } from './theme/antd-theme';
import { SketchFilters } from './components/sketch/SketchBox';
import AppLayout from './layout/AppLayout';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import ErrorBoundary from './components/ErrorBoundary';
import ScrollToTop from './components/ScrollToTop';
import { useAuthStore } from './store/auth';
import { tokenStore } from './api/client';

// 热页面保留同步：首页、个人中心、Profile Setup（添加食物改为弹窗，挂在 AppLayout）
import HomePage from './pages/home/HomePage';
import ProfilePage from './pages/profile/ProfilePage';
import ProfileSetupPage from './pages/profile/ProfileSetupPage';

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
    <ConfigProvider locale={zhCN} theme={antdTheme}>
      <SketchFilters />
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
