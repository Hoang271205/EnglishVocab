import { useLayoutEffect, useState } from 'react';
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
  const [position, setPosition] = useState({ left: 8, top: 8 });

  useLayoutEffect(() => {
    function updatePosition() {
      const rect = selection.range.getBoundingClientRect();
      const width = open
        ? Math.min(340, window.innerWidth - 16)
        : 36;

      setPosition({
        left: Math.max(
          8,
          Math.min(rect.left, window.innerWidth - width - 8),
        ),
        top: open
          ? 8
          : Math.max(8, rect.top - 44),
      });
    }

    updatePosition();

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
        🔍
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
        <strong>EnglishVocab</strong>

        <button
          type="button"
          className="close-button"
          aria-label="Đóng popup"
          onClick={onClose}
        >
          ×
        </button>
      </header>

      <h2>{selection.word}</h2>
      <DictionaryForm selection={selection} />
      

      
    </section>
  );
}
