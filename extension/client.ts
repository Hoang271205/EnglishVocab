export async function requestWorker<T>(
  message: Record<string, unknown>,
): Promise<T> {
  const reply = await chrome.runtime.sendMessage(message);

  if (
    typeof reply !== 'object' ||
    reply === null ||
    !('ok' in reply)
  ) {
    throw new Error('Extension trả về phản hồi không hợp lệ.');
  }

  if (reply.ok !== true) {
    const message =
      'error' in reply && typeof reply.error === 'string'
        ? reply.error
        : 'Không thực hiện được yêu cầu.';

    throw new Error(message);
  }

  if (!('value' in reply)) {
    throw new Error('Phản hồi của extension thiếu dữ liệu.');
  }

  return reply.value as T;
}