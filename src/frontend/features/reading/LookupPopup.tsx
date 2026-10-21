import { useLookupPosition } from './useLookupPosition';
import { createReadingEntry, remoteIpa } from '../../../dictionary/readingEntry';
import type { ReadingSelection } from './types';
import { useEffect, useRef, useState } from 'react';

import type { Entry } from '../../../domain/types';
import type { LookupResult } from '../../../dictionary/freeDictionary';

import { backend, initializeBackend } from '../../backend';

type LocalDetails = Awaited<ReturnType<typeof backend.queries.details>>;

type LookupPopupProps = {
  selection: ReadingSelection;
  onClose: () => void;
  onSaved: () => void;
};

export default function LookupPopup({
  selection,
  onClose,
  onSaved,
}: LookupPopupProps) {
  const panel = useRef<HTMLDivElement | null>(null);
  const saveLock = useRef(false);

  const ids = useRef({
    entry: 'personal-' + crypto.randomUUID(),
    capture: crypto.randomUUID(),
  });

  const position = useLookupPosition(selection, panel);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [senseIndex, setSenseIndex] = useState(0);
  const [local, setLocal] = useState<LocalDetails | null>(null);

  const [meaningVi, setMeaningVi] = useState('');
  const [partOfSpeech, setPartOfSpeech] = useState('');

  const [loading, setLoading] = useState(true);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  const sense = result?.senses[senseIndex];

  const selectedLocal = local?.entry.id === sense?.entryId ? local : null;

  const ipa = selectedLocal
    ? selectedLocal.entry.pronunciation.accent === 'en-US'
      ? selectedLocal.entry.pronunciation.ipa
      : null
    : (remoteIpa(result, sense)?.text ?? null);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    async function lookup() {
      try {
        await initializeBackend();

        const response = await backend.dictionary.lookup(selection.word, {
          signal: controller.signal,
        });

        if (!cancelled) {
          setResult(response);
        }
      } catch (cause: unknown) {
        if (!cancelled) {
          setLookupError(
            cause instanceof Error ? cause.message : 'Không tra được từ.',
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void lookup();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [selection.id]);

  useEffect(() => {
    let cancelled = false;

    setLocal(null);
    setLocalError(null);
    setMeaningVi('');
    setPartOfSpeech(sense?.partOfSpeech ?? '');

    const entryId = sense?.entryId;

    if (entryId) {
      void backend.queries.details(entryId).then(
        (details) => {
          if (!cancelled) {
            setLocal(details);
          }
        },
        (cause: unknown) => {
          if (!cancelled) {
            setLocalError(
              cause instanceof Error
                ? cause.message
                : 'Không đọc được từ đã lưu.',
            );
          }
        },
      );
    }

    return () => {
      cancelled = true;
    };
  }, [sense]);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !saving) {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKey);

    return () => {
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose, saving]);

  function chooseSense(index: number) {
    setSenseIndex(index);
    setLocal(null);
    setMeaningVi('');
    setSaveError(null);

    ids.current = {
      entry: 'personal-' + crypto.randomUUID(),
      capture: crypto.randomUUID(),
    };
  }

  async function saveWord() {
    if (
      saveLock.current ||
      loading ||
      saved ||
      (sense?.entryId && !selectedLocal)
    ) {
      return;
    }

    saveLock.current = true;
    setSaving(true);
    setSaveError(null);

    try {
      let entry: Entry;

      if (selectedLocal) {
        // Đọc lại bản mới nhất; không cập nhật nội dung hay progress.
        entry = (await backend.queries.details(selectedLocal.entry.id)).entry;
      } else {
        entry = createReadingEntry({
          entryId: ids.current.entry,
          word: selection.word,
          result,
          sense,
          meaningVi,
          partOfSpeech,
        });
      }

      await backend.personal.save({
        entry,
        capture: {
          id: ids.current.capture,
          entryId: entry.id,
          selectedText: selection.word,
          originalSentence: selection.originalSentence,
          sourceUrl: selection.sourceUrl,
          capturedAt: selection.capturedAt,
        },
      });

      setSaved(
        selectedLocal
          ? 'Đã lưu ngữ cảnh. Nội dung và tiến độ hiện có được giữ nguyên.'
          : entry.contentStatus === 'ready'
            ? 'Đã lưu vào Từ của tôi — Chưa học.'
            : 'Đã lưu vào Từ của tôi — Chờ bổ sung.',
      );

      onSaved();
    } catch (cause: unknown) {
      setSaveError(
        cause instanceof Error
          ? cause.message
          : 'Chưa lưu được từ. Hãy thử lại.',
      );
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  }

  return (
    <div
      ref={panel}
      className="lookup-popup"
      role="dialog"
      aria-modal="false"
      aria-label={'Tra từ ' + selection.word}
      style={position}
    >
      <div className="entry-details-header">
        <strong>{selection.word}</strong>

        <button
          className="close-selection"
          type="button"
          disabled={saving}
          aria-label="Đóng popup tra từ"
          onClick={onClose}
        >
          ×
        </button>
      </div>

      {loading && <p role="status">Đang tra từ…</p>}

      {lookupError && (
        <p className="study-notice is-hint" role="status">
          {lookupError} Bạn vẫn có thể lưu từ dưới dạng nháp.
        </p>
      )}

      {result && (
        <p className="draft-status">
          Nguồn tra:{' '}
          {result.source === 'local'
            ? 'Thư viện trên thiết bị'
            : result.source === 'cache'
              ? 'Bộ nhớ tra cứu'
              : (result.provider?.name ?? 'Từ điển trực tuyến')}
        </p>
      )}

      {result && result.senses.length > 0 && (
        <label className="lookup-label">
          Chọn nghĩa
          <select
            value={senseIndex}
            disabled={saving || Boolean(saved)}
            onChange={(event) => chooseSense(Number(event.target.value))}
          >
            {result.senses.map((item, index) => (
              <option key={index} value={index}>
                {item.partOfSpeech} — {item.definition.slice(0, 110)}
              </option>
            ))}
          </select>
        </label>
      )}

      {sense && (
        <div className="lookup-definition">
          <strong>
            {sense.entryId ? 'Nghĩa đã lưu' : 'Định nghĩa tiếng Anh'}
          </strong>
          <p>{sense.definition}</p>
        </div>
      )}

      {sense?.entryId && !selectedLocal && !localError && (
        <p role="status">Đang đọc thông tin từ đã lưu…</p>
      )}

      {localError && (
        <p className="load-error" role="alert">
          {localError}
        </p>
      )}

      <p>IPA Mỹ: {ipa ?? 'Chưa có phiên âm Mỹ rõ nguồn'}</p>

      <p>
        CEFR: {selectedLocal?.entry.cefr.level ?? 'Chưa có'}
        {selectedLocal?.entry.cefr.status === 'estimated' ? ' · tham khảo' : ''}
      </p>

      <label className="lookup-label">
        Từ loại
        <input
          value={
            selectedLocal ? selectedLocal.entry.partOfSpeech : partOfSpeech
          }
          readOnly={Boolean(sense?.entryId)}
          disabled={loading || saving || Boolean(saved)}
          onChange={(event) => setPartOfSpeech(event.target.value)}
          maxLength={100}
        />
      </label>

      <label className="lookup-label">
        Nghĩa tiếng Việt
        <textarea
          value={selectedLocal ? selectedLocal.entry.meaningVi : meaningVi}
          readOnly={Boolean(sense?.entryId)}
          disabled={loading || saving || Boolean(saved)}
          placeholder="Có thể để trống và bổ sung trong Sổ tay."
          maxLength={10_000}
          onChange={(event) => setMeaningVi(event.target.value)}
        />
      </label>

      {sense?.example && (
        <div className="study-example">
          <strong>Ví dụ từ điển</strong>
          <p>{sense.example}</p>
        </div>
      )}

      <div className="study-example">
        <strong>Ngữ cảnh gốc trong bài đọc</strong>
        <p>{selection.originalSentence}</p>
      </div>

      {sense && (
        <details className="detail-section">
          <summary>Nguồn và giấy phép</summary>

          {sense.sourceUrls.map((url) => (
            <p key={url}>
              <a href={url} target="_blank" rel="noreferrer">
                {url}
              </a>
            </p>
          ))}

          {sense.licenses.map((license, index) => (
            <p key={index}>{license.name}</p>
          ))}
        </details>
      )}

      {!sense?.entryId && (
        <p className="draft-status">
          Thiếu nghĩa Việt, từ loại hoặc ví dụ phù hợp sẽ được lưu vào Chờ bổ
          sung. IPA và CEFR không bắt buộc.
        </p>
      )}

      {saveError && (
        <p className="load-error" role="alert">
          {saveError}
        </p>
      )}

      {saved ? (
        <p className="study-notice is-success" role="status">
          {saved}
        </p>
      ) : (
        <button
          className="primary-button study-next"
          type="button"
          disabled={
            loading || saving || Boolean(sense?.entryId && !selectedLocal)
          }
          onClick={() => void saveWord()}
        >
          {saving ? 'Đang lưu…' : 'Lưu từ'}
        </button>
      )}
    </div>
  );
}
