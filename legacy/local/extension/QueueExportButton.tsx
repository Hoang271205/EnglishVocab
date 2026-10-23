import { useEffect, useRef, useState } from 'react';
import { captureTransferSchema } from '../src/services/personal';
import { downloadJson } from '../src/shared/downloadJson';
import { requestWorker } from '../../../extension/client';

type QueueExportButtonProps = {
  disabled: boolean;
};

export default function QueueExportButton({
  disabled,
}: QueueExportButtonProps) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const lock = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  async function exportQueue() {
    if (lock.current || disabled) return;

    lock.current = true;
    setBusy(true);
    setMessage(null);

    try {
      const response = await requestWorker<unknown>({
        type: 'queue-export',
      });

      const transfer = captureTransferSchema.parse(response);

      if (!mounted.current) return;

      if (transfer.captures.length === 0) {
        setMessage('Không có lượt lưu nào đang chờ.');
        return;
      }

      const bytes = new TextEncoder().encode(
        JSON.stringify(transfer),
      ).length;

      if (bytes > 2_000_000) {
        throw new Error(
          'Hàng đợi vượt giới hạn nhập 2 MB. Chưa tạo file.',
        );
      }

      downloadJson(
        transfer,
        `englishvocab-queue-${Date.now()}.json`,
      );

      setMessage(
        `Đã gửi yêu cầu tải ${transfer.captures.length} lượt lưu. ` +
        'Hãy kiểm tra file trong thư mục tải xuống. ' +
        'Hàng đợi extension vẫn được giữ nguyên.',
      );
    } catch (cause: unknown) {
      if (mounted.current) {
        setMessage(
          cause instanceof Error
            ? cause.message
            : 'Không xuất được hàng đợi.',
        );
      }
    } finally {
      lock.current = false;

      if (mounted.current) setBusy(false);
    }
  }

  return (
    <div>
      <button
        className="save-word"
        type="button"
        disabled={disabled || busy}
        onClick={() => void exportQueue()}
      >
        {busy ? 'Đang tạo file…' : 'Xuất file hàng đợi'}
      </button>

      {message && (
        <p className="message" role="status">
          {message}
        </p>
      )}
    </div>
  );
}