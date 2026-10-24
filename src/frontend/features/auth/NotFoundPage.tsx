import Brand from '../../components/ui/Brand';
import Mascot from '../../components/mascot/Mascot';

export default function NotFoundPage() {
  return (
    <div className="not-found-page">
      <header>
        <Brand />
      </header>
      <main>
        <p className="not-found-code" aria-label="Lỗi 404">
          404
        </p>
        <Mascot mood="thinking" message="Mình cùng tìm đường về nhé!" />
        <h1>Hình như mình đi lạc rồi!</h1>
        <p>Trang bạn tìm không tồn tại hoặc đã được di chuyển.</p>
        <div className="not-found-actions">
          <a className="ui-button ui-button--primary" href="/">
            Về trang chủ
          </a>
          <button
            className="ui-button ui-button--secondary"
            type="button"
            onClick={() => {
              if (window.history.length > 1) window.history.back();
              else window.location.assign('/');
            }}
          >
            Quay lại
          </button>
        </div>
      </main>
    </div>
  );
}
