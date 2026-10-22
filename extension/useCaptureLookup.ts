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

  const [translating, setTranslating] = useState(false);
  const [translationError, setTranslationError] =
    useState<string | null>(null);
  const [translationSuggested, setTranslationSuggested] =
    useState(false);

  const saveLock = useRef(false);
  const pendingItem = useRef<CaptureItem | null>(null);
  const meaningEdited = useRef(false);
  const translationRequest = useRef(0);

  const sense = result?.senses[senseIndex];

  const localEntry = sense?.entryId
    ? result?.entries?.find((entry) => entry.id === sense.entryId)
    : undefined;

  const ipa =
    result?.source === 'local'
      ? localEntry?.pronunciation.accent === 'en-US'
        ? localEntry.pronunciation.ipa
        : null
      : (remoteIpa(result, sense)?.text ?? null);

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

  useEffect(() => {
    let cancelled = false;
    const requestId = ++translationRequest.current;

    meaningEdited.current = false;
    setMeaningVi('');
    setTranslationError(null);
    setTranslationSuggested(false);
    setTranslating(false);

    // Từ trong thư viện sử dụng nghĩa Việt đã lưu.
    if (!sense || sense.entryId) return;

    const input = {
      word: selection.word,
      partOfSpeech: sense.partOfSpeech,
      definition: sense.definition,
    };

    setTranslating(true);

    function isCurrentRequest() {
      return (
        !cancelled &&
        requestId === translationRequest.current
      );
    }

    async function loadTranslation() {
      try {
        const response = await requestWorker<{
          text: string;
          source: 'cache' | 'api';
        }>({
          type: 'translate-sense',
          input,
        });

        if (
          typeof response.text !== 'string' ||
          !response.text.trim()
        ) {
          throw new Error('Dịch vụ chưa trả về nghĩa tiếng Việt.');
        }

        if (isCurrentRequest() && !meaningEdited.current) {
          setMeaningVi(response.text);
          setTranslationSuggested(true);
        }
      } catch (cause: unknown) {
        if (isCurrentRequest()) {
          setTranslationError(errorMessage(cause));
        }
      } finally {
        if (isCurrentRequest()) {
          setTranslating(false);
        }
      }
    }

    void loadTranslation();

    return () => {
      cancelled = true;
    };
  }, [sense, selection.word]);

  function editMeaningVi(value: string) {
    meaningEdited.current = true;
    setMeaningVi(value);
  }

  function chooseSense(index: number) {
    if (
      saving ||
      frozen ||
      saved ||
      index === senseIndex ||
      !result?.senses[index]
    ) {
      return;
    }

    // Vô hiệu hóa ngay kết quả dịch của nghĩa trước.
    translationRequest.current++;
    meaningEdited.current = false;

    setSenseIndex(index);
    setMeaningVi('');
    setTranslationError(null);
    setTranslationSuggested(false);
    setTranslating(true);
    setPartOfSpeech(result.senses[index].partOfSpeech);
    setSaveError(null);
  }

  async function save() {
    if (
      saveLock.current ||
      loading ||
      translating ||
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

        if (
          !localEntry &&
          translationSuggested &&
          meaningVi.trim()
        ) {
          entry.provenance = [
            ...entry.provenance.filter(
              (source) => source.field !== 'meaning',
            ),
            {
              field: 'meaning',
              attribution: meaningEdited.current
                ? 'Gợi ý dịch MyMemory, được người dùng chỉnh sửa'
                : 'MyMemory — bản dịch máy tham khảo',
              license: 'Theo điều khoản nhà cung cấp; chưa xác minh',
              url: 'https://mymemory.translated.net/',
              status: 'unverified',
              checkedAt: null,
            },
          ];
        }

        pendingItem.current = {
          entry,
          capture: {
            id: crypto.randomUUID(),
            entryId: entry.id,
            selectedText: selection.word,
            originalSentence: '',
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
          ? 'Đã lưu trong extension. Khi chuyển về web, tiến độ của từ hiện có được giữ nguyên.'
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
    translating,
    translationError,
    translationSuggested,
    locked: loading || saving || frozen || Boolean(saved),
    chooseSense,
    setMeaningVi: editMeaningVi,
    setPartOfSpeech,
    save,
  };
}