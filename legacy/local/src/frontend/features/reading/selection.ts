import { queryKey } from '../../../../../../src/dictionary/freeDictionary';
import type { ReadingSelection } from './types';

export function captureReadingSelection(
  element: HTMLElement,
  range: Range,
  sourceUrl: string,
): ReadingSelection {
  const word = range.toString().trim();

  queryKey(word);

  if (
    !element.contains(range.startContainer) ||
    !element.contains(range.endContainer)
  ) {
    throw new Error('Hãy chọn từ bên trong phần bài đọc.');
  }

  return {
    id: crypto.randomUUID(),
    word,
    sourceUrl,
    capturedAt: Date.now(),
    range: range.cloneRange(),
  };
}
