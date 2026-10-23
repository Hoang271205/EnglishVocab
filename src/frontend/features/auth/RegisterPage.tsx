import { useState } from 'react';
import type { FormEvent } from 'react';
import AuthLayout from './AuthLayout';
import PasswordField from './PasswordField';
import FormField from '../../components/ui/FormField';
import Button from '../../components/ui/Button';
import StatusMessage from '../../components/ui/StatusMessage';
import type { RegisterCredentials } from './auth.types';
interface Props {
  busy: boolean;
  error: string | null;
  onRegister: (input: RegisterCredentials) => Promise<boolean>;
}
export default function RegisterPage({ busy, error, onRegister }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (password !== confirm) {
      setLocalError('Hai mật khẩu chưa trùng nhau.');
      return;
    }
    setLocalError(null);
    if (
      await onRegister({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      })
    )
      window.location.hash = '/login';
  }
  return (
    <AuthLayout title="Tạo tài khoản">
      <h2>Bắt đầu hành trình của bạn</h2>
      <p className="login-description">Lưu từ mới và tiến bộ mỗi ngày.</p>
      <form className="login-form" onSubmit={submit} aria-busy={busy}>
        <FormField
          label="Tên của bạn"
          name="name"
          autoComplete="name"
          required
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={busy}
          placeholder="Bạn muốn được gọi là gì?"
        />
        <FormField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          required
          maxLength={254}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={busy}
          placeholder="you@gmail.com"
        />
        <PasswordField
          value={password}
          onChange={setPassword}
          disabled={busy}
        />
        <PasswordField
          label="Xác nhận mật khẩu"
          value={confirm}
          onChange={setConfirm}
          disabled={busy}
        />
        {(localError || error) && (
          <StatusMessage tone="error">{localError || error}</StatusMessage>
        )}
        <Button
          type="submit"
          icon="arrow"
          loading={busy}
          disabled={
            !name.trim() || !email.trim() || password.length < 12 || !confirm
          }
        >
          Tạo tài khoản
        </Button>
      </form>
      <p className="login-help">
        Đã có tài khoản? <a href="#/login">Đăng nhập</a>
      </p>
    </AuthLayout>
  );
}
