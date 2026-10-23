import type { BackupPanelProps } from './types';
import { formatTime } from './backupReminder';
import { useBackupPanel } from './useBackupPanel';

export default function BackupPanel(props: BackupPanelProps) {
  const { disabled } = props;
  const {
    backupDue,
    lastChecked,
    blocked,
    exportFile,
    operation,
    pendingExport,
    confirmDownloadedFile,
    inspectFile,
    preview,
    fileName,
    confirmed,
    setConfirmed,
    restoreFile,
    setPreview,
    setFileName,
    notice,
    error,
  } = useBackupPanel(props);
  return (
    <section className="entry-details" aria-labelledby="backup-title">
      <h2 id="backup-title">Sao lưu và khôi phục</h2>

      <p className="topic-message">
        Tải file để giữ một bản riêng của thư viện và tiến độ. Các lượt lưu còn
        chờ trong extension chưa nằm trong bản sao lưu của web.
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
          Bản sao lưu đã kiểm tra gần nhất: {formatTime(lastChecked)}
        </p>
      )}

      <button
        className="primary-button"
        type="button"
        disabled={blocked}
        onClick={() => void exportFile()}
      >
        {operation === 'export' ? 'Đang tạo file…' : 'Tải bản sao lưu'}
      </button>

      {pendingExport !== null && (
        <div className="review-result">
          <p>
            Trình duyệt không báo cho web biết bạn đã giữ tệp thành công hay
            chưa. Sau khi mở và kiểm tra tệp, bạn có thể ghi nhận bên dưới.
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
        Chọn file để xem trước. Dữ liệu hiện tại chỉ được thay thế khi bạn xác
        nhận và bấm khôi phục.
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

      {operation === 'inspect' && <p role="status">Đang kiểm tra file…</p>}

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
            Khôi phục thay thế dữ liệu web hiện tại bằng nội dung trong file,
            gồm cả tiến độ và cài đặt.
          </p>

          <label className="due-filter">
            <input
              type="checkbox"
              checked={confirmed}
              disabled={blocked}
              onChange={(event) => setConfirmed(event.target.checked)}
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
