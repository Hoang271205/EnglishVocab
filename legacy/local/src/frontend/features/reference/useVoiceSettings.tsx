import { useEffect, useRef, useState } from 'react';
import type { Entry } from '../../../../../../src/domain/types';
import { backend, initializeBackend } from '../../backend';

type Voice = Awaited<ReturnType<typeof backend.audio.voices>>[number];

type PlaybackOptions = {
  slow?: boolean;
  exampleId?: string;
};

function errorMessage(cause: unknown): string {
  return cause instanceof Error
    ? cause.message
    : 'Không thực hiện được thao tác.';
}

export function useVoiceSettings() {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [voiceURI, setVoiceURI] = useState('');
  const [sample, setSample] = useState<Entry | null>(null);

  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const mounted = useRef(true);
  const lock = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let voiceRequest = 0;

    mounted.current = true;
    setLoading(true);
    setError(null);

    async function refreshVoices() {
      const request = ++voiceRequest;

      try {
        const result = await backend.audio.voices();

        if (!cancelled && request === voiceRequest) {
          setVoices(result);
        }
      } catch (cause: unknown) {
        if (!cancelled && request === voiceRequest) {
          setError(errorMessage(cause));
        }
      }
    }

    async function load() {
      try {
        await initializeBackend();

        const [settings, rows] = await Promise.all([
          backend.settings.get(),
          backend.queries.notebook(),
        ]);

        if (cancelled) return;

        const sampleRow =
          rows.find((row) => row.entry.examples.length > 0) ?? rows[0];

        setVoiceURI(settings.voiceURI ?? '');
        setSample(sampleRow?.entry ?? null);

        await refreshVoices();
      } catch (cause: unknown) {
        if (!cancelled) {
          setError(errorMessage(cause));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    const synth = window.speechSynthesis;

    function handleVoicesChanged() {
      void refreshVoices();
    }

    synth?.addEventListener('voiceschanged', handleVoicesChanged);

    void load();

    return () => {
      cancelled = true;
      mounted.current = false;
      voiceRequest++;

      synth?.removeEventListener('voiceschanged', handleVoicesChanged);

      backend.audio.stop();
    };
  }, [reloadKey]);

  async function run(action: () => Promise<void>) {
    if (lock.current) return;

    lock.current = true;
    setWorking(true);
    setError(null);
    setNotice(null);

    try {
      await action();
    } catch (cause: unknown) {
      if (mounted.current) {
        setError(errorMessage(cause));
      }
    } finally {
      lock.current = false;

      if (mounted.current) {
        setWorking(false);
      }
    }
  }

  async function saveVoice(id: string) {
    await run(async () => {
      backend.audio.stop();

      if (id) {
        await backend.audio.selectVoice(id);
      } else {
        await backend.settings.update({
          voiceURI: null,
        });
      }

      if (mounted.current) {
        setVoiceURI(id);
        setNotice('Đã lưu lựa chọn giọng đọc.');
      }
    });
  }

  async function play(options: PlaybackOptions = {}) {
    if (!sample) return;

    await run(async () => {
      await backend.audio.speakEntry(sample.id, options);

      if (mounted.current) {
        setNotice('Đã gửi yêu cầu đọc.');
      }
    });
  }

  return {
    voices,
    voiceURI,
    sample,
    example: sample?.examples[0],
    loading,
    working,
    error,
    notice,
    saveVoice,
    play,
    stop: () => backend.audio.stop(),
    reload: () => setReloadKey((value) => value + 1),
  };
}
