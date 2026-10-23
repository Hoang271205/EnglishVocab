import type { ClozeCell } from '../../../domain/types';

export function restoreLetters(
  cells: ClozeCell[],
  draft: string,
): string[] {
  const characters = Array.from(draft.normalize('NFKC'));

  return cells.flatMap((cell, index) => {
    if (cell.kind === 'fixed') return [];

    const character = characters[index] ?? '';

    return [
      /^\p{L}$/u.test(character) ? character : '',
    ];
  });
}

export function createDraft(
  cells: ClozeCell[],
  letters: string[],
): string {
  let index = 0;

  return cells
    .map((cell) =>
      cell.kind === 'fixed'
        ? cell.value
        : letters[index++] || '_',
    )
    .join('');
}

export function isComplete(
  cells: ClozeCell[],
  letters: string[],
) {
  const count = cells.filter(
    (cell) => cell.kind === 'blank',
  ).length;

  return (
    count > 0 &&
    letters.length === count &&
    letters.every((letter) => /^\p{L}$/u.test(letter))
  );
}