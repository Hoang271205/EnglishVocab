import Icon from '../../components/ui/Icon';
import { useCallback, useRef, useState } from 'react';
import { WiktionaryDictionary } from '../../../dictionary/wiktionaryDictionary';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { useAmericanSpeech } from '../../hooks/useAmericanSpeech';
import Button from '../../components/ui/Button';
import StatusMessage from '../../components/ui/StatusMessage';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import ReadingSenseForm from './ReadingSenseForm';
import { syncApi } from '../sync/sync.api';
import type { LookupResult } from '../../../dictionary/freeDictionary';
import type { Entry } from '../../../domain/types';
import type { NotebookRow } from '../online-notebook/notebook.types';
interface Props {
  word: string;
  sourceUrl: string;
  rows: NotebookRow[];
  onlineEnabled: boolean;
  voiceURI: string | null;
  onSaved: () => void;
  onClose: () => void;
}
export default function ReadingLookup({
  word,
  sourceUrl,
  rows,
  onlineEnabled,
  voiceURI,
  onSaved,
  onClose,
}: Props) {
  const [senseIndex, setSenseIndex] = useState(0);
  const [frozen, setFrozen] = useState(false);
  const [saved, setSaved] = useState(false);
  const transfer = useRef<unknown>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const action = useAsyncAction();
  const speech = useAmericanSpeech(voiceURI);
  const load = useCallback(
    async (
      signal: AbortSignal,
    ): Promise<{ entries: Entry[]; result: LookupResult }> => {
      const entries = rows
        .map((row) => row.entry)
        .filter(
          (entry) =>
            entry.headword.toLocaleLowerCase('en-US') ===
            word.toLocaleLowerCase('en-US'),
        );
      if (entries.length)
        return {
          entries,
          result: {
            query: word,
            source: 'local' as const,
            phonetics: [],
            senses: entries.map((entry) => ({
              entryId: entry.id,
              partOfSpeech: entry.partOfSpeech,
              definition: entry.meaningVi,
              example: entry.examples[0]
                ? entry.examples[0].prefix +
                  entry.examples[0].targetSurface +
                  entry.examples[0].suffix
                : null,
              sourceUrls: entry.provenance.flatMap((source) =>
                source.url ? [source.url] : [],
              ),
              licenses: entry.provenance.map((source) => ({
                name: source.license,
                url: source.url,
              })),
            })),
          },
        };
      if (!onlineEnabled)
        throw new Error(
          'Đã tắt tra cứu qua mạng. Bạn có thể bật lại trong Cài đặt.',
        );
      return {
        entries: [],
        result: await new WiktionaryDictionary().lookup(word, signal),
      };
    },
    [word, rows, onlineEnabled],
  );
  const resource = useAsyncResource(load);
  const data = resource.data;
  const sense = data?.result.senses[senseIndex];
  async function save(entry: Entry) {
    if (saved || action.busy) return;
    if (!transfer.current) {
      transfer.current = {
        protocol: 1,
        type: 'capture-transfer',
        transferId: crypto.randomUUID(),
        captures: [
          {
            entry,
            capture: {
              id: crypto.randomUUID(),
              entryId: entry.id,
              selectedText: word,
              originalSentence: '',
              sourceUrl: sourceUrl || location.href,
              capturedAt: Date.now(),
            },
          },
        ],
      };
      setFrozen(true);
    }
    const result = await action.run((signal) =>
      syncApi.receive(transfer.current, signal),
    );
    if (result) {
      setSaved(true);
      setNotice(
        'Đã lưu từ vào tài khoản; tiến độ của từ đã tồn tại được giữ nguyên.',
      );
      onSaved();
    }
  }

  return (
    <section
      className="cloud-reading-popup"
      role="dialog"
      aria-label={`Tra từ ${word}`}
    >
      <div className="cloud-toolbar">
        <strong>EnglishVocab</strong>
        <Button variant="secondary" onClick={onClose} aria-label="Đóng tra từ">
          <Icon name="close" />
        </Button>
      </div>
      <h2>{word}</h2>
      <Button variant="secondary" onClick={() => speech.speak(word)}>
        Nghe từ · Mỹ
      </Button>
      {speech.error && (
        <StatusMessage tone="error">{speech.error}</StatusMessage>
      )}
      {resource.loading && <LoadingSkeleton variant="detail" label="Đang tra từ" />}
      {resource.error && (
        <>
          <StatusMessage tone="error">{resource.error}</StatusMessage>
          <Button variant="secondary" onClick={resource.reload}>
            Thử lại
          </Button>
        </>
      )}
      {data && sense && (
        <>
          <p>
            Nguồn tra:{' '}
            {data.result.source === 'local'
              ? 'Sổ tay của bạn'
              : 'FreeDictionaryAPI.com'}
          </p>
          <label>
            Chọn nghĩa
            <select
              value={senseIndex}
              disabled={action.busy || frozen}
              onChange={(event) => setSenseIndex(Number(event.target.value))}
            >
              {data.result.senses.map((item, index) => (
                <option value={index} key={index}>
                  {item.partOfSpeech} — {item.definition}
                </option>
              ))}
            </select>
          </label>
          <ReadingSenseForm
            key={`${word}-${senseIndex}`}
            word={word}
            result={data.result}
            sense={sense}
            entry={data.entries.find((entry) => entry.id === sense.entryId)}
            busy={action.busy}
            locked={frozen}
            saved={saved}
            onSave={save}
          />
        </>
      )}
      {frozen && !saved && (
        <StatusMessage>
          Nội dung đã được giữ cố định cho lượt lưu này. Nếu lỗi mạng, bấm Lưu
          từ để gửi lại cùng lượt, tránh nhập trùng.
        </StatusMessage>
      )}
      {action.error && (
        <StatusMessage tone="error">{action.error.message}</StatusMessage>
      )}
      {notice && <StatusMessage>{notice}</StatusMessage>}
    </section>
  );
}
