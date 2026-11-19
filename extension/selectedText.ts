import { queryKey } from '../src/dictionary/freeDictionary';

export type SelectionMode = 'dictionary' | 'translation';
export const maxTranslationLength = 3000;

export function selectionModes(text: string) {
  let dictionary = true;
  try {
    queryKey(text);
  } catch {
    dictionary = false;
  }

  const words = text.match(/\p{L}+(?:['’\-]\p{L}+)*/gu)?.length ?? 0;
  const translation = words >= 2;
  if (!dictionary && !translation) return null;

  // Short phrases keep the dictionary as the default. The switch also covers
  // short sentences without punctuation and ambiguous longer expressions.
  const preferred: SelectionMode =
    translation && (!dictionary || words >= 5) ? 'translation' : 'dictionary';
  return { dictionary, translation, preferred };
}
