import { errorMessage, formatTime } from '../../../../../../src/frontend/components/format';
import { useEffect, useRef, useState } from 'react';
import type { Entry, Question, SessionView } from '../../../../../../src/domain/types';
import { backend } from '../../backend';

type Notice = {
  kind: 'success' | 'hint';
  text: string;
};

type DraftState = 'saved' | 'saving' | 'error';

export function useLearnSession(session: SessionView, onExit: () => void) {
  const [model, setModel] = useState(session);
  const [entry, setEntry] = useState<Entry | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState(session.draftAnswer);

  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [draftState, setDraftState] = useState<DraftState>('saved');

  const current = useRef(session);
  const actionLock = useRef(false);
  const alive = useRef(true);
  const audioTurn = useRef(0);
  const draftSequence = useRef(0);
  const draftQueue = useRef<Promise<void>>(Promise.resolve());

  function stopAudio() {
    audioTurn.current++;
    backend.audio.stop();
  }

  async function showSession(next: SessionView) {
    current.current = next;

    if (!alive.current) {
      return;
    }

    setModel(next);
    setEntry(null);
    setQuestion(null);
    setAnswer(next.draftAnswer);
    setAudioError(null);
    setDraftState('saved');

    if (next.paused || next.phase === 'complete') {
      return;
    }

    if (next.phase === 'front') {
      const card = await backend.study.front(next.id);

      if (alive.current) {
        setEntry(card);
      }
    } else if (next.phase === 'recall') {
      const nextQuestion = await backend.study.question(next.id);

      if (alive.current) {
        setQuestion(nextQuestion);
      }
    }
  }

  async function runAction(action: () => Promise<void>) {
    if (actionLock.current) {
      return;
    }

    actionLock.current = true;
    setBusy(true);
    setError(null);

    try {
      await draftQueue.current;
      await action();
    } catch (cause: unknown) {
      if (alive.current) {
        setError(
          errorMessage(cause, 'Không thực hiện được thao tác. Hãy thử lại.'),
        );
      }
    } finally {
      actionLock.current = false;

      if (alive.current) {
        setBusy(false);
      }
    }
  }

  useEffect(() => {
    alive.current = true;

    void runAction(async () => {
      const latest = await backend.study.session(session.id);
      await showSession(latest);
    });

    return () => {
      alive.current = false;
      audioTurn.current++;
      backend.audio.stop();
    };
  }, [session.id]);

  function changeAnswer(value: string) {
    setAnswer(value);
    setNotice(null);
    setDraftState('saving');

    const savedSession = current.current;
    const attemptId = savedSession.items[savedSession.index]?.attemptId;

    const sequence = ++draftSequence.current;

    draftQueue.current = draftQueue.current.then(async () => {
      try {
        const latest = current.current;

        if (
          latest.phase !== 'recall' ||
          latest.items[latest.index]?.attemptId !== attemptId
        ) {
          return;
        }

        current.current = await backend.study.saveDraft(
          latest.id,
          latest.version,
          value,
        );

        if (alive.current && sequence === draftSequence.current) {
          setDraftState('saved');
        }
      } catch (cause: unknown) {
        if (alive.current) {
          setError(
            errorMessage(cause, 'Không thực hiện được thao tác. Hãy thử lại.'),
          );

          if (sequence === draftSequence.current) {
            setDraftState('error');
          }
        }
      }
    });
  }

  function goToRecall() {
    stopAudio();
    setNotice(null);

    void runAction(async () => {
      const latest = current.current;

      const next = await backend.study.transition(
        latest.id,
        latest.version,
        'recall',
      );

      await showSession(next);
    });
  }

  function showFrontAgain() {
    stopAudio();
    setNotice(null);

    void runAction(async () => {
      const latest = current.current;

      const next = await backend.study.transition(
        latest.id,
        latest.version,
        'front',
      );

      await showSession(next);
    });
  }

  function submitAnswer() {
    if (!answer.trim() || !question) {
      return;
    }

    void runAction(async () => {
      const latest = current.current;

      const result = await backend.study.submit({
        sessionId: latest.id,
        attemptId: question.attemptId,
        expectedSessionVersion: latest.version,
        answer,
      });

      if (result.kind === 'retry') {
        setNotice({
          kind: 'hint',
          text: 'Chưa đúng. Bạn thử viết lại nhé.',
        });
        return;
      }

      setNotice({
        kind: 'success',
        text:
          `Đã lưu level ${result.progress.level}. ` +
          `Ôn lần đầu: ${formatTime(result.progress.nextReviewAt)}.`,
      });

      const next = await backend.study.session(latest.id);
      await showSession(next);
    });
  }

  function pauseSession() {
    stopAudio();

    void runAction(async () => {
      const latest = current.current;

      await backend.study.transition(
        latest.id,
        latest.version,
        'pause',
        answer,
      );

      onExit();
    });
  }

  function resumeSession() {
    void runAction(async () => {
      const latest = current.current;

      const next = await backend.study.transition(
        latest.id,
        latest.version,
        'resume',
      );

      await showSession(next);
    });
  }

  function reloadSession() {
    stopAudio();

    void runAction(async () => {
      const latest = await backend.study.session(current.current.id);
      await showSession(latest);
    });
  }

  async function playAudio(
    options: { slow?: boolean; exampleId?: string } = {},
  ) {
    if (!entry || current.current.phase !== 'front') {
      return;
    }

    const turn = ++audioTurn.current;
    setAudioError(null);

    try {
      await backend.audio.speakEntry(entry.id, options);
    } catch (cause: unknown) {
      if (alive.current && turn === audioTurn.current) {
        setAudioError(
          errorMessage(cause, 'Không thực hiện được thao tác. Hãy thử lại.'),
        );
      }
    }
  }

  const example = entry?.examples[0];

  return {
    model,
    busy,
    notice,
    error,
    entry,
    question,
    answer,
    audioError,
    draftState,
    example,
    reloadSession,
    pauseSession,
    resumeSession,
    playAudio,
    goToRecall,
    submitAnswer,
    changeAnswer,
    showFrontAgain,
  };
}
