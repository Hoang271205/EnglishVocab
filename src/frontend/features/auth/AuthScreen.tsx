import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';
import RecoveryPage from './RecoveryPage';
import type { AuthRoute } from './useAuthRoute';
import type { useAuth } from './useAuth';
export default function AuthScreen({
  page,
  token,
  auth,
}: {
  page: AuthRoute;
  token: string;
  auth: ReturnType<typeof useAuth>;
}) {
  if (page === 'register')
    return (
      <RegisterPage
        busy={auth.busy}
        error={auth.error}
        onRegister={auth.register}
      />
    );
  if (page === 'forgot-password' || page === 'reset-password')
    return (
      <RecoveryPage
        key={`${page}:${token}`}
        reset={page === 'reset-password'}
        token={token}
      />
    );
  return (
    <LoginPage
      busy={auth.busy}
      error={auth.error}
      onLogin={async (input) => {
        const success = await auth.login(input);
        if (success) window.location.hash = '/login';
        return success;
      }}
    />
  );
}
