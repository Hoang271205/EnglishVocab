import type { Entry, Example, Source } from '../domain/types.js';
import type { LookupResult, LookupSense } from './freeDictionary.js';

export function findDictionaryTarget(
  sentence: string,
  word: string,
  forms: readonly string[] = [],
) {
  const targets = [word, ...forms]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map((form) => form.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!targets.length) return undefined;

  const pattern = new RegExp(
    '(?<![\\p{L}\\p{N}_])(?:' + targets.join('|') + ')(?![\\p{L}\\p{N}_])',
    'giu',
  );

  const matches = [...sentence.matchAll(pattern)];

  // Không dùng câu lặp lại đáp án vì phần còn lại có thể làm lộ từ.
  return matches.length === 1 ? matches[0] : undefined;
}

export function dictionaryExample(
  sentence: string | null,
  word: string,
  forms?: readonly string[],
): Example[] {
  if (!sentence) return [];

  const match = findDictionaryTarget(sentence, word, forms);
  if (!match || match.index === undefined) {
    return [];
  }

  const target = match[0];

  return [
    {
      id: crypto.randomUUID(),
      prefix: sentence.slice(0, match.index),
      targetSurface: target,
      suffix: sentence.slice(match.index + target.length),
      acceptedAnswers: [target],
    },
  ];
}

export function lookupIpa(
  result: LookupResult | null,
  sense: LookupSense | undefined,
  americanOnly = false,
) {
  const candidates = (sense?.phonetics ?? result?.phonetics ?? []).filter(
    (item) => Boolean(item.text),
  );
  const american = candidates.filter((item) => item.accent === 'en-US');
  const eligible = americanOnly || american.length ? american : candidates;

  // Prefer phonemic notation over phonetic realizations for the learning card.
  // If the source lists multiple pronunciations, preserve its order.
  return (
    eligible.find((item) => item.text?.startsWith('/') && item.text.endsWith('/')) ??
    eligible[0] ??
    null
  );
}

type ReadingEntryInput = {
  entryId: string;
  word: string;
  result: LookupResult | null;
  sense: LookupSense | undefined;
  meaningVi: string;
  partOfSpeech: string;
  exampleText?: string;
};

export function createReadingEntry({
  entryId,
  word,
  result,
  sense,
  meaningVi,
  partOfSpeech,
  exampleText,
}: ReadingEntryInput): Entry {
  const headword = result?.query ?? word;
  const examples = dictionaryExample(
    exampleText ?? sense?.example ?? null,
    headword,
    sense?.exampleForms,
  );

  const sources: Source[] = [];

  const licenses = sense
    ? sense.licenses.length
      ? sense.licenses
      : [
          {
            name: 'Chưa xác định giấy phép',
            url: sense.sourceUrls[0] ?? null,
          },
        ]
    : [];

  for (const license of licenses) {
    const sourceUrl = sense?.sourceUrls[0] ?? license.url ?? null;

    sources.push({
      field: 'definition',
      attribution: (
        (result?.provider?.name ?? 'Từ điển') +
        ' — Trích định nghĩa: ' +
        (sense?.definition ?? '')
      ).slice(0, 10_000),
      license: license.name,
      url: sourceUrl,
      status: 'unverified',
      checkedAt: null,
    });

    if (examples.length && !sense?.exampleSource) {
      sources.push({
        field: 'example',
        attribution: result?.provider?.name ?? 'Ví dụ từ điển',
        license: license.name,
        url: sourceUrl,
        status: 'unverified',
        checkedAt: null,
      });
    }
  }

  if (examples.length && sense?.exampleSource) {
    sources.push(sense.exampleSource);
  }

  if (exampleText !== undefined && exampleText !== (sense?.example ?? '')) {
    for (let i = sources.length - 1; i >= 0; i--) {
      if (sources[i]!.field === 'example') sources.splice(i, 1);
    }
    if (examples.length)
      sources.push({
        field: 'example',
        attribution: 'Câu ví dụ do người dùng nhập hoặc chỉnh sửa',
        license: 'Nội dung cá nhân',
        url: null,
        status: 'authored',
        checkedAt: null,
      });
  }

  if (meaningVi.trim()) {
    sources.push({
      field: 'meaning',
      attribution: 'Nghĩa tiếng Việt do người dùng nhập',
      license: 'Nội dung cá nhân',
      url: null,
      status: 'authored',
      checkedAt: null,
    });
  }

  const sound = lookupIpa(result, sense, true);

  if (sound?.text) {
    sources.push({
      field: 'ipa',
      attribution: result?.provider?.name ?? 'Từ điển',
      license:
        sound.license?.name ?? licenses[0]?.name ?? 'Chưa xác định giấy phép',
      url: sound.sourceUrl,
      status: 'unverified',
      checkedAt: null,
    });
  }

  return {
    id: entryId,
    revision: 1,
    collectionId: 'personal',
    headword,
    partOfSpeech: partOfSpeech.trim(),
    senseKey: 'reading-' + entryId,
    meaningVi: meaningVi.trim(),
    acceptedLearnAnswers: [headword],
    cefr: {
      level: null,
      status: 'unknown',
      note: '',
    },
    pronunciation: {
      ipa: sound?.text ?? null,
      accent: sound?.text ? 'en-US' : null,
    },
    examples,
    provenance: sources,
    contentStatus:
      meaningVi.trim() && partOfSpeech.trim() && examples.length
        ? 'ready'
        : 'draft',
  };
}
