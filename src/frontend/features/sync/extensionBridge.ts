const marker = 'englishvocab-bridge-v1';
interface Reply<T> {
  ok: boolean;
  value?: T;
  error?: string;
}
export function extensionRequest<T>(
  type: string,
  payload: Record<string, unknown> = {},
  signal?: AbortSignal,
  timeoutMs = 12000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const requestId = crypto.randomUUID();
    function clean() {
      window.clearTimeout(timer);
      window.removeEventListener('message', receive);
      signal?.removeEventListener('abort', abort);
    }
    function abort() {
      clean();
      reject(new DOMException('Đã huỷ thao tác', 'AbortError'));
    }
    function receive(event: MessageEvent) {
      if (
        event.source !== window ||
        event.origin !== location.origin ||
        event.data?.marker !== `${marker}-response` ||
        event.data.requestId !== requestId
      )
        return;
      clean();
      const result = event.data.result as Reply<T> | undefined;
      if (result?.ok) resolve(result.value as T);
      else
        reject(
          new Error(
            result?.error ||
              'Extension chưa phản hồi. Hãy tải lại extension và trang web.',
          ),
        );
    }
    const timer = window.setTimeout(() => {
      clean();
      reject(
        new Error(
          'Không kết nối được extension. Hãy build/reload extension rồi tải lại trang web.',
        ),
      );
    }, timeoutMs);
    window.addEventListener('message', receive);
    if (signal?.aborted) {
      abort();
      return;
    }
    signal?.addEventListener('abort', abort, { once: true });
    window.postMessage(
      { marker, requestId, type, ...payload },
      location.origin,
    );
  });
}
interface ExtensionState {
  deviceId: string;
  connected: boolean;
  ownerId: string | null;
  expiresAt: number | null;
}
export async function bindExtension(
  ownerId: string,
  signal?: AbortSignal,
  adoptGuest = false,
) {
  const state = await extensionRequest<ExtensionState>(
    'extension-state',
    {},
    signal,
    3000,
  );
  if (!state.connected) {
    throw new Error(
      'Hãy bấm icon EnglishVocab trên Chrome và đăng nhập extension.',
    );
  }
  if (state.ownerId !== ownerId) {
    throw new Error(
      'Tài khoản web và extension khác nhau. Hãy đăng nhập cùng tài khoản trước khi đồng bộ.',
    );
  }
  return extensionRequest(
    'account-bind',
    { ownerId, adoptGuest },
    signal,
    12000,
  );
}
export async function clearExtensionAccount(ownerId: string) {
  return extensionRequest('account-release', { ownerId }, undefined, 2500);
}
export interface ExtensionCleanup {
  entryId: string;
  headword: string;
  sourceIds: string[];
}
export async function cleanExtensionWord(
  ownerId: string,
  item: ExtensionCleanup,
  signal?: AbortSignal,
) {
  await bindExtension(ownerId, signal);
  await extensionRequest('personal-delete', { ownerId, ...item }, signal);
}
