import { useEffect, useState } from 'react';
import type { LoadExampleSuggestion } from './exampleSuggestion';
import type { LookupSense } from './freeDictionary';
import { findDictionaryTarget } from './readingEntry';

export function useSenseExample(
  word: string,
  sense: LookupSense | undefined,
  load: LoadExampleSuggestion,
) {
  const [resolved, setResolved] = useState<{
    word: string;
    sense: LookupSense;
    sentence: string | null;
  } | null>(null);
  const needsExample = Boolean(sense && !sense.entryId && !sense.example);

  useEffect(() => {
    if (!sense || !needsExample) return;
    const controller = new AbortController();
    const forms = (sense.exampleForms ?? []).slice(0, 30);
    const complete = (sentence: string | null) => {
      if (!controller.signal.aborted) {
        setResolved({ word, sense, sentence });
      }
    };

    void load(
      {
        word,
        partOfSpeech: sense.partOfSpeech,
        definition: sense.definition,
        forms,
      },
      controller.signal,
    )
      .then((text) =>
        complete(text && findDictionaryTarget(text, word, forms) ? text : null),
      )
      .catch(() => complete(null));
    return () => controller.abort();
  }, [word, sense, needsExample, load]);

  const current =
    resolved?.sense === sense && resolved?.word === word ? resolved : null;
  const sentence = current?.sentence;
  const exampleSense: LookupSense | undefined =
    sense && sentence
      ? {
          ...sense,
          example: sentence,
          exampleSource: {
            field: 'example',
            attribution: 'Câu ví dụ do AI gợi ý',
            license: 'Nội dung AI tạo',
            url: null,
            status: 'unverified',
            checkedAt: null,
          },
        }
      : sense;

  return {
    exampleSense,
    pending: needsExample && !current,
    suggested: Boolean(sentence),
  };
}
