import Brand from './components/ui/Brand';
import LoadingSkeleton from './components/ui/LoadingSkeleton';
import AuthLayout from './features/auth/AuthLayout';
import { useAuthRoute } from './features/auth/useAuthRoute';
import { lazy, useEffect } from 'react';
import { useAuth } from './features/auth/useAuth';
import { LearningProvider } from './features/learning/LearningContext';

const WelcomePage = lazy(() => import('./features/welcome/WelcomePage'));
const NotFoundPage = lazy(() => import('./features/auth/NotFoundPage'));
const AuthScreen = lazy(() => import('./features/auth/AuthScreen'));
const Workspace = lazy(() => import('./features/workspace/Workspace'));

export default function App() {
  const auth = useAuth();
  const route = useAuthRoute();
  const clearAuthError = auth.clearError;
  useEffect(() => {
    clearAuthError();
  }, [route.page, clearAuthError]);
  useEffect(() => {
    const titles = {
      welcome: 'Gieo một từ mới, mở thêm thế giới',
      login: 'Đăng nhập',
      register: 'Tạo tài khoản',
      'forgot-password': 'Quên mật khẩu',
      'reset-password': 'Đặt lại mật khẩu',
      'not-found': 'Mình đi lạc rồi',
    };
    document.title = `EnglishVocab — ${auth.user && route.page !== 'reset-password' && route.page !== 'not-found' ? 'Góc học tập của bạn' : titles[route.page]}`;
    window.scrollTo(0, 0);
  }, [route.page, auth.user]);

  if (route.page === 'not-found') return <NotFoundPage />;

  if (auth.checking) {
    return route.page === 'welcome' ? (
      <main className="arrival-loading">
        <Brand />
        <span className="arrival-sprout" aria-hidden="true" />
        <p role="status">Đang mở góc học nhỏ của bạn…</p>
      </main>
    ) : (
      <AuthLayout title="Đăng nhập">
        <LoadingSkeleton variant="auth" label="Đang kiểm tra phiên đăng nhập" />
      </AuthLayout>
    );
  }

  if (!auth.user && route.page === 'welcome') return <WelcomePage />;

  if (!auth.user || route.page === 'reset-password') {
    return <AuthScreen page={route.page} token={route.token} auth={auth} />;
  }

  return (
    <LearningProvider key={auth.user.id}>
      <Workspace
        user={auth.user}
        busy={auth.busy}
        authError={auth.error}
        onLogout={auth.logout}
      />
    </LearningProvider>
  );
}
