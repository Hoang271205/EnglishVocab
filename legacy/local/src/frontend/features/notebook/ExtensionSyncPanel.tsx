import { useExtensionSync } from './useExtensionSync';

type ExtensionSyncPanelProps = {
  disabled: boolean;
  onReceived: () => void;
};

export default function ExtensionSyncPanel({
  disabled,
  onReceived,
}: ExtensionSyncPanelProps) {
  const model = useExtensionSync(onReceived);
  const busy = model.operation !== null;

  return (
    <section
      className="entry-details extension-sync"
      aria-labelledby="extension-sync-title"
    >
      <h2 id="extension-sync-title">Đồng bộ extension</h2>

      <p className="topic-message">
        Nhận các từ đã lưu khi đọc website, hoặc gửi thư viện hiện tại để
        extension tra từ có sẵn trên thiết bị.
      </p>

      <div className="study-answer-actions">
        <button
          className="primary-button"
          type="button"
          disabled={disabled || busy}
          onClick={() => void model.receive()}
        >
          {model.operation === 'receive' ? 'Đang nhận…' : 'Nhận từ extension'}
        </button>

        <button
          className="secondary-button"
          type="button"
          disabled={disabled || busy}
          onClick={() => void model.sendLibrary()}
        >
          {model.operation === 'send-library'
            ? 'Đang gửi…'
            : 'Gửi thư viện sang extension'}
        </button>
      </div>

      {disabled && (
        <p className="draft-status">
          Đóng phần đang đọc hoặc chỉnh sửa để đồng bộ.
        </p>
      )}

      {model.notice && (
        <p className={`study-notice is-${model.notice.kind}`} role="status">
          {model.notice.text}
        </p>
      )}

      {model.error && (
        <div className="load-error" role="alert">
          <p>{model.error}</p>
          <p>
            Kiểm tra extension đã bật, mở web tại http://localhost:5173 và tải
            lại trang.
          </p>
        </div>
      )}
    </section>
  );
}
