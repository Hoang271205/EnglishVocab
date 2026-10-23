import { ServiceError } from './types.js';
import type { ClozeCell } from './types.js';
export function createMask(surface: string): ClozeCell[] {
  const normalized = surface.normalize('NFKC');
  const letters = Array.from(normalized).filter((c) => /\p{L}/u.test(c)).length;
  if (!letters) throw new ServiceError('validation', 'Target needs a letter');
  const blanks = Math.max(1, Math.ceil(letters / 2));
  let seen = 0;
  return Array.from(normalized).map((value) => {
    if (!/\p{L}/u.test(value)) return { kind: 'fixed', value };
    // Evenly distributed deterministic positions, including the final letter.
    const hide =
      Math.floor(((seen + 1) * blanks) / letters) >
      Math.floor((seen * blanks) / letters);
    seen++;
    return hide ? { kind: 'blank' } : { kind: 'fixed', value };
  });
}
export function isClozeLetter(cell: ClozeCell): boolean {
  return cell.kind === 'blank' || /^\p{L}$/u.test(cell.value);
}
export function assembleAnswer(
  cells: readonly ClozeCell[],
  letters: readonly string[],
  editableHints = false,
): string {
  const editable = (cell: ClozeCell) =>
    editableHints ? isClozeLetter(cell) : cell.kind === 'blank';
  if (
    letters.length !== cells.filter(editable).length ||
    letters.some((c) => !/^\p{L}$/u.test(c))
  )
    throw new ServiceError('validation', 'Fill all missing letters');
  let index = 0;
  return cells
    .map((c) =>
      editable(c) ? letters[index++] : c.kind === 'fixed' ? c.value : '',
    )
    .join('');
}
export function validateClozeAnswer(
  answer: string,
  cells: readonly ClozeCell[],
  editableHints = false,
): void {
  const chars = Array.from(answer.normalize('NFKC'));
  if (
    chars.length !== cells.length ||
    cells.some((cell, index) => {
      const editable = editableHints
        ? isClozeLetter(cell)
        : cell.kind === 'blank';
      return editable && !/^\p{L}$/u.test(chars[index] ?? '');
    })
  )
    throw new ServiceError('validation', 'Fill all missing letters');
  if (
    cells.some(
      (c, i) =>
        c.kind === 'fixed' &&
        !(editableHints && isClozeLetter(c)) &&
        c.value.toLowerCase() !== chars[i]?.toLowerCase(),
    )
  )
    throw new ServiceError('validation', 'Fixed letters must stay unchanged');
}
