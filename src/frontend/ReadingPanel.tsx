import { useLayoutEffect, useRef, useState } from 'react';
import LookupPopup from './LookupPopup';
import type { ReadingSelection } from './LookupPopup';
import { queryKey } from '../dictionary/freeDictionary';

type Props = {
  onClose: () => void;
  onSaved: () => void;
};

export default function ReadingPanel({
  onClose,
  onSaved,
}: Props) {
  const article = useRef<HTMLDivElement | null>(null);

  const [draft, setDraft] = useState('');
  const [sourceInput, setSourceInput] = useState('');
  const [text, setText] = useState('');
  const [sourceUrl, setSourceUrl] = useState(window.location.href);
  const [error, setError] = useState<string | null>(null);

  const [selection, setSelection] =
    useState<ReadingSelection | null>(null);
    const [popupOpen, setPopupOpen] = useState(false);

const [iconPosition, setIconPosition] = useState({
  left: 0,
  top: 0,
});

useLayoutEffect(() => {
  if (!selection || popupOpen) {
    return;
  }

  function updatePosition() {
    if (!selection) return;

    const rect = selection.range.getBoundingClientRect();
    const size = 36;
    const gap = 8;

    setIconPosition({
      left: Math.max(
        8,
        Math.min(
          rect.left + rect.width / 2 - size / 2,
          window.innerWidth - size - 8,
        ),
      ),
      top:
        rect.top >= size + gap + 8
          ? rect.top - size - gap
          : rect.bottom + gap,
    });
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      setSelection(null);
    }
  }

  updatePosition();

  window.addEventListener('scroll', updatePosition, true);
  window.addEventListener('resize', updatePosition);
  window.addEventListener('keydown', handleKeyDown);

  return () => {
    window.removeEventListener('scroll', updatePosition, true);
    window.removeEventListener('resize', updatePosition);
    window.removeEventListener('keydown', handleKeyDown);
  };
}, [selection, popupOpen]);
  function openReading() {
    setError(null);

    try {
      const url = new URL(
        sourceInput.trim() || window.location.href,
      );

      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Nguồn bài đọc phải là URL HTTP hoặc HTTPS.');
      }
     setPopupOpen(false);
      setSelection(null);
      setSourceUrl(url.href);
      setText(draft.trim());
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'URL nguồn chưa hợp lệ.',
      );
    }
  }

  function captureSelection() {
    const element = article.current;
  const selected = window.getSelection();

  setPopupOpen(false);

  if (
    !element ||
    !selected ||
    selected.isCollapsed ||
    selected.rangeCount === 0
  ) {
    setSelection(null);
    return;
  }

    const range = selected.getRangeAt(0);

    if (
      !element.contains(range.startContainer) ||
      !element.contains(range.endContainer)
    ) {
      return;
    }

    const raw = range.toString();
    const word = raw.trim();

    if (!word) {
      return;
    }

    try {
      // Kiểm tra đây là từ/cụm từ ngắn mà service hỗ trợ.
      queryKey(word);

      const before = document.createRange();
      before.selectNodeContents(element);
      before.setEnd(range.startContainer, range.startOffset);

      const start =
        before.toString().length +
        raw.length -
        raw.trimStart().length;

      const end = start + word.length;
      const fullText = element.textContent ?? '';

      const segmenter = new Intl.Segmenter('en', {
        granularity: 'sentence',
      });

      let originalSentence = fullText;

      for (const segment of segmenter.segment(fullText)) {
        const segmentEnd =
          segment.index + segment.segment.length;

        if (segment.index <= start && segmentEnd >= end) {
          originalSentence = segment.segment.trim();
          break;
        }
      }

      setError(null);

      setSelection({
        id: crypto.randomUUID(),
        word,
        originalSentence,
        sourceUrl,
        capturedAt: Date.now(),
        range: range.cloneRange(),
      });
    } catch (cause: unknown) {
      setSelection(null);
      setError(
        cause instanceof Error
          ? cause.message
          : 'Hãy chọn một từ hoặc cụm từ ngắn.',
      );
    }
  }

  function closePopup() {
    setPopupOpen(false);
  setSelection(null);
  article.current?.focus();
  }

  return (
    <section
      className="reading-panel"
      aria-labelledby="reading-title"
    >
      <div className="entry-details-header">
        <h2 id="reading-title">Reading</h2>

        <button
          className="secondary-button"
          type="button"
          onClick={onClose}
        >
          Đóng Reading
        </button>
      </div>

      <p className="topic-message">
        Dán bài đọc, bấm Mở bài đọc rồi bôi đen từ cần tra.
      </p>

      <label className="lookup-label">
        Nguồn bài đọc, nếu có
        <input
          type="url"
          value={sourceInput}
          placeholder="https://..."
          onChange={(event) =>
            setSourceInput(event.target.value)
          }
        />
      </label>

      <label className="lookup-label">
        Nội dung tiếng Anh
        <textarea
          className="reading-editor"
          value={draft}
          maxLength={20_000}
          onChange={(event) => setDraft(event.target.value)}
        />
      </label>

      <button
        className="primary-button"
        type="button"
        disabled={!draft.trim()}
        onClick={openReading}
      >
        Mở bài đọc
      </button>

      {error && (
        <p className="load-error" role="alert">{error}</p>
      )}

      {text && (
        <div
          ref={article}
          className="reading-article"
          tabIndex={0}
          aria-label="Bài đọc tiếng Anh"
          onPointerUp={() => {
            window.setTimeout(captureSelection, 0);
          }}
          onKeyUp={(event) => {
            if (
              ['Shift', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']
                .includes(event.key)
            ) {
              captureSelection();
            }
          }}
        >
          {text}
        </div>
      )}

      {selection && !popupOpen && (
  <button
    className="reading-lookup-trigger"
    type="button"
    style={{
      left: iconPosition.left,
      top: iconPosition.top,
    }}
    aria-label={`Tra từ ${selection.word}`}
    title={`Tra từ ${selection.word}`}
    onPointerDown={(event) => {
      // Giữ vùng bôi đen khi bấm icon bằng chuột.
      if (event.pointerType === 'mouse') {
        event.preventDefault();
      }
    }}
    onClick={() => setPopupOpen(true)}
  >
    <span aria-hidden="true">🔍</span>
  </button>
)}

{selection && popupOpen && (
  <LookupPopup
    key={selection.id}
    selection={selection}
    onClose={closePopup}
    onSaved={onSaved}
  />
)}
    </section>
  );
}