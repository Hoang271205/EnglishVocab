import { useEffect, useRef, useState } from 'react';
import type {
  LookupResult,
  LookupSense,
} from '../../../dictionary/freeDictionary';
import { createReadingEntry } from '../../../dictionary/readingEntry';
import type { Entry } from '../../../domain/types';
import Button from '../../components/ui/Button';
import StatusMessage from '../../components/ui/StatusMessage';
import { translateDefinition } from './translateSense';
interface Props {
  word: string;
  result: LookupResult;
  sense: LookupSense;
  entry?: Entry | undefined;
  busy: boolean;
  locked: boolean;
  saved: boolean;
  onSave: (entry: Entry) => Promise<void>;
}
export default function ReadingSenseForm({
  word,
  result,
  sense,
  entry,
  busy,
  locked,
  saved,
  onSave,
}: Props) {
  const [meaning, setMeaning] = useState(entry?.meaningVi ?? '');
  const [translating, setTranslating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const edited = useRef(false);
  useEffect(() => {
    if (entry) return;
    const controller = new AbortController();
    setTranslating(true);
    void translateDefinition(
      word,
      sense.partOfSpeech,
      sense.definition,
      controller.signal,
    )
      .then((text) => {
        if (!controller.signal.aborted && !edited.current) {
          setMeaning(text);
          setNotice('Bản dịch gợi ý của MyMemory. Hãy kiểm tra trước khi lưu.');
        }
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setNotice(
            'Chưa có bản dịch. Bạn có thể nhập nghĩa Việt và lưu nháp.',
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setTranslating(false);
      });
    return () => controller.abort();
  }, [entry, word, sense]);
  async function saveSelected() {
    if (entry) {
      await onSave(entry);
      return;
    }
    const created = createReadingEntry({
      entryId: `personal-${crypto.randomUUID()}`,
      word,
      result,
      sense,
      meaningVi: meaning,
      partOfSpeech: sense.partOfSpeech,
    });
    if (notice?.startsWith('Bản dịch gợi ý') && meaning.trim()) {
      created.provenance = [
        ...created.provenance.filter((source) => source.field !== 'meaning'),
        {
          field: 'meaning',
          attribution: edited.current
            ? 'Gợi ý MyMemory, người dùng chỉnh sửa'
            : 'MyMemory — bản dịch máy tham khảo',
          license: 'Theo điều khoản nhà cung cấp; chưa xác minh',
          url: 'https://mymemory.translated.net/',
          status: 'unverified',
          checkedAt: null,
        },
      ];
    }
    await onSave(created);
  }

  return (
    <form
      className="cloud-form"
      onSubmit={(event) => {
        event.preventDefault();
        void saveSelected();
      }}
    >
      <p>
        <strong>{sense.partOfSpeech}</strong> — {sense.definition}
      </p>
      <label>
        Nghĩa tiếng Việt
        <textarea
          value={meaning}
          disabled={busy || locked || Boolean(entry)}
          maxLength={10000}
          onChange={(event) => {
            edited.current = true;
            setMeaning(event.target.value);
          }}
        />
      </label>
      {translating && <StatusMessage>Đang dịch nghĩa đang chọn…</StatusMessage>}
      {notice && <StatusMessage>{notice}</StatusMessage>}
      {sense.example && <blockquote>{sense.example}</blockquote>}
      <p>
        CEFR: {entry?.cefr.level ?? 'Chưa có'} · IPA Mỹ:{' '}
        {entry?.pronunciation.ipa ??
          sense.phonetics?.find((sound) => sound.accent === 'en-US')?.text ??
          'Chưa có'}
      </p>
      <details>
        <summary>Nguồn và giấy phép</summary>
        {sense.licenses.map((license, index) => (
          <p key={index}>{license.name}</p>
        ))}
      </details>
      <Button type="submit" loading={busy} disabled={translating || saved}>
        {entry ? 'Đã có trong thư viện' : 'Lưu từ'}
      </Button>
      <p>
        Thiếu nghĩa hoặc ví dụ thì lưu nháp. Không lưu đoạn văn trong bài đọc.
      </p>
    </form>
  );
}
