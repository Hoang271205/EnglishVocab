import { useEffect, useRef, useState } from 'react';
import { importContentFile, previewContentFile } from './contentFiles';
import type { ContentPreview } from './contentFiles';

type ContentImportPanelProps = {
  disabled: boolean;
  onImported: () => void;
};

export default function ContentImportPanel({
  disabled,
  onImported,
}: ContentImportPanelProps) {
  const [preview, setPreview] = useState<ContentPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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
    setError(null);
    setNotice(null);

    try {
      await action();
    } catch (cause: unknown) {
      if (mounted.current) {
        setError(
          cause instanceof Error ? cause.message : 'Không xử lý được gói từ.',
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

      const result = await previewContentFile(file);

      if (mounted.current) {
        setPreview(result);
      }
    });
  }

  async function importFile() {
    if (!preview) return;

    await run(async () => {
      const result = await importContentFile(preview.pack);

      if (!mounted.current) return;

      setPreview(null);
      setNotice(
        `Đã nhập: ${result.added} mục mới, ` +
          `${result.updated} mục cập nhật, ` +
          `${result.unchanged} mục không đổi.`,
      );

      onImported();
    });
  }

  const blocked = disabled || busy;

  return (
    <section className="entry-details" aria-labelledby="content-import-title">
      <h2 id="content-import-title">Nhập gói từ</h2>

      <p className="topic-message">
        Chọn gói JSON để xem trước. Chỉ khi bấm Nhập gói từ thì dữ liệu mới được
        ghi vào thư viện.
      </p>

      <label className="lookup-label">
        Chọn gói từ JSON
        <input
          type="file"
          accept=".json,application/json"
          disabled={blocked}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];

            event.currentTarget.value = '';

            if (file) {
              void chooseFile(file);
            }
          }}
        />
      </label>

      {busy && <p role="status">Đang xử lý…</p>}

      {preview && (
        <div className="review-result">
          <h3>{preview.fileName}</h3>

          <p>Phiên bản: {preview.pack.contentVersion}</p>
          <p>Từ mới: {preview.summary.added}</p>
          <p>Cập nhật: {preview.summary.updated}</p>
          <p>Không đổi: {preview.summary.unchanged}</p>
          <p>Chủ đề trong gói: {preview.summary.topics}</p>

          <p className="draft-status">
            Khi nhập, hệ thống kiểm tra lại dữ liệu hiện tại. Kết quả có thể
            thay đổi nếu thư viện được sửa sau thời điểm xem trước.
          </p>

          <div className="study-answer-actions">
            <button
              className="primary-button"
              type="button"
              disabled={blocked}
              onClick={() => void importFile()}
            >
              Nhập gói từ
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
