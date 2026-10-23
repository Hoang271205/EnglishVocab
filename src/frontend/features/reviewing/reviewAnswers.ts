import { isClozeLetter } from '../../../domain/cloze';
import type { ClozeCell } from '../../../domain/types';

export function restoreLetters(cells: ClozeCell[], draft: string): string[] {
  const characters = Array.from(draft.normalize('NFKC'));
  return cells.flatMap((cell, index) => {
    if (!isClozeLetter(cell)) return [];
    const character = characters[index] ?? '';
    return [/^\p{L}$/u.test(character) ? character : ''];
  });
}

export function createDraft(cells: ClozeCell[], letters: string[]): string {
  let index = 0;
  return cells
    .map((cell) =>
      isClozeLetter(cell)
        ? letters[index++] || '_'
        : cell.kind === 'fixed'
          ? cell.value
          : '',
    )
    .join('');
}

export function isComplete(cells: ClozeCell[], letters: string[]) {
  const count = cells.filter(isClozeLetter).length;
  return (
    count > 0 &&
    letters.length === count &&
    letters.every((letter) => /^\p{L}$/u.test(letter))
  );
}
