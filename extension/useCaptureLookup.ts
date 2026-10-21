import { useEffect, useRef, useState } from 'react';
import type { Entry } from '../src/domain/types';
import type { LookupResult } from '../src/dictionary/freeDictionary';
import {
  createReadingEntry,
  remoteIpa,
} from '../src/dictionary/readingEntry';
import type { SelectedWord } from './SelectionPopup';
import type { CaptureItem } from './queue';
import { requestWorker } from './client';

type ExtensionLookup = LookupResult & {
  entries?: Entry[];
};

function errorMessage(cause: unknown): string {
  return cause instanceof Error
    ? cause.message
    : 'Không thực hiện được thao tác.';
}

export function useCaptureLookup(selection: SelectedWord) {
  const [result, setResult] = useState<ExtensionLookup | null>(null);
  const [senseIndex, setSenseIndex] = useState(0);
  const [meaningVi, setMeaningVi] = useState('');
  const [partOfSpeech, setPartOfSpeech] = useState('');

  const [loading, setLoading] = useState(true);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [frozen, setFrozen] = useState(false);

  const saveLock = useRef(false);
  const pendingItem = useRef<CaptureItem | null>(null);

  const sense = result?.senses[senseIndex];

  const localEntry = sense?.entryId
    ? result?.entries?.find((entry) => entry.id === sense.entryId)
    : undefined;

  const ipa =
    result?.source === 'local'
      ? localEntry?.pronunciation.accent === 'en-US'
        ? localEntry.pronunciation.ipa
        : null
      : remoteIpa(result, sense)?.text ?? null;

  useEffect(() => {
    let cancelled = false;

    async function lookup() {
      try {
        const response = await requestWorker<ExtensionLookup>({
          type: 'lookup',
          query: selection.word,
        });

        if (!cancelled) {
          setResult(response);
          setPartOfSpeech(response.senses[0]?.partOfSpeech ?? '');
        }
      } catch (cause: unknown) {
        if (!cancelled) {
          setLookupError(errorMessage(cause));
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
    };
  }, [selection]);

  function chooseSense(index: number) {
    if (saving || frozen || saved) {
      return;
    }

    setSenseIndex(index);
    setMeaningVi('');
    setPartOfSpeech(result?.senses[index]?.partOfSpeech ?? '');
    setSaveError(null);
  }

  async function save() {
    if (
      saveLock.current ||
      loading ||
      saved ||
      (sense?.entryId && !localEntry)
    ) {
      return;
    }

    saveLock.current = true;
    setSaving(true);
    setSaveError(null);

    try {
      if (!pendingItem.current) {
        const entry =
          localEntry ??
          createReadingEntry({
            entryId: 'personal-' + crypto.randomUUID(),
            word: selection.word,
            result,
            sense,
            meaningVi,
            partOfSpeech,
          });

        pendingItem.current = {
          entry,
          capture: {
            id: crypto.randomUUID(),
            entryId: entry.id,
            selectedText: selection.word,
            originalSentence: selection.originalSentence,
            sourceUrl: selection.sourceUrl,
            capturedAt: Date.now(),
          },
        };

        setFrozen(true);
      }

      const acknowledgment = await requestWorker<{
        saved: boolean;
        duplicate: boolean;
      }>({
        type: 'queue-save',
        item: pendingItem.current,
      });

      if (acknowledgment.saved !== true) {
        throw new Error('Extension chưa xác nhận lưu thành công.');
      }

      setSaved(
        localEntry
          ? 'Đã lưu ngữ cảnh trong extension. Khi chuyển về web, tiến độ của từ hiện có được giữ nguyên.'
          : pendingItem.current.entry.contentStatus === 'ready'
            ? 'Đã lưu từ trong extension, chờ chuyển về web để học.'
            : 'Đã lưu bản nháp trong extension. Bạn có thể bổ sung sau khi chuyển về web.',
      );
    } catch (cause: unknown) {
      setSaveError(errorMessage(cause));
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  }

  return {
    result,
    sense,
    senseIndex,
    localEntry,
    ipa,
    meaningVi,
    partOfSpeech,
    loading,
    lookupError,
    saveError,
    saving,
    saved,
    locked: loading || saving || frozen || Boolean(saved),
    chooseSense,
    setMeaningVi,
    setPartOfSpeech,
    save,
  };
}