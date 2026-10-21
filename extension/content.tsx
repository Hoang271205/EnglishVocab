import { createRoot } from 'react-dom/client';
import { queryKey } from '../src/dictionary/freeDictionary';
import SelectionPopup from './SelectionPopup';
import type { SelectedWord } from './SelectionPopup';
import { selectionStyles } from './selectionStyles';

const hostId = 'englishvocab-selection-root';

function startSelectionPopup() {
  if (document.getElementById(hostId)) {
    return;
  }

  const host = document.createElement('div');
  host.id = hostId;

  host.style.setProperty('position', 'fixed', 'important');
  host.style.setProperty('top', '0', 'important');
  host.style.setProperty('left', '0', 'important');
  host.style.setProperty('z-index', '2147483647', 'important');

  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = selectionStyles;

  const container = document.createElement('div');

  shadow.append(style, container);
  document.documentElement.append(host);

  const root = createRoot(container);

  function closePopup() {
    root.render(null);
  }

  function captureSelection() {
    const selected = window.getSelection();

    if (!selected || selected.isCollapsed || !selected.rangeCount) {
      closePopup();
      return;
    }

    const range = selected.getRangeAt(0);

    const startElement =
      range.startContainer.parentElement;

    const endElement =
      range.endContainer.parentElement;

    const excluded =
      'input, textarea, select, ' +
      '[contenteditable]:not([contenteditable="false"])';

    if (
      !startElement ||
      !endElement ||
      startElement.closest(excluded) ||
      endElement.closest(excluded)
    ) {
      closePopup();
      return;
    }

    const word = range.toString().trim();

    try {
      queryKey(word);
    } catch {
      closePopup();
      return;
    }

    const contextElement =
      startElement.closest(
        'p, li, blockquote, figcaption, td, h1, h2, h3, h4',
      ) ?? startElement;

    const originalSentence =
      (contextElement.textContent ?? word).trim().slice(0, 20_000);

    const selection: SelectedWord = {
      word,
      originalSentence,
      sourceUrl: window.location.href,
      range: range.cloneRange(),
    };

    root.render(
      <SelectionPopup
        key={crypto.randomUUID()}
        selection={selection}
        onClose={closePopup}
      />,
    );
  }

  document.addEventListener('pointerup', (event) => {
    // Thao tác trong popup không tạo một vùng chọn mới.
    if (event.composedPath().includes(host)) {
      return;
    }

    window.setTimeout(captureSelection, 0);
  });

  document.addEventListener('keyup', (event) => {
    if (event.composedPath().includes(host)) {
      return;
    }

    if (
      ['Shift', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']
        .includes(event.key)
    ) {
      captureSelection();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closePopup();
    }
  });
}

startSelectionPopup();