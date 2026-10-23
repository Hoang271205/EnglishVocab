import { useRef } from 'react';
import Button from '../../components/ui/Button';
import StatusMessage from '../../components/ui/StatusMessage';
import { useExtensionSync } from './useExtensionSync';
export default function ExtensionSyncPanel({
  ownerId,
  onImported,
}: {
  ownerId: string;
  onImported: () => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const model = useExtensionSync(ownerId, onImported);
  return (
    <section className="cloud-panel">
      <h2>Extension và dữ liệu</h2>
      <p>
        Nút Lưu từ trong extension gửi trực tiếp lên database của tài khoản đang
        kết nối. Không cần bấm Nhận từ sau mỗi lượt lưu. Mục thiếu nghĩa hoặc ví
        dụ sẽ nằm ở Chờ bổ sung.
      </p>
      <div className="cloud-actions">
        <Button loading={model.busy} onClick={() => void model.connect()}>
          Kiểm tra tài khoản extension
        </Button>
        <Button
          variant="secondary"
          disabled={model.busy}
          onClick={() => void model.send()}
        >
          Gửi thư viện sang extension
        </Button>
        <Button
          variant="secondary"
          disabled={model.busy}
          onClick={() => fileInput.current?.click()}
        >
          Nhập file hàng đợi
        </Button>
        <Button
          variant="secondary"
          disabled={model.busy}
          onClick={() => void model.export()}
        >
          Xuất dữ liệu tài khoản
        </Button>
      </div>
      <details>
        <summary>Chuyển dữ liệu hàng đợi cũ</summary>
        <p>
          Chỉ dùng cho từ đã lưu bằng phiên bản trước. Phiên bản mới không thêm
          từ vào hàng đợi.
        </p>
        <Button
          variant="secondary"
          disabled={model.busy}
          onClick={() => void model.receive()}
        >
          Nhận hàng đợi cũ
        </Button>
      </details>
      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void model.importFile(file);
        }}
      />
      {model.error && <StatusMessage tone="error">{model.error}</StatusMessage>}
      {model.notice && <StatusMessage>{model.notice}</StatusMessage>}
      <p>
        File nhập là file hàng đợi do extension xuất. Chưa có chức năng khôi
        phục file xuất tài khoản hoặc dữ liệu IndexedDB cũ.
      </p>
    </section>
  );
}
