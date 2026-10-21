import { queryKey } from '../../../dictionary/freeDictionary';
import type { ReadingSelection } from './types';

export function captureReadingSelection(
  element: HTMLElement,
  range: Range,
  sourceUrl: string,
): ReadingSelection {
  const raw = range.toString();
  const word = raw.trim();
  queryKey(word);

  const before = document.createRange();
  before.selectNodeContents(element);
  before.setEnd(range.startContainer, range.startOffset);

  const start = before.toString().length + raw.length - raw.trimStart().length;

  const end = start + word.length;
  const fullText = element.textContent ?? '';

  const segmenter = new Intl.Segmenter('en', {
    granularity: 'sentence',
  });

  let originalSentence = fullText;

  for (const segment of segmenter.segment(fullText)) {
    const segmentEnd = segment.index + segment.segment.length;

    if (segment.index <= start && segmentEnd >= end) {
      originalSentence = segment.segment.trim();
      break;
    }
  }

  return {
    id: crypto.randomUUID(),
    word,
    originalSentence,
    sourceUrl,
    capturedAt: Date.now(),
    range: range.cloneRange(),
  };
}
