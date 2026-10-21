import { useEffect, useRef, useState } from 'react';
import {
  downloadBackup,
  readBackup,
  restoreBackup,
} from './backupFiles';
import type { Backup } from './backupFiles';

type BackupPanelProps = {
  disabled: boolean;
  onRestored: () => void;
};

type Operation = 'export' | 'inspect' | 'restore';

const LAST_CHECKED_KEY = 'englishvocab.backup.lastCheckedAt';
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

function readLastChecked(): number {
  try {
    const value = Number(localStorage.getItem(LAST_CHECKED_KEY));

    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('vi-VN');
}

export default function BackupPanel({
  disabled,
  onRestored,
}: BackupPanelProps) {
  const [operation, setOperation] = useState<Operation | null>(null);
  const [preview, setPreview] = useState<Backup | null>(null);
  const [fileName, setFileName] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [lastChecked, setLastChecked] = useState(readLastChecked);
  const [pendingExport, setPendingExport] = useState<number | null>(null);

  const lock = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  async function run(
    nextOperation: Operation,
    action: () => Promise<void>,
  ) {
    if (lock.current || disabled) return;

    lock.current = true;
    setOperation(nextOperation);
    setNotice(null);
    setError(null);

    try {
      await action();
    } catch (cause: unknown) {
      if (mounted.current) {
        setError(
          cause instanceof Error
            ? cause.message
            : 'Không thực hiện được thao tác.',
        );
      }
    } finally {
      lock.current = false;

      if (mounted.current) {
        setOperation(null);
      }
    }
  }

  async function exportFile() {
    await run('export', async () => {
      const exportedAt = await downloadBackup();

      if (!mounted.current) return;

      setPendingExport(exportedAt);
      setNotice(
        'Đã gửi yêu cầu tải file tới trình duyệt. ' +
        'Hãy kiểm tra tệp trong thư mục tải xuống.',
      );
    });
  }

  function confirmDownloadedFile() {
    if (pendingExport === null) return;

    try {
      localStorage.setItem(
        LAST_CHECKED_KEY,
        String(pendingExport),
      );

      setLastChecked(pendingExport);
      setPendingExport(null);
      setError(null);
      setNotice('Đã ghi nhận bạn kiểm tra tệp sao lưu.');
    } catch {
      setError(
        'Không lưu được mốc nhắc sao lưu trên trình duyệt. ' +
        'Tệp bạn đã tải không bị ảnh hưởng.',
      );
    }
  }

  async function inspectFile(file: File) {
    await run('inspect', async () => {
      setPreview(null);
      setConfirmed(false);
      setFileName('');

      const backup = await readBackup(file);

      if (!mounted.current) return;

      setPreview(backup);
      setFileName(file.name);
    });
  }

  async function restoreFile() {
    if (!preview || !confirmed) return;

    await run('restore', async () => {
      const result = await restoreBackup(preview);

      if (!mounted.current) return;

      setPreview(null);
      setConfirmed(false);
      setFileName('');
      setNotice(
        `Đã khôi phục ${result.entries} mục từ và ` +
        `${result.progress} tiến độ học.`,
      );

      onRestored();
    });
  }

  const busy = operation !== null;
  const blocked = disabled || busy;
  const backupDue =
    lastChecked === 0 || Date.now() - lastChecked >= SEVEN_DAYS;

  return (
    <section
      className="entry-details"
      aria-labelledby="backup-title"
    >
      <h2 id="backup-title">Sao lưu và khôi phục</h2>

      <p className="topic-message">
        Tải file để giữ một bản riêng của thư viện và tiến độ.
        Các lượt lưu còn chờ trong extension chưa nằm trong
        bản sao lưu của web.
      </p>

      {backupDue && (
        <p className="study-notice is-hint" role="status">
          {lastChecked === 0
            ? 'Chưa có mốc kiểm tra tệp sao lưu trên thiết bị này.'
            : 'Đã ít nhất 7 ngày kể từ bản sao lưu bạn kiểm tra gần nhất.'}
        </p>
      )}

      {lastChecked > 0 && (
        <p className="draft-status">
          Bản sao lưu đã kiểm tra gần nhất:
          {' '}{formatTime(lastChecked)}
        </p>
      )}

      <button
        className="primary-button"
        type="button"
        disabled={blocked}
        onClick={() => void exportFile()}
      >
        {operation === 'export'
          ? 'Đang tạo file…'
          : 'Tải bản sao lưu'}
      </button>

      {pendingExport !== null && (
        <div className="review-result">
          <p>
            Trình duyệt không báo cho web biết bạn đã giữ tệp
            thành công hay chưa. Sau khi mở và kiểm tra tệp,
            bạn có thể ghi nhận bên dưới.
          </p>

          <button
            className="secondary-button"
            type="button"
            disabled={blocked}
            onClick={confirmDownloadedFile}
          >
            Tôi đã mở và kiểm tra tệp
          </button>
        </div>
      )}

      <hr />

      <h3>Khôi phục từ file</h3>

      <p className="topic-message">
        Chọn file để xem trước. Dữ liệu hiện tại chỉ được thay thế
        khi bạn xác nhận và bấm khôi phục.
      </p>

      <label className="lookup-label">
        Chọn bản sao lưu JSON

        <input
          type="file"
          accept=".json,application/json"
          disabled={blocked}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];

            event.currentTarget.value = '';

            if (file) {
              void inspectFile(file);
            }
          }}
        />
      </label>

      {operation === 'inspect' && (
        <p role="status">Đang kiểm tra file…</p>
      )}

      {preview && (
        <div className="review-result">
          <h4>Xem trước: {fileName}</h4>

          <p>Ngày xuất: {formatTime(preview.exportedAt)}</p>
          <p>Số mục từ: {preview.content.entries.length}</p>
          <p>Số chủ đề: {preview.content.topics.length}</p>
          <p>Số từ có tiến độ: {preview.progress.length}</p>
          <p>Số ngữ cảnh: {preview.captures.length}</p>
          <p>Số phiên học/ôn: {preview.sessions.length}</p>

          <p>
            Khôi phục thay thế dữ liệu web hiện tại bằng nội dung
            trong file, gồm cả tiến độ và cài đặt.
          </p>

          <label className="due-filter">
            <input
              type="checkbox"
              checked={confirmed}
              disabled={blocked}
              onChange={(event) =>
                setConfirmed(event.target.checked)
              }
            />
            Tôi đồng ý thay thế dữ liệu hiện tại bằng bản sao lưu này.
          </label>

          <div className="study-answer-actions">
            <button
              className="primary-button"
              type="button"
              disabled={blocked || !confirmed}
              onClick={() => void restoreFile()}
            >
              {operation === 'restore'
                ? 'Đang khôi phục…'
                : 'Khôi phục bản sao lưu'}
            </button>

            <button
              className="secondary-button"
              type="button"
              disabled={blocked}
              onClick={() => {
                setPreview(null);
                setConfirmed(false);
                setFileName('');
              }}
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {disabled && (
        <p className="draft-status">
          Đóng phần đang đọc hoặc chỉnh sửa để quản lý bản sao lưu.
        </p>
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