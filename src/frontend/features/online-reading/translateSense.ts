import { z } from 'zod';
const responseSchema = z.object({
  responseStatus: z.coerce.number(),
  quotaFinished: z.boolean().optional(),
  responseData: z.object({ translatedText: z.string() }).optional(),
});
export async function translateDefinition(
  word: string,
  partOfSpeech: string,
  definition: string,
  signal: AbortSignal,
) {
  const text = `${word} (${partOfSpeech || 'word'}): ${definition}`;
  if (new TextEncoder().encode(text).length > 500)
    throw new Error(
      'Nghĩa quá dài cho lượt dịch này; bạn có thể nhập nghĩa Việt.',
    );
  const url = new URL('https://api.mymemory.translated.net/get');
  url.searchParams.set('q', text);
  url.searchParams.set('langpair', 'en|vi');
  const response = await fetch(url, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(12000)]),
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
  });
  if (!response.ok)
    throw new Error('Dịch vụ dịch chưa phản hồi. Bạn có thể nhập nghĩa Việt.');
  const result = responseSchema.parse(await response.json());
  if (
    result.quotaFinished ||
    result.responseStatus !== 200 ||
    !result.responseData?.translatedText.trim()
  )
    throw new Error(
      'Chưa dịch được nghĩa này hoặc đã hết hạn mức. Bạn có thể nhập nghĩa Việt.',
    );
  const decoder = document.createElement('textarea');
  decoder.innerHTML = result.responseData.translatedText;
  return decoder.value;
}
