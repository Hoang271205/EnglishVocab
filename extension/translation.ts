import { z } from 'zod';
import { normalizeAnswer } from '../src/domain/grading';

export const translationInputSchema = z
  .object({
    word: z.string().trim().min(1).max(120),
    partOfSpeech: z.string().trim().max(100),
    definition: z.string().trim().min(1).max(10_000),
  })
  .strict();

type TranslationInput = z.infer<typeof translationInputSchema>;

const cacheSchema = z.array(
  z.object({
    key: z.string(),
    word: z.string(),
    text: z.string().min(1),
  }),
);

const responseSchema = z.object({
  responseStatus: z.coerce.number(),
  quotaFinished: z.boolean().optional(),
  responseData: z.object({
    translatedText: z.string(),
  }).optional(),
});

type TranslationResult = {
  text: string;
  source: 'cache' | 'api';
};

let generation = 0;
let storageTail: Promise<unknown> = Promise.resolve();

const pending = new Map<string, Promise<TranslationResult>>();

function serialStorage<T>(work: () => Promise<T>): Promise<T> {
  const next = storageTail.then(work);
  storageTail = next.catch(() => {});
  return next;
}

async function readCache() {
  const stored = await chrome.storage.local.get('translationCache');
  const parsed = cacheSchema.safeParse(stored.translationCache);
  return parsed.success ? parsed.data : [];
}

export async function translateSense(
  input: TranslationInput,
): Promise<TranslationResult> {
  const data = translationInputSchema.parse(input);

  // Mỗi nghĩa có khóa riêng; không cache chỉ theo từ.
  const key = JSON.stringify([
    normalizeAnswer(data.word),
    data.partOfSpeech,
    data.definition,
  ]);

  const cached = await serialStorage(async () =>
    (await readCache()).find((item) => item.key === key),
  );

  if (cached) {
    return { text: cached.text, source: 'cache' };
  }

  const existing = pending.get(key);
  if (existing) return existing;

  const requestGeneration = generation;

  const promise = (async (): Promise<TranslationResult> => {
    const text =
      `${data.word} (${data.partOfSpeech || 'word'}): ` +
      data.definition;

    // Không cắt định nghĩa giữa chừng vì có thể làm sai nghĩa.
    if (new TextEncoder().encode(text).length > 500) {
      throw new Error(
        'Định nghĩa quá dài cho lượt dịch này. Bạn có thể nhập nghĩa Việt.',
      );
    }

    const url = new URL('https://api.mymemory.translated.net/get');
    url.searchParams.set('q', text);
    url.searchParams.set('langpair', 'en|vi');

    const response = await fetch(url, {
      signal: AbortSignal.timeout(12_000),
      credentials: 'omit',
    });

    if (!response.ok) {
      throw new Error('Dịch vụ dịch chưa phản hồi. Bạn có thể nhập nghĩa Việt.');
    }

    const result = responseSchema.parse(await response.json());

    if (result.quotaFinished || result.responseStatus === 429) {
      throw new Error(
        'Đã hết hạn mức dịch hiện tại. Bạn có thể nhập nghĩa Việt.',
      );
    }

    if (result.responseStatus !== 200) {
      throw new Error(
        'Chưa dịch được nghĩa này. Bạn có thể nhập nghĩa Việt.',
      );
    }

    const translated = result.responseData?.translatedText.trim();

    if (!translated || translated === text) {
      throw new Error(
        'Chưa có bản dịch phù hợp. Bạn có thể nhập nghĩa Việt.',
      );
    }

    await serialStorage(async () => {
      if (requestGeneration !== generation) return;

      const cache = await readCache();

      await chrome.storage.local.set({
        translationCache: [
          ...cache.filter((item) => item.key !== key),
          {
            key,
            word: normalizeAnswer(data.word),
            text: translated,
          },
        ].slice(-300),
      });
    });

    return { text: translated, source: 'api' };
  })();

  pending.set(key, promise);

  try {
    return await promise;
  } finally {
    if (pending.get(key) === promise) {
      pending.delete(key);
    }
  }
}

export async function forgetTranslations(word: string) {
  generation++;
  pending.clear();

  await serialStorage(async () => {
    const cache = await readCache();

    await chrome.storage.local.set({
      translationCache: cache.filter(
        (item) => item.word !== normalizeAnswer(word),
      ),
    });
  });
}