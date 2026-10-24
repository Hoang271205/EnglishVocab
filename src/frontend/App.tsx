import LoadingSkeleton from './components/ui/LoadingSkeleton';
import AuthLayout from './features/auth/AuthLayout';
import { useAuthRoute } from './features/auth/useAuthRoute';
import { lazy, useEffect } from 'react';
import { useAuth } from './features/auth/useAuth';
import { LearningProvider } from './features/learning/LearningContext';

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

  if (route.page === 'not-found') return <NotFoundPage />;

  if (auth.checking) {
    return (
      <AuthLayout title="Đăng nhập">
        <LoadingSkeleton variant="auth" label="Đang kiểm tra phiên đăng nhập" />
      </AuthLayout>
    );
  }

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
