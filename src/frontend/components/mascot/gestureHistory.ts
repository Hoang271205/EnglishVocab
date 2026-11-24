// A bounded list per browser tab prevents replay on session reload and Back/Forward.
const storageKey = 'englishvocab:mascot-gestures:v1';
const played = new Set<string>();

export function claimGesture(id: string): boolean {
  if (played.has(id)) return false;
  try {
    const value: unknown = JSON.parse(
      sessionStorage.getItem(storageKey) ?? '[]',
    );
    const history = Array.isArray(value)
      ? value
          .filter((item): item is string => typeof item === 'string')
          .slice(-100)
      : [];
    if (history.includes(id)) {
      played.add(id);
      return false;
    }
    sessionStorage.setItem(
      storageKey,
      JSON.stringify([...history, id].slice(-100)),
    );
  } catch {
    /* A blocked storage API must not block learning. */
  }
  if (played.size >= 100) played.delete(played.values().next().value!);
  played.add(id);
  return true;
}
