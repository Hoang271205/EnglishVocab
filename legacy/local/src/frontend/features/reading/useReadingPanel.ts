import { useRef, useState } from 'react';
import type { ReadingSelection } from './types';
import { captureReadingSelection } from './selection';
import { useReadingTrigger } from './useReadingTrigger';

export function useReadingPanel() {
  const article = useRef<HTMLDivElement | null>(null);
  const [draft, setDraft] = useState('');
  const [sourceInput, setSourceInput] = useState('');
  const [text, setText] = useState('');
  const [sourceUrl, setSourceUrl] = useState(window.location.href);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<ReadingSelection | null>(null);
  const [popupOpen, setPopupOpen] = useState(false);
  const iconPosition = useReadingTrigger(selection, popupOpen, setSelection);
  function openReading() {
    setError(null);
    try {
      const url = new URL(sourceInput.trim() || window.location.href);
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Nguồn bài đọc phải là URL HTTP hoặc HTTPS.');
      }
      setPopupOpen(false);
      setSelection(null);
      setSourceUrl(url.href);
      setText(draft.trim());
    } catch (cause: unknown) {
      setError(
        cause instanceof Error ? cause.message : 'URL nguồn chưa hợp lệ.',
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
      setError(null);
      setSelection(captureReadingSelection(element, range, sourceUrl));
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
  return {
    sourceInput,
    setSourceInput,
    draft,
    setDraft,
    openReading,
    error,
    text,
    article,
    captureSelection,
    selection,
    popupOpen,
    iconPosition,
    setPopupOpen,
    closePopup,
  };
}
