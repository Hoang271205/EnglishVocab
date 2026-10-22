import { POLICY, ServiceError } from './types.js';
export function normalizeAnswer(value) {
    return value.normalize('NFKC').replace(/[‘’]/g, "'").trim().replace(/\s+/gu, ' ').toLocaleLowerCase('en-US');
}
export function gradeAnswer(answer, accepted) {
    if (!normalizeAnswer(answer))
        throw new ServiceError('validation', 'Answer is empty');
    return accepted.some(candidate => normalizeAnswer(candidate) === normalizeAnswer(answer));
}
