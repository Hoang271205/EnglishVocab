import LoginForm from './LoginForm';
import { useAccount } from './useAccount';

export default function AccountPage() {
  const model = useAccount();

  return (
    <main className="account-page">
      <header>
        <strong>🌱 EnglishVocab</strong>
        <p>Tài khoản extension</p>
      </header>

      {model.loading ? (
        <p role="status">Đang kiểm tra tài khoản…</p>
      ) : model.user ? (
        <section>
          <h1>Chào {model.user.name}!</h1>

          <p>{model.user.email}</p>

          <p>Các từ bạn lưu sẽ được gửi trực tiếp lên tài khoản này.</p>

          <button
            type="button"
            disabled={model.busy}
            onClick={() => void model.logout()}
          >
            {model.busy ? 'Đang xử lý…' : 'Đăng xuất'}
          </button>
        </section>
      ) : (
        <section>
          <h1>Đăng nhập</h1>

          <p>Dùng tài khoản EnglishVocab của bạn.</p>

          <LoginForm busy={model.busy} onLogin={model.login} />
        </section>
      )}

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
