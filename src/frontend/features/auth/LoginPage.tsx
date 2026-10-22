import AuthLayout from './AuthLayout';
import LoginForm from './LoginForm';
import type { LoginViewProps } from './auth.types';

export default function LoginPage(props: LoginViewProps) {
  return (
    <AuthLayout title="Đăng nhập">
      <div className="login-brand">
        <span aria-hidden="true">🌱</span>
        EnglishVocab
      </div>

      <h2>Đăng nhập tài khoản học của bạn</h2>

      <p className="login-description">
        Mỗi ngày một chút, nhớ lâu hơn.
      </p>

      <LoginForm {...props} />

      <p className="login-help">
        Tài khoản do giáo viên cung cấp.
        <br />
        Liên hệ người quản lý nếu bạn cần hỗ trợ.
      </p>
    </AuthLayout>
  );
}