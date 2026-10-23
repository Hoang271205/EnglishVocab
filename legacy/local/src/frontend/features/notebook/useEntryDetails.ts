import { useEffect, useRef, useState } from 'react';
import { backend } from '../../backend';
import type { EntryDetailsData, EntryDetailsProps } from './types';

export function useEntryDetails({ entryId, onOpenSession }: EntryDetailsProps) {
  const [data, setData] = useState<EntryDetailsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [editing, setEditing] = useState(false);
  const [working, setWorking] = useState(false);
  const actionLock = useRef(false);
  const audioTurn = useRef(0);
  const alive = useRef(true);
  useEffect(() => {
    let cancelled = false;
    alive.current = true;
    setData(null);
    setError(null);
    setAudioError(null);
    async function loadDetails() {
      try {
        const result = await backend.queries.details(entryId);
        if (!cancelled) {
          setData(result);
        }
      } catch (cause: unknown) {
        if (!cancelled) {
          setError(
            cause instanceof Error
              ? cause.message
              : 'Không tải được chi tiết từ.',
          );
        }
      }
    }
    void loadDetails();
    return () => {
      cancelled = true;
      alive.current = false;
      audioTurn.current++;
      backend.audio.stop();
    };
  }, [entryId, reloadKey]);
  async function playAudio(
    options: {
      slow?: boolean;
      exampleId?: string;
    } = {},
  ) {
    if (!data) {
      return;
    }
    const turn = ++audioTurn.current;
    setAudioError(null);
    try {
      await backend.audio.speakEntry(data.entry.id, options);
    } catch (cause: unknown) {
      if (alive.current && turn === audioTurn.current) {
        setAudioError(
          cause instanceof Error ? cause.message : 'Không phát được giọng đọc.',
        );
      }
    }
  }
  async function startLearning() {
    if (!data || actionLock.current) return;
    actionLock.current = true;
    setWorking(true);
    setError(null);
    audioTurn.current++;
    backend.audio.stop();
    try {
      const active = await backend.study.active();
      if (active) {
        const next = active.paused
          ? await backend.study.transition(active.id, active.version, 'resume')
          : active;
        onOpenSession(next);
        return;
      }
      const latest = await backend.queries.details(entryId);
      if (latest.progress || latest.entry.contentStatus !== 'ready') {
        throw new Error(
          'Từ chưa sẵn sàng hoặc đã được học. Hãy mở lại chi tiết.',
        );
      }
      const settings = await backend.settings.get();
      onOpenSession(
        await backend.study.create('learn', settings.learnBatchSize, [entryId]),
      );
    } catch (cause: unknown) {
      setError(
        cause instanceof Error ? cause.message : 'Không mở được phiên học.',
      );
    } finally {
      actionLock.current = false;
      setWorking(false);
    }
  }
  return {
    editing,
    data,
    setEditing,
    error,
    setReloadKey,
    working,
    audioTurn,
    startLearning,
    playAudio,
    audioError,
  };
}
