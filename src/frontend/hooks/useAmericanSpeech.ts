import { duckMusic } from '../audio/experience';
import { useEffect, useRef, useState } from 'react';
import { AmericanSpeech } from '../../audio/controller';
import type { VoiceOption } from '../../audio/controller';
import { getErrorMessage } from '../api/client';

export function useAmericanSpeech(preferredVoiceURI: string | null) {
  const engine = useRef<AmericanSpeech | null>(null);
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!('speechSynthesis' in window)) return;

    const speech = new AmericanSpeech(window.speechSynthesis);

    engine.current = speech;

    function updateVoices() {
      setVoices(speech.voices());
    }

    updateVoices();
    const unsubscribe = speech.subscribe(updateVoices);

    return () => {
      unsubscribe();
      speech.stop();
      engine.current = null;
    };
  }, []);

  function speak(text: string, slow = false) {
    const speech = engine.current;

    if (!speech) {
      setError('Trình duyệt chưa hỗ trợ giọng đọc.');
      return;
    }

    try {
      const available = speech.voices();

      speech.select(
        available.some((voice) => voice.id === preferredVoiceURI)
          ? preferredVoiceURI
          : null,
      );

      speech.speak(text, slow);
      duckMusic(
        Math.min(20000, Math.max(2200, (text.length / (slow ? 8 : 12)) * 1000)),
      );
      setError(null);
    } catch (cause) {
      setError(getErrorMessage(cause));
    }
  }

  return {
    voices,
    error,
    speak,
  };
}
