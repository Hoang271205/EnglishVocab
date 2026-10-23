import { useEffect, useRef, useState } from 'react';
import { importQueueFile, previewQueueFile } from './queueFiles';
import type { QueuePreview } from './queueFiles';

type QueueImportPanelProps = {
  disabled: boolean;
  onImported: () => void;
};

export default function QueueImportPanel({
  disabled,
  onImported,
}: QueueImportPanelProps) {
  const [preview, setPreview] = useState<QueuePreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lock = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  async function run(action: () => Promise<void>) {
    if (lock.current || disabled) return;

    lock.current = true;
    setBusy(true);
    setNotice(null);
    setError(null);

    try {
      await action();
    } catch (cause: unknown) {
      if (mounted.current) {
        setError(
          cause instanceof Error
            ? cause.message
            : 'Không xử lý được file hàng đợi.',
        );
      }
    } finally {
      lock.current = false;

      if (mounted.current) setBusy(false);
    }
  }

  async function chooseFile(file: File) {
    await run(async () => {
      setPreview(null);

      const result = await previewQueueFile(file);

      if (mounted.current) setPreview(result);
    });
  }

  async function importFile() {
    if (!preview) return;

    await run(async () => {
      const result = await importQueueFile(preview.transfer);

      if (!mounted.current) return;

      setPreview(null);
      setNotice(
        `Đã thêm ${result.newEntries} mục từ và ` +
          `${result.newCaptures} ngữ cảnh; ` +
          `${result.duplicateCaptures} lượt lưu đã có được bỏ qua.`,
      );

      onImported();
    });
  }

  const blocked = disabled || busy;

  return (
    <section className="entry-details" aria-labelledby="queue-import-title">
      <h2 id="queue-import-title">Nhập file hàng đợi extension</h2>

      <p className="topic-message">
        Dùng file englishvocab-queue đã xuất từ extension. Nhập file sẽ bổ sung
        từ và ngữ cảnh vào web.
      </p>

      <label className="lookup-label">
        Chọn file hàng đợi JSON
        <input
          type="file"
          accept=".json,application/json"
          disabled={blocked}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];

            event.currentTarget.value = '';

            if (file) void chooseFile(file);
          }}
        />
      </label>

      {busy && <p role="status">Đang xử lý…</p>}

      {preview && (
        <div className="review-result">
          <h3>{preview.fileName}</h3>

          <p>Từ mới: {preview.summary.newEntries}</p>
          <p>Bản nháp mới: {preview.summary.drafts}</p>
          <p>Ngữ cảnh mới: {preview.summary.newCaptures}</p>
          <p>Lượt lưu đã có: {preview.summary.duplicateCaptures}</p>

          <p className="draft-status">
            Từ đã có giữ nguyên nội dung và tiến độ. Kết quả sẽ được kiểm tra
            lại khi nhập.
          </p>

          <div className="study-answer-actions">
            <button
              className="primary-button"
              type="button"
              disabled={blocked}
              onClick={() => void importFile()}
            >
              Nhập hàng đợi
            </button>

            <button
              className="secondary-button"
              type="button"
              disabled={blocked}
              onClick={() => setPreview(null)}
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      <p className="draft-status">
        Nhập file không xóa hàng đợi trong extension. Khi dùng Nhận từ extension
        sau đó, các lượt lưu đã có sẽ được nhận diện trước khi xác nhận hoàn
        tất.
      </p>

      {notice && (
        <p className="study-notice is-success" role="status">
          {notice}
        </p>
      )}

      {error && (
        <p className="load-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
