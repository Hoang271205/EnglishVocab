import Mascot from '../../components/mascot/Mascot';
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
  const recovery = title === 'Quên mật khẩu' || title === 'Đặt lại mật khẩu';
  const register = title === 'Đăng ký' || title === 'Tạo tài khoản';
  const story = recovery
    ? 'Mình giúp bạn quay lại nhé!'
    : register
      ? 'Bắt đầu hành trình học từ mới.'
      : 'Thêm từ mới. Mở thêm thế giới.';
  const message = recovery
    ? 'Mình cùng tiếp tục hành trình học nhé!'
    : register
      ? 'Mình cùng lớn lên mỗi ngày nhé!'
      : 'Chào mừng bạn đến với EnglishVocab!';
  return (
    <main className="login-page">
      <section
        className={`login-panel login-panel--${recovery ? 'recovery' : register ? 'register' : 'login'}`}
        aria-labelledby="auth-title"
      >
        <aside className="auth-story">
          <Brand />
          <div className="auth-story-copy">
            <p className="eyebrow">MỖI NGÀY MỘT CHÚT</p>
            <h2>
              {!recovery && !register ? (
                <>
                  <span className="auth-headline-line">Thêm từ mới.</span>
                  <span className="auth-headline-line">Mở thêm thế giới.</span>
                </>
              ) : (
                story
              )}
            </h2>
            <p>
              Một góc nhỏ để lưu từ, luyện tập và nhìn thấy sự tiến bộ của chính
              bạn.
            </p>
            <div className="auth-mascot-scene">
              <Mascot
                mood={recovery ? 'encourage' : 'welcome'}
                message={message}
              />
              {!recovery && (
                <div className="auth-vocab-card">
                  <span className="auth-card-icon">
                    <Icon name="sprout" />
                  </span>
                  <span className="eyebrow">TỪ CỦA NGÀY</span>
                  <strong>grow</strong>
                  <span>/ɡroʊ/ · động từ</span>
                  <p>lớn lên, phát triển</p>
                  <small>Mỗi lần ôn, nhớ thêm một chút.</small>
                </div>
              )}
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
