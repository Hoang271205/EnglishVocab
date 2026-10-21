import type { Entry, Example, Source } from '../../../domain/types';
import type {
  LookupResult,
  LookupSense,
} from '../../../dictionary/freeDictionary';

export function dictionaryExample(
  sentence: string | null,
  word: string,
): Example[] {
  if (!sentence) {
    return [];
  }

  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const pattern = new RegExp(
    '(?<![\\p{L}\\p{N}_])' + escaped + '(?![\\p{L}\\p{N}_])',
    'giu',
  );

  const matches = [...sentence.matchAll(pattern)];

  // Không dùng câu lặp lại đáp án vì phần còn lại có thể làm lộ từ.
  if (matches.length !== 1) {
    return [];
  }

  const match = matches[0];

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

export function remoteIpa(
  result: LookupResult | null,
  sense: LookupSense | undefined,
) {
  const candidates = (sense?.phonetics ?? result?.phonetics ?? []).filter(
    (item) => item.accent === 'en-US' && Boolean(item.text),
  );

  const texts = [...new Set(candidates.map((item) => item.text))];

  // Chỉ lưu khi có một phiên âm Mỹ rõ ràng.
  return texts.length === 1 ? (candidates[0] ?? null) : null;
}

type ReadingEntryInput = {
  entryId: string;
  word: string;
  result: LookupResult | null;
  sense: LookupSense | undefined;
  meaningVi: string;
  partOfSpeech: string;
};

export function createReadingEntry({
  entryId,
  word,
  result,
  sense,
  meaningVi,
  partOfSpeech,
}: ReadingEntryInput): Entry {
  const headword = result?.query ?? word;
  const examples = dictionaryExample(sense?.example ?? null, headword);

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

    if (examples.length) {
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

  const sound = remoteIpa(result, sense);

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
