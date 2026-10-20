import { ServiceError } from './types';
export function normalizeAnswer(value: string): string {
 return value.normalize('NFKC').replace(/[‘’]/g, "'").trim().replace(/\s+/gu,' ').toLocaleLowerCase('en-US');
}
export function gradeAnswer(answer: string, accepted: readonly string[]): boolean {
 if (!normalizeAnswer(answer)) throw new ServiceError('validation','Answer is empty');
 return accepted.some(candidate => normalizeAnswer(candidate) === normalizeAnswer(answer));
}
