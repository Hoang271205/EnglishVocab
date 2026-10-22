import { ServiceError } from './types.js';
import type { ClozeCell } from './types.js';
export function createMask(surface: string): ClozeCell[] {
 const normalized=surface.normalize('NFKC');
 const letters = Array.from(normalized).filter(c => /\p{L}/u.test(c)).length;
 if (!letters) throw new ServiceError('validation','Target needs a letter');
 const blanks = Math.max(1, Math.ceil(letters / 2));
 let seen = 0;
 return Array.from(normalized).map(value => {
  if (!/\p{L}/u.test(value)) return {kind:'fixed',value};
  // Evenly distributed deterministic positions, including the final letter.
  const hide = Math.floor((seen + 1) * blanks / letters) > Math.floor(seen * blanks / letters);
  seen++;
  return hide ? {kind:'blank'} : {kind:'fixed',value};
 });
}
export function assembleAnswer(cells: readonly ClozeCell[], letters: readonly string[]): string {
 if (letters.length !== cells.filter(c => c.kind === 'blank').length || letters.some(c => !/^\p{L}$/u.test(c)))
  throw new ServiceError('validation','Fill all missing letters');
 let index = 0;
 return cells.map(c => c.kind === 'fixed' ? c.value : letters[index++]).join('');
}
export function validateClozeAnswer(answer: string, cells: readonly ClozeCell[]): void {
 const chars = Array.from(answer.normalize('NFKC'));
 if (chars.length !== cells.length || chars.some((c,i) => cells[i]?.kind === 'blank' && !/\p{L}/u.test(c)))
  throw new ServiceError('validation','Fill all missing letters');
 if (cells.some((c,i) => c.kind === 'fixed' && c.value.toLowerCase() !== chars[i]?.toLowerCase()))
  throw new ServiceError('validation','Fixed letters must stay unchanged');
}
