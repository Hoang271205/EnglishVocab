import Button from '../../components/ui/Button';
import FormField from '../../components/ui/FormField';
import StatusMessage from '../../components/ui/StatusMessage';
import type { LoginViewProps } from './auth.types';
import { useLoginForm } from './useLoginForm';

export default function LoginForm({
  busy,
  error,
  onLogin,
}: LoginViewProps) {
  const form = useLoginForm(onLogin, busy);

  return (
    <form
      className="login-form"
      onSubmit={form.submit}
      aria-busy={busy}
    >
      <FormField
        label="Email"
        name="email"
        type="email"
        autoComplete="username"
        autoCapitalize="none"
        placeholder="Nhập email tài khoản học"
        value={form.email}
        onChange={(event) =>
          form.setEmail(event.target.value)
        }
        maxLength={254}
        spellCheck={false}
        disabled={busy}
        required
      />

      <FormField
        label="Mật khẩu"
        name="password"
        type={form.showPassword ? 'text' : 'password'}
        autoComplete="current-password"
        placeholder="Nhập mật khẩu của bạn"
        value={form.password}
        onChange={(event) =>
          form.setPassword(event.target.value)
        }
        maxLength={128}
        disabled={busy}
        required
        trailing={
          <button
            className="login-password-toggle"
            type="button"
            aria-label={
              form.showPassword
                ? 'Ẩn mật khẩu'
                : 'Hiện mật khẩu'
            }
            aria-pressed={form.showPassword}
            onClick={form.togglePassword}
            disabled={busy}
          >
            {form.showPassword ? 'Ẩn' : 'Hiện'}
          </button>
        }
      />

      {error && (
        <StatusMessage tone="error">
          {error}
        </StatusMessage>
      )}

      <Button
        type="submit"
        className="login-submit"
        loading={busy}
        disabled={!form.canSubmit}
      >
        {busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
      </Button>
    </form>
  );
}