// Drafts are local recovery data; the server remains authoritative for grading.
const prefix = 'englishvocab:study-draft:';
const lifetime = 7 * 24 * 60 * 60 * 1000;
export interface DraftIdentity {
  ownerId: string;
  sessionId: string;
  attemptId: string;
  version: number;
  phase: string;
}
function key(identity: DraftIdentity) {
  return prefix + JSON.stringify([identity.ownerId, identity.sessionId]);
}
export function saveStudyDraft(
  identity: DraftIdentity,
  answer: string,
): boolean {
  try {
    localStorage.setItem(
      key(identity),
      JSON.stringify({ ...identity, answer, savedAt: Date.now() }),
    );
    return true;
  } catch {
    return false;
  }
}
export function clearStudyDraft(identity: DraftIdentity) {
  try {
    localStorage.removeItem(key(identity));
  } catch {
    /* Storage can be disabled. */
  }
}
export function restoreStudyDraft(identity: DraftIdentity): string | null {
  try {
    const raw = localStorage.getItem(key(identity));
    if (!raw) return null;
    const stored = JSON.parse(raw);
    if (
      stored.ownerId === identity.ownerId &&
      stored.sessionId === identity.sessionId &&
      stored.attemptId === identity.attemptId &&
      stored.version === identity.version &&
      stored.phase === identity.phase &&
      typeof stored.answer === 'string' &&
      typeof stored.savedAt === 'number' &&
      stored.savedAt <= Date.now() &&
      Date.now() - stored.savedAt < lifetime
    ) {
      return stored.answer;
    }
    clearStudyDraft(identity);
  } catch {
    /* Invalid or unavailable storage must not prevent studying. */
  }
  return null;
}
