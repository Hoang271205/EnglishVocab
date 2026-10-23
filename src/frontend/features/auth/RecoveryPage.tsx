import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import AuthLayout from './AuthLayout';
import PasswordField from './PasswordField';
import FormField from '../../components/ui/FormField';
import Button from '../../components/ui/Button';
import StatusMessage from '../../components/ui/StatusMessage';
import { API_UNAUTHORIZED_EVENT, getErrorMessage } from '../../api/client';
import { authApi } from './auth.api';
interface Props {
  token?: string;
  reset?: boolean;
}
export default function RecoveryPage({ token = '', reset = false }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const lock = useRef(false);
  const validToken = /^[A-Za-z0-9_-]{43}$/.test(token);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    if (reset && password !== confirm) {
      setError('Hai mật khẩu chưa trùng nhau.');
      return;
    }
    lock.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = reset
        ? await authApi.resetPassword(token, password)
        : await authApi.forgotPassword(email.trim().toLowerCase());
      setNotice(result.message);
      setPassword('');
      setConfirm('');
      if (reset) {
        window.dispatchEvent(new Event(API_UNAUTHORIZED_EVENT));
        window.history.replaceState(
          null,
          '',
          `${window.location.pathname}${window.location.search}#/reset-password`,
        );
      }
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <AuthLayout title={reset ? 'Đặt lại mật khẩu' : 'Quên mật khẩu'}>
      <h2>{reset ? 'Tạo mật khẩu mới' : 'Lấy lại quyền truy cập'}</h2>
      <p className="login-description">
        {reset
          ? 'Dùng mật khẩu ít nhất 12 ký tự để bảo vệ tài khoản.'
          : 'Nhập email tài khoản để nhận liên kết khôi phục.'}
      </p>
      {reset && !validToken && !notice ? (
        <div className="login-form">
          <StatusMessage tone="error">
            Liên kết không hợp lệ. Hãy yêu cầu email khôi phục mới.
          </StatusMessage>
          <a href="#/forgot-password">Yêu cầu liên kết mới</a>
        </div>
      ) : (
        <form className="login-form" onSubmit={submit} aria-busy={busy}>
          {!notice &&
            (reset ? (
              <>
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
              </>
            ) : (
              <FormField
                label="Email tài khoản"
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                disabled={busy}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@gmail.com"
              />
            ))}
          {error && <StatusMessage tone="error">{error}</StatusMessage>}
          {notice && <StatusMessage>{notice}</StatusMessage>}
          {!notice && (
            <Button
              type="submit"
              icon={reset ? 'lock' : 'mail'}
              loading={busy}
              disabled={
                reset ? password.length < 12 || !confirm : !email.trim()
              }
            >
              {reset ? 'Lưu mật khẩu mới' : 'Gửi liên kết khôi phục'}
            </Button>
          )}
          {notice && !reset && (
            <button
              className="auth-text-button"
              type="button"
              onClick={() => setNotice(null)}
            >
              Dùng email khác hoặc gửi lại sau 1 phút
            </button>
          )}
        </form>
      )}
      <p className="login-help">
        <a href="#/login">Quay lại đăng nhập</a>
        {reset && error && (
          <>
            <br />
            <a href="#/forgot-password">Yêu cầu liên kết mới</a>
          </>
        )}
      </p>
    </AuthLayout>
  );
}
