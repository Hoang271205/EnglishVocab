import StatusMessage from './components/ui/StatusMessage';
import AuthLayout from './features/auth/AuthLayout';
import LoginPage from './features/auth/LoginPage';
import { useAuth } from './features/auth/useAuth';
import Workspace from './features/workspace/Workspace';
import { LearningProvider } from './features/learning/LearningContext';

export default function App() {
  const auth = useAuth();

  if (auth.checking) {
    return (
      <AuthLayout title="Đăng nhập">
        <StatusMessage>
          Đang kiểm tra phiên đăng nhập…
        </StatusMessage>
      </AuthLayout>
    );
  }

  if (!auth.user) {
    return (
      <LoginPage
        busy={auth.busy}
        error={auth.error}
        onLogin={auth.login}
      />
    );
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