import NotFoundPage from './features/auth/NotFoundPage';
import LoadingSkeleton from './components/ui/LoadingSkeleton';
import AuthLayout from './features/auth/AuthLayout';
import AuthScreen from './features/auth/AuthScreen';
import { useAuthRoute } from './features/auth/useAuthRoute';
import { useEffect } from 'react';
import { useAuth } from './features/auth/useAuth';
import Workspace from './features/workspace/Workspace';
import { LearningProvider } from './features/learning/LearningContext';

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
