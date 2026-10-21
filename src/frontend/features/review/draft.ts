import type { Question } from '../../../domain/types';

export function restoreLetters(question: Question, draft: string): string[] {
  const characters = Array.from(draft.normalize('NFKC'));

  return question.cells.flatMap((cell, index) => {
    if (cell.kind === 'fixed') {
      return [];
    }

    const character = characters[index] ?? '';

    return [
      characters.length === question.cells.length && /^\p{L}$/u.test(character)
        ? character
        : '',
    ];
  });
}

export function makeDraft(question: Question, letters: string[]): string {
  let index = 0;

  return question.cells
    .map((cell) =>
      cell.kind === 'fixed' ? cell.value : letters[index++] || '_',
    )
    .join('');
}
