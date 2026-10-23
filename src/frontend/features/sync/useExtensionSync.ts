import { useState } from 'react';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { bindExtension, extensionRequest } from './extensionBridge';
import { downloadJson, syncApi, verifyOwner } from './sync.api';
import type { Transfer, TransferAck } from './sync.api';
export function useExtensionSync(ownerId: string, onImported: () => void) {
  const action = useAsyncAction();
  const [notice, setNotice] = useState<string | null>(null);
  async function run(task: (signal: AbortSignal) => Promise<string>) {
    setNotice(null);
    const text = await action.run(task);
    if (text) setNotice(text);
  }
  function received(ack: TransferAck) {
    onImported();
    return `Đã nhận ${ack.summary.receivedCaptures} lượt lưu; thêm ${ack.summary.createdEntries} từ, ${ack.summary.duplicateCaptures} lượt đã nhận trước đó.`;
  }
  async function receive() {
    if (
      !window.confirm(
        'Nhập một lần các từ trong hàng đợi cũ vào tài khoản hiện tại? Các lượt lưu mới đã được lưu.',
      )
    )
      return;
    await run(async (signal) => {
      await verifyOwner(ownerId, signal);
      await bindExtension(ownerId, signal, true);
      const transfer = await extensionRequest<Transfer>(
        'queue-transfer',
        { ownerId },
        signal,
      );
      if (!transfer.captures.length) return 'Không còn lượt lưu chờ chuyển.';
      const ack = await syncApi.receive(transfer, signal);
      const text = received(ack);
      try {
        await extensionRequest(
          'queue-ack',
          { ownerId, transferId: ack.transferId, captureIds: ack.captureIds },
          signal,
        );
      } catch {
        return `${text} Chưa xác nhận được với extension; bấm Nhận lại để đối chiếu, server sẽ chống nhập trùng.`;
      }
      return text;
    });
  }
  async function importFile(file: File) {
    await run(async (signal) => {
      if (file.size > 1_900_000)
        throw new Error('File hàng đợi phải nhỏ hơn 1,9 MB.');
      const transfer: unknown = JSON.parse(await file.text());
      await verifyOwner(ownerId, signal);
      return received(await syncApi.receive(transfer, signal));
    });
  }
  return {
    busy: action.busy,
    error: action.error?.message ?? null,
    notice,
    receive,
    connect: () =>
      run(async (signal) => {
        await verifyOwner(ownerId, signal);
        await bindExtension(ownerId, signal);
        return 'Tài khoản extension đã khớp tài khoản web. Nút Lưu từ gửi trực tiếp lên database.';
      }),
    importFile,
    send: () =>
      run(
        async (signal) =>
          `Đã gửi ${await syncApi.snapshot(ownerId, signal)} từ sang extension.`,
      ),
    export: () =>
      run(async (signal) => {
        await verifyOwner(ownerId, signal);
        downloadJson(
          await syncApi.export(signal),
          `englishvocab-${new Date().toISOString().slice(0, 10)}.json`,
        );
        return 'Đã xuất dữ liệu tài khoản. File này là bản lưu để kiểm tra, chưa hỗ trợ khôi phục trực tiếp.';
      }),
  };
}
