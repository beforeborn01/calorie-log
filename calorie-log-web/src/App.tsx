import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
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
import { useAuthStore } from './store/auth';
import { tokenStore } from './api/client';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = tokenStore.get();
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function App() {
  const profile = useAuthStore((s) => s.profile);
  return (
    <ConfigProvider locale={zhCN}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                {profile && !profile.profileComplete ? <Navigate to="/profile/setup" replace /> : <HomePage />}
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/setup"
            element={
              <ProtectedRoute>
                <ProfileSetupPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/food/add"
            element={
              <ProtectedRoute>
                <AddFoodPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/goal"
            element={
              <ProtectedRoute>
                <GoalSetupPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/statistics"
            element={
              <ProtectedRoute>
                <StatisticsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route
            path="/body"
            element={
              <ProtectedRoute>
                <BodyPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/strength"
            element={
              <ProtectedRoute>
                <StrengthPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <ReportsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/friends"
            element={
              <ProtectedRoute>
                <FriendsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ranking"
            element={
              <ProtectedRoute>
                <RankingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recognize"
            element={
              <ProtectedRoute>
                <RecognizePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cooking"
            element={
              <ProtectedRoute>
                <CookingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/favorites"
            element={
              <ProtectedRoute>
                <FavoritesPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
