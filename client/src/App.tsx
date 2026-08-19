import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './stores/authStore';
import { useThemeStore } from './stores/themeStore';

// Layout Components
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { MobileNav } from './components/layout/MobileNav';
import { AdminLayout } from './components/layout/AdminLayout';

// Public Pages
import { LandingPage } from './pages/public/LandingPage';
import { LoginPage } from './pages/public/LoginPage';
import { RegisterPage } from './pages/public/RegisterPage';
import { HowItWorksPage } from './pages/public/HowItWorksPage';
import { FaqPage } from './pages/public/FaqPage';

// User Pages
import { UserDashboardPage } from './pages/user/UserDashboardPage';
import { LobbyPage } from './pages/user/LobbyPage';
import { GameRoomPage } from './pages/user/GameRoomPage';
import { WalletPage } from './pages/user/WalletPage';
import { ProfilePage } from './pages/user/ProfilePage';
import { LeaderboardPage } from './pages/user/LeaderboardPage';
import { HistoryPage } from './pages/user/HistoryPage';
import { KenoPage } from './pages/user/KenoPage';
import { PlinkoPage } from './pages/user/PlinkoPage';
import { AviatorPage } from './pages/user/AviatorPage';

// Admin Pages
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminGamesPage } from './pages/admin/AdminGamesPage';
import { AdminKycPage } from './pages/admin/AdminKycPage';
import { AdminBetRecordsPage } from './pages/admin/AdminBetRecordsPage';
import { AdminFraudPage } from './pages/admin/AdminFraudPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 30, // 30 seconds
    },
  },
});

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

export const App: React.FC = () => {
  const { fetchCurrentUser } = useAuthStore();
  const { initTheme } = useThemeStore();

  useEffect(() => {
    initTheme();
    fetchCurrentUser();
  }, [initTheme, fetchCurrentUser]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col bg-arena-bg text-arena-text">
          <Navbar />

          <main className="flex-1">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/how-it-works" element={<HowItWorksPage />} />
              <Route path="/faq" element={<FaqPage />} />

              {/* Lobby & Game (Accessible to all, enhanced when logged in) */}
              <Route path="/lobby" element={<LobbyPage />} />
              <Route path="/aviator" element={<AviatorPage />} />
              <Route path="/keno" element={<KenoPage />} />
              <Route path="/plinko" element={<PlinkoPage />} />
              <Route path="/games/:gameId" element={<GameRoomPage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/history" element={<HistoryPage />} />

              {/* Protected User Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <UserDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/wallet"
                element={
                  <ProtectedRoute>
                    <WalletPage />
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

              {/* Admin Portal Routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<AdminDashboardPage />} />
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="games" element={<AdminGamesPage />} />
                <Route path="kyc" element={<AdminKycPage />} />
                <Route path="bet-records" element={<AdminBetRecordsPage />} />
                <Route path="audit-logs" element={<Navigate to="/admin/bet-records" replace />} />
                <Route path="fraud" element={<AdminFraudPage />} />
              </Route>

              {/* 404 Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          <Footer />
          <MobileNav />
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
