import MascotImage from './MascotImage';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import DictionaryForm from './DictionaryForm';
import { translateOnDevice } from './chromeTranslator';
import { maxTranslationLength } from './selectedText';
import type { selectionModes, SelectionMode } from './selectedText';

export type SelectedWord = {
  word: string;
  sourceUrl: string;
  range: Range;
};

type SelectionPopupProps = {
  selection: SelectedWord;
  modes: NonNullable<ReturnType<typeof selectionModes>>;
  onClose: () => void;
};

type TranslationState =
  | { status: 'idle' }
  | { status: 'working'; download?: number }
  | { status: 'ready'; text: string }
  | { status: 'error'; message: string };

export default function SelectionPopup({
  selection,
  modes,
  onClose,
}: SelectionPopupProps) {
  const [mode, setMode] = useState<SelectionMode | null>(null);
  const [dictionaryOpened, setDictionaryOpened] = useState(false);
  const [translation, setTranslation] = useState<TranslationState>({
    status: 'idle',
  });
  const request = useRef<AbortController | null>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ left: 8, top: 8 });
  const open = mode !== null;
  const wide = modes.preferred === 'translation';
  const label = modes.preferred === 'translation' ? 'Dịch câu' : 'Tra từ';

  useEffect(() => () => request.current?.abort(), []);

  function startTranslation() {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    const timeout = AbortSignal.timeout(90_000);
    const signal = AbortSignal.any([controller.signal, timeout]);
    setTranslation({ status: 'working' });

    void translateOnDevice(selection.word, signal, (download) => {
      setTranslation({ status: 'working', download });
    })
      .then(
        (text) => {
          if (!controller.signal.aborted)
            setTranslation({ status: 'ready', text });
        },
        (error: unknown) => {
          if (!controller.signal.aborted) {
            setTranslation({
              status: 'error',
              message: timeout.aborted
                ? 'Chrome tải gói dịch quá lâu. Hãy kiểm tra mạng và thử lại.'
                : error instanceof Error
                  ? error.message
                  : 'Chưa dịch được. Hãy thử lại.',
            });
          }
        },
      )
      .finally(() => {
        request.current = null;
      });
  }

  function show(next: SelectionMode) {
    setMode(next);
    if (next === 'dictionary') setDictionaryOpened(true);
    else if (translation.status === 'idle') startTranslation();
  }

  useLayoutEffect(() => {
    function updatePosition() {
      const rect = selection.range.getBoundingClientRect();
      const width = open
        ? Math.min(wide ? 540 : 400, window.innerWidth - 16)
        : 128;

      setPosition({
        left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
        top: open ? 8 : Math.max(8, rect.top - 52),
      });
    }

    updatePosition();
    if (open) closeButton.current?.focus({ preventScroll: true });

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [selection, open, wide]);

  if (!open) {
    return (
      <button
        className="lookup-trigger"
        style={position}
        type="button"
        aria-label={label}
        title={`EnglishVocab: ${label}`}
        onPointerDown={(event) => {
          if (event.pointerType === 'mouse') {
            event.preventDefault();
          }
        }}
        onClick={() => show(modes.preferred)}
      >
        <MascotImage />
        <span>{label}</span>
      </button>
    );
  }

  return (
    <section
      className={wide ? 'lookup-panel lookup-panel-wide' : 'lookup-panel'}
      style={position}
      role="dialog"
      aria-label={
        mode === 'translation'
          ? 'Dịch câu Anh–Việt'
          : `Tra từ ${selection.word}`
      }
    >
      <header>
        <strong className="extension-brand">
          <MascotImage /> EnglishVocab
        </strong>

        <button
          type="button"
          ref={closeButton}
          className="close-button"
          aria-label="Đóng popup"
          onClick={onClose}
        >
          ×
        </button>
      </header>

      {modes.translation && (
        <div className="lookup-modes" role="group" aria-label="Chế độ tra cứu">
          <button
            type="button"
            aria-pressed={mode === 'translation'}
            onClick={() => show('translation')}
          >
            Dịch câu
          </button>
          <button
            type="button"
            aria-pressed={mode === 'dictionary'}
            disabled={!modes.dictionary}
            title={
              modes.dictionary
                ? undefined
                : 'Bôi đen một từ hoặc cụm từ ngắn để tra từ điển'
            }
            onClick={() => show('dictionary')}
          >
            Từ điển
          </button>
        </div>
      )}

      {dictionaryOpened && (
        <div className="lookup-dictionary" hidden={mode !== 'dictionary'}>
          <h2>{selection.word}</h2>
          <DictionaryForm selection={selection} onClose={onClose} />
        </div>
      )}

      {mode === 'translation' && (
        <section
          className="sentence-translation"
          aria-label="Bản dịch trên máy"
        >
          <div className="sentence-heading">
            <h2>Dịch câu</h2>
            <span>EN → VI · Trên máy</span>
          </div>
          <p className="sentence-label">Nguyên văn</p>
          <p className="sentence-source" lang="en">
            {selection.word.length > maxTranslationLength
              ? `${selection.word.slice(0, 160)}…`
              : selection.word}
          </p>
          <p className="sentence-label">Tiếng Việt</p>
          {translation.status === 'working' && (
            <p className="sentence-output" role="status">
              {translation.download !== undefined && translation.download < 100
                ? `Đang tải gói Anh–Việt… ${translation.download}%`
                : 'Đang chuẩn bị bản dịch…'}
            </p>
          )}
          {translation.status === 'ready' && (
            <p className="sentence-output" role="status" lang="vi">
              {translation.text}
            </p>
          )}
          {translation.status === 'error' && (
            <div className="sentence-error">
              <p className="message" role="alert">
                {translation.message}
              </p>
              <button
                className="cancel-word"
                type="button"
                onClick={startTranslation}
              >
                Thử lại
              </button>
            </div>
          )}
        </section>
      )}
    </section>
  );
}
