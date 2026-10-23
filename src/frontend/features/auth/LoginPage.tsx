import AuthLayout from './AuthLayout';
import LoginForm from './LoginForm';
import type { LoginViewProps } from './auth.types';

export default function LoginPage(props: LoginViewProps) {
  return (
    <AuthLayout title="Đăng nhập">
      <h2>Đăng nhập tài khoản học của bạn</h2>

      <p className="login-description">Mỗi ngày một chút, nhớ lâu hơn.</p>

      <LoginForm {...props} />

      <div className="login-help">
        <a href="#/forgot-password">Quên mật khẩu?</a>
        <p>
          Chưa có tài khoản? <a href="#/register">Đăng ký miễn phí</a>
        </p>
      </div>
    </AuthLayout>
  );
}
