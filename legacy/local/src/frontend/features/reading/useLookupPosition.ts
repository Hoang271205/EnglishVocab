import { useLayoutEffect, useState } from 'react';
import type { RefObject } from 'react';
import type { ReadingSelection } from './types';

export function useLookupPosition(
  selection: ReadingSelection,
  panel: RefObject<HTMLDivElement | null>,
) {
  const [position, setPosition] = useState({ left: 12, top: 12 });
  useLayoutEffect(() => {
    function updatePosition() {
      const element = panel.current;

      if (!element) {
        return;
      }

      const anchor = selection.range.getBoundingClientRect();
      const box = element.getBoundingClientRect();
      const margin = 12;

      const left = Math.max(
        margin,
        Math.min(anchor.left, window.innerWidth - box.width - margin),
      );

      const below = anchor.bottom + 8;

      const top = Math.max(
        margin,
        below + box.height <= window.innerHeight - margin
          ? below
          : Math.min(
              anchor.top - box.height - 8,
              window.innerHeight - box.height - margin,
            ),
      );

      setPosition((previous) =>
        previous.left === left && previous.top === top
          ? previous
          : { left, top },
      );
    }

    updatePosition();

    const observer = new ResizeObserver(updatePosition);

    if (panel.current) {
      observer.observe(panel.current);
    }

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [selection, panel]);

  return position;
}
