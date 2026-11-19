import { maxTranslationLength } from './selectedText';

type BrowserTranslator = {
  translate(text: string, options: { signal: AbortSignal }): Promise<string>;
  destroy(): void;
};

type TranslatorAPI = {
  create(options: {
    sourceLanguage: string;
    targetLanguage: string;
    signal: AbortSignal;
    monitor(monitor: EventTarget): void;
  }): Promise<BrowserTranslator>;
};

const cache = new Map<string, string>();

export async function translateOnDevice(
  text: string,
  signal: AbortSignal,
  onDownload: (progress: number) => void,
) {
  signal.throwIfAborted();
  if (text.length > maxTranslationLength) {
    throw new Error('Đoạn đã chọn quá dài. Hãy bôi đen tối đa 3.000 ký tự.');
  }

  const cached = cache.get(text);
  if (cached !== undefined) return cached;

  const api = (globalThis as typeof globalThis & { Translator?: TranslatorAPI })
    .Translator;
  if (!api?.create) {
    throw new Error(
      'Trang hoặc trình duyệt này chưa hỗ trợ dịch trên máy. Hãy thử trên Chrome máy tính ở một trang HTTPS.',
    );
  }

  let translator: BrowserTranslator | undefined;
  try {
    // Call create directly from the click, while Chrome grants user activation.
    translator = await api.create({
      sourceLanguage: 'en',
      targetLanguage: 'vi',
      signal,
      monitor(target) {
        target.addEventListener('downloadprogress', (event) => {
          const progress = (event as ProgressEvent).loaded;
          if (!signal.aborted && Number.isFinite(progress)) {
            onDownload(Math.round(Math.max(0, Math.min(1, progress)) * 100));
          }
        });
      },
    });
    const result = (await translator.translate(text, { signal })).trim();
    signal.throwIfAborted();
    if (!result) throw new Error('Empty translation');

    // Bản dịch chỉ ở RAM của trang, không lưu nội dung người dùng xuống đĩa.
    if (cache.size >= 24) cache.delete(cache.keys().next().value!);
    cache.set(text, result);
    return result;
  } catch (error) {
    signal.throwIfAborted();
    if (
      error instanceof DOMException &&
      ['NotAllowedError', 'SecurityError'].includes(error.name)
    ) {
      throw new Error(
        'Chrome không cho phép dịch trên trang này. Hãy thử trên một trang HTTPS khác.',
      );
    }
    if (error instanceof DOMException && error.name === 'NotSupportedError') {
      throw new Error(
        'Chrome chưa khởi động được bộ dịch Anh–Việt. Hãy thử đóng các tab đang dịch hoặc mở lại Chrome.',
      );
    }
    throw new Error(
      'Chưa dịch được. Chrome có thể cần mạng để tải gói Anh–Việt lần đầu. Hãy thử lại.',
    );
  } finally {
    translator?.destroy();
  }
}
