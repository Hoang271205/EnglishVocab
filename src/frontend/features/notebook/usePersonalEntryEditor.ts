import { useRef, useState } from 'react';
import type { CefrLevel } from '../../../domain/types';
import { backend } from '../../backend';
import type { PersonalEntryEditorProps } from './types';

export function usePersonalEntryEditor({
  initial,
  onSaved,
}: PersonalEntryEditorProps) {
  const old = initial?.entry;
  const example = old?.examples[0];
  const newId = useRef(crypto.randomUUID());
  const lock = useRef(false);
  const [headword, setHeadword] = useState(old?.headword ?? '');
  const [partOfSpeech, setPartOfSpeech] = useState(old?.partOfSpeech ?? '');
  const [meaningVi, setMeaningVi] = useState(old?.meaningVi ?? '');
  const [ipa, setIpa] = useState(old?.pronunciation.ipa ?? '');
  const [cefr, setCefr] = useState<CefrLevel | ''>(old?.cefr.level ?? '');
  const [sentence, setSentence] = useState(
    example ? example.prefix + example.targetSurface + example.suffix : '',
  );
  const [target, setTarget] = useState(example?.targetSurface ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [newSense, setNewSense] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function save(ready: boolean) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await backend.personal.saveManual({
        ...(old ? { entryId: old.id, revision: old.revision } : {}),
        newId: newId.current,
        headword,
        partOfSpeech,
        meaningVi,
        ipa,
        cefr: cefr || null,
        exampleSentence: sentence,
        targetSurface: target,
        note,
        ready,
        newSense,
      });
      onSaved(result.entry.id, result.copied);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Không lưu được từ.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return {
    old,
    save,
    busy,
    headword,
    setHeadword,
    partOfSpeech,
    setPartOfSpeech,
    meaningVi,
    setMeaningVi,
    ipa,
    setIpa,
    cefr,
    setCefr,
    sentence,
    setSentence,
    target,
    setTarget,
    note,
    setNote,
    newSense,
    setNewSense,
    error,
  };
}
