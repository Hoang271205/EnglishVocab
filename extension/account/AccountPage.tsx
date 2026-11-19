import MascotImage from '../MascotImage';
import { APP_ORIGIN } from '../config';
import LoginForm from './LoginForm';
import QuickLookup from './QuickLookup';
import { useAccount } from './useAccount';

export default function AccountPage() {
  const model = useAccount();

  if (!model.loading && model.user) {
    return (
      <QuickLookup
        key={model.user.id}
        user={model.user}
        busy={model.busy}
        error={model.error}
        onLogout={model.logout}
      />
    );
  }

  return (
    <main className="account-page">
      <header>
        <strong className="extension-brand">
          <MascotImage /> EnglishVocab
        </strong>
        <p>Tài khoản extension</p>
        <div className="account-mascot">
          <MascotImage />
          <p>Bôi đen từ → Tra nghĩa → Lưu vào sổ tay</p>
        </div>
      </header>

      {model.loading ? (
        <p role="status">Đang kiểm tra tài khoản…</p>
      ) : (
        <section>
          <h1>Đăng nhập</h1>

          <p>Dùng tài khoản EnglishVocab của bạn.</p>

          <LoginForm busy={model.busy} onLogin={model.login} />
        </section>
      )}

      <p className="account-web-link">
        <a href={APP_ORIGIN} target="_blank" rel="noreferrer">
          Mở EnglishVocab →
        </a>
      </p>
      {model.error && (
        <div className="message" role="alert">
          <p>{model.error}</p>

          <button
            type="button"
            className="secondary"
            disabled={model.busy || model.loading}
            onClick={model.reload}
          >
            Tải lại trạng thái
          </button>
        </div>
      )}

      {model.notice && (
        <p className="message" role="status">
          {model.notice}
        </p>
      )}
    </main>
  );
}
