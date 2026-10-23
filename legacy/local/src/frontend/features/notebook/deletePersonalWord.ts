import { BrowserExtensionBridge } from '../../../services/transfer';
import { backend, initializeBackend } from '../../backend';

const bridge = new BrowserExtensionBridge();

export async function deletePersonalWord(entryId: string, revision: number) {
  await initializeBackend();

  // Kiểm tra trước, chưa xóa dữ liệu.
  const entry = await backend.personal.checkRemoval(entryId, revision);

  const response = await bridge.request({
    type: 'personal-delete',
    entryId,
    headword: entry.headword,
  });

  const confirmed =
    response !== null &&
    typeof response === 'object' &&
    'ok' in response &&
    response.ok === true &&
    'value' in response &&
    response.value !== null &&
    typeof response.value === 'object' &&
    'deleted' in response.value &&
    response.value.deleted === true;

  if (!confirmed) {
    throw new Error(
      'Chưa xác nhận dọn dữ liệu trong extension. Từ trên web chưa bị xóa. Hãy kiểm tra extension rồi thử lại.',
    );
  }

  backend.dictionary.invalidatePendingCache();

  try {
    await backend.personal.remove(entryId, revision);
  } catch (cause: unknown) {
    const reason = cause instanceof Error ? cause.message : 'Lỗi lưu trữ.';

    throw new Error(
      `Extension đã được dọn nhưng chưa xóa được từ trên web. ${reason} Hãy làm mới và thử lại.`,
    );
  }
}
