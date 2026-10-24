import MascotImage from './MascotImage';
import { useLayoutEffect, useRef, useState } from 'react';
import DictionaryForm from './DictionaryForm';

export type SelectedWord = {
  word: string;
  sourceUrl: string;
  range: Range;
};

type SelectionPopupProps = {
  selection: SelectedWord;
  onClose: () => void;
};

export default function SelectionPopup({
  selection,
  onClose,
}: SelectionPopupProps) {
  const [open, setOpen] = useState(false);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ left: 8, top: 8 });

  useLayoutEffect(() => {
    function updatePosition() {
      const rect = selection.range.getBoundingClientRect();
      const width = open ? Math.min(400, window.innerWidth - 16) : 128;

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
  }, [selection, open]);

  if (!open) {
    return (
      <button
        className="lookup-trigger"
        style={position}
        type="button"
        aria-label={`Tra từ ${selection.word}`}
        title={`EnglishVocab: tra ${selection.word}`}
        onPointerDown={(event) => {
          if (event.pointerType === 'mouse') {
            event.preventDefault();
          }
        }}
        onClick={() => setOpen(true)}
      >
        <MascotImage />
        <span>Tra từ</span>
      </button>
    );
  }

  return (
    <section
      className="lookup-panel"
      style={position}
      role="dialog"
      aria-label={`Tra từ ${selection.word}`}
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

      <h2>{selection.word}</h2>
      <DictionaryForm selection={selection} onClose={onClose} />
    </section>
  );
}
