export function getSelectionSentence(
  element: HTMLElement,
  range: Range,
): string {
  const raw = range.toString();
  const word = raw.trim();

  if (!word) return '';

  if (
    !element.contains(range.startContainer) ||
    !element.contains(range.endContainer)
  ) {
    return word;
  }

  // Đọc văn bản và tính vị trí bằng cùng một cách,
  // kể cả khi câu có nhiều thẻ HTML bên trong.
  const contents = document.createRange();
  contents.selectNodeContents(element);

  const fullText = contents.toString();

  const before = document.createRange();
  before.selectNodeContents(element);
  before.setEnd(range.startContainer, range.startOffset);

  const leadingSpaces = raw.length - raw.trimStart().length;
  const start = before.toString().length + leadingSpaces;
  const end = start + word.length;

  const segmenter = new Intl.Segmenter('en', {
    granularity: 'sentence',
  });

  for (const segment of segmenter.segment(fullText)) {
    const segmentEnd = segment.index + segment.segment.length;

    if (segment.index <= start && end <= segmentEnd) {
      return segment.segment.replace(/\s+/gu, ' ').trim();
    }
  }

  // Không lấy cả đoạn văn nếu không xác định được câu.
  return word;
}