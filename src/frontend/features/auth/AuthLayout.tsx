import type { ReactNode } from 'react';
import Brand from '../../components/ui/Brand';
import Icon from '../../components/ui/Icon';
export default function AuthLayout({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="auth-title">
        <aside className="auth-story">
          <Brand />
          <div className="auth-story-copy">
            <p className="eyebrow">MỖI NGÀY MỘT CHÚT</p>
            <h2>
              Thêm từ mới.
              <br />
              Mở thêm thế giới.
            </h2>
            <p>
              Một góc nhỏ để lưu từ, luyện tập và nhìn thấy sự tiến bộ của chính
              bạn.
            </p>
            <div className="auth-vocab-card">
              <span className="auth-card-icon">
                <Icon name="sprout" />
              </span>
              <span className="eyebrow">TỪ CỦA NGÀY</span>
              <strong>grow</strong>
              <span>/ɡroʊ/ · động từ</span>
              <p>lớn lên, phát triển</p>
              <div className="auth-card-progress">
                <span />
              </div>
              <small>Mỗi lần ôn, nhớ thêm một chút.</small>
            </div>
          </div>
          <p className="auth-story-footer">
            <Icon name="shield" /> Tiến độ học được lưu theo tài khoản.
          </p>
        </aside>
        <div className="auth-main">
          <header className="login-topbar">
            <h1 id="auth-title">{title}</h1>
          </header>
          <div className="login-content">{children}</div>
        </div>
      </section>
    </main>
  );
}
