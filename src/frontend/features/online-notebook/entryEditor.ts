import type { Entry, CefrLevel } from '../../../domain/types';
import { dictionaryExample } from '../../../dictionary/readingEntry';
import { entrySchema } from '../../../content/schema';
export interface EditorValues {
  headword: string;
  partOfSpeech: string;
  meaningVi: string;
  ipa: string;
  cefr: string;
  example: string;
  target: string;
  answers: string;
  ready: boolean;
}
export function editorValues(entry?: Entry): EditorValues {
  const example = entry?.examples[0];
  return {
    headword: entry?.headword ?? '',
    partOfSpeech: entry?.partOfSpeech ?? '',
    meaningVi: entry?.meaningVi ?? '',
    ipa: entry?.pronunciation.ipa ?? '',
    cefr: entry?.cefr.level ?? '',
    example: example
      ? example.prefix + example.targetSurface + example.suffix
      : '',
    target: example?.targetSurface ?? '',
    answers: entry?.acceptedLearnAnswers.join('\n') ?? '',
    ready: entry?.contentStatus === 'ready',
  };
}
export function buildEditorEntry(value: EditorValues, old?: Entry): Entry {
  const word = value.headword.trim();
  if (!word) throw new Error('Cần nhập từ tiếng Anh.');
  const target = value.target.trim() || word;
  const examples = dictionaryExample(value.example.trim(), target);
  if (value.example.trim() && !examples.length)
    throw new Error(
      'Câu ví dụ cần chứa đúng một lần từ hoặc dạng từ mục tiêu.',
    );
  const first = examples[0];
  const oldFirst = old?.examples[0];
  const sameExample =
    first &&
    oldFirst &&
    first.prefix === oldFirst.prefix &&
    first.targetSurface === oldFirst.targetSurface &&
    first.suffix === oldFirst.suffix;
  const accepted = [
    ...new Set([
      word,
      ...value.answers
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean),
    ]),
  ];
  const level = value.cefr ? (value.cefr as CefrLevel) : null;
  const provenance = [...(old?.provenance ?? [])];
  const changed = (
    field: 'meaning' | 'ipa' | 'cefr' | 'example',
    isChanged: boolean,
  ) => {
    if (isChanged)
      provenance.push({
        field,
        attribution: 'Người dùng tự nhập/chỉnh sửa',
        license: 'Nội dung cá nhân',
        url: null,
        status: 'authored',
        checkedAt: null,
      });
  };
  changed('meaning', value.meaningVi.trim() !== old?.meaningVi);
  changed('ipa', value.ipa.trim() !== (old?.pronunciation.ipa ?? ''));
  changed('cefr', level !== (old?.cefr.level ?? null));
  changed('example', Boolean(first && !sameExample));
  const result = entrySchema.safeParse({
    id: old?.id ?? `personal-${crypto.randomUUID()}`,
    revision: old?.revision ?? 1,
    collectionId: 'personal',
    headword: word,
    partOfSpeech: value.partOfSpeech.trim(),
    meaningVi: value.meaningVi.trim(),
    senseKey: old?.senseKey ?? crypto.randomUUID(),
    acceptedLearnAnswers: accepted,
    pronunciation: {
      ipa: value.ipa.trim() || null,
      accent: value.ipa.trim() ? 'en-US' : null,
    },
    cefr: {
      level,
      status: level
        ? old && level === old.cefr.level
          ? old.cefr.status
          : 'estimated'
        : 'unknown',
      note:
        old && level === old.cefr.level
          ? old.cefr.note
          : 'Người dùng chọn, mang tính tham khảo',
    },
    examples:
      old && sameExample
        ? old.examples
        : [...examples, ...(old?.examples.slice(1) ?? [])],
    provenance: provenance.slice(-100),
    contentStatus: value.ready ? 'ready' : 'draft',
  });
  if (!result.success)
    throw new Error(
      'Từ sẵn sàng học cần có nghĩa, từ loại và câu ví dụ hợp lệ. Kiểm tra độ dài và các đáp án trước khi lưu.',
    );
  return result.data;
}
