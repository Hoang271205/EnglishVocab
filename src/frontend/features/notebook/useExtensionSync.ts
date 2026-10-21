import { useRef, useState } from 'react';
import {
  receiveExtensionCaptures,
  sendLibraryToExtension,
} from './extensionSync';

type Notice = {
  kind: 'success' | 'hint';
  text: string;
};

type Operation = 'receive' | 'send-library' | null;

function errorMessage(cause: unknown): string {
  return cause instanceof Error
    ? cause.message
    : 'Không thực hiện được đồng bộ.';
}

export function useExtensionSync(onReceived: () => void) {
  const lock = useRef(false);

  const [operation, setOperation] = useState<Operation>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function receive() {
    if (lock.current) return;

    lock.current = true;
    setOperation('receive');
    setNotice(null);
    setError(null);

    try {
      const result = await receiveExtensionCaptures();

      if (result.transferred > 0) {
        onReceived();
      }

      if (result.ackPending) {
        setNotice({
          kind: 'hint',
          text:
            `Web đã tiếp nhận ${result.transferred} lượt lưu/ngữ cảnh. ` +
            'Extension chưa xác nhận hoàn tất. Bấm Nhận từ extension ' +
            'lần nữa để thử lại; cùng lượt lưu sẽ không tạo bản trùng.',
        });
      } else if (result.transferred === 0) {
        setNotice({
          kind: 'success',
          text: 'Không còn lượt lưu nào chờ chuyển trong extension.',
        });
      } else {
        setNotice({
          kind: 'success',
          text:
            `Đã tiếp nhận ${result.transferred} lượt lưu/ngữ cảnh. ` +
            'Từ mới nằm trong Từ của tôi; ngữ cảnh của từ đã có ' +
            'được bổ sung vào mục tương ứng.',
        });
      }
    } catch (cause: unknown) {
      setError(errorMessage(cause));
    } finally {
      lock.current = false;
      setOperation(null);
    }
  }

  async function sendLibrary() {
    if (lock.current) return;

    lock.current = true;
    setOperation('send-library');
    setNotice(null);
    setError(null);

    try {
      const result = await sendLibraryToExtension();

      setNotice({
        kind: 'success',
        text:
          `Đã gửi ${result.entries} mục từ sang extension. ` +
          'Các lần tra tiếp theo sẽ ưu tiên thư viện này.',
      });
    } catch (cause: unknown) {
      setError(errorMessage(cause));
    } finally {
      lock.current = false;
      setOperation(null);
    }
  }

  return {
    operation,
    notice,
    error,
    receive,
    sendLibrary,
  };
}