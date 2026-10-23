import { useLayoutEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { ReadingSelection } from './types';

export function useReadingTrigger(
  selection: ReadingSelection | null,
  popupOpen: boolean,
  setSelection: Dispatch<SetStateAction<ReadingSelection | null>>,
) {
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
  }, [selection, popupOpen, setSelection]);

  return iconPosition;
}
