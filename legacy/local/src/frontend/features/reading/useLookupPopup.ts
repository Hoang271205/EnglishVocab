import { useLookupPosition } from './useLookupPosition';
import {
  createReadingEntry,
  remoteIpa,
} from '../../../../../../src/dictionary/readingEntry';
import { useEffect, useRef, useState } from 'react';
import type { Entry } from '../../../../../../src/domain/types';
import type { LookupResult } from '../../../../../../src/dictionary/freeDictionary';
import { backend, initializeBackend } from '../../backend';
import type { LocalDetails, LookupPopupProps } from './types';

export function useLookupPopup({
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
          originalSentence: '',
          sourceUrl: selection.sourceUrl,
          capturedAt: selection.capturedAt,
        },
      });
      setSaved(
        selectedLocal
          ? 'Từ đã có trong Sổ tay. Nội dung và tiến độ hiện có được giữ nguyên.'
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
  return {
    panel,
    position,
    saving,
    loading,
    lookupError,
    result,
    senseIndex,
    saved,
    chooseSense,
    sense,
    selectedLocal,
    localError,
    ipa,
    partOfSpeech,
    setPartOfSpeech,
    meaningVi,
    setMeaningVi,
    saveError,
    saveWord,
  };
}
