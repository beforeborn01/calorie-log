import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import AppLayout from './layout/AppLayout';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import HomePage from './pages/home/HomePage';
import ProfilePage from './pages/profile/ProfilePage';
import ProfileSetupPage from './pages/profile/ProfileSetupPage';
import AddFoodPage from './pages/food/AddFoodPage';
import GoalSetupPage from './pages/goal/GoalSetupPage';
import StatisticsPage from './pages/statistics/StatisticsPage';
import BodyPage from './pages/body/BodyPage';
import StrengthPage from './pages/strength/StrengthPage';
import ReportsPage from './pages/reports/ReportsPage';
import SettingsPage from './pages/settings/SettingsPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import FriendsPage from './pages/social/FriendsPage';
import RankingPage from './pages/social/RankingPage';
import RecognizePage from './pages/ai/RecognizePage';
import CookingPage from './pages/ai/CookingPage';
import FavoritesPage from './pages/ai/FavoritesPage';
import HistoryPage from './pages/history/HistoryPage';
import { useAuthStore } from './store/auth';
import { tokenStore } from './api/client';

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

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <BrowserRouter>
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
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
