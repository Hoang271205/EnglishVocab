import { makeDraft, restoreLetters } from './draft';
import { errorMessage } from '../../components/format';
import { useEffect, useRef, useState } from 'react';
import type { Question, SessionView } from '../../../domain/types';
import { assembleAnswer } from '../../../domain/cloze';
import { backend } from '../../backend';

type Feedback = Awaited<ReturnType<typeof backend.study.feedback>>;

type DraftState = 'saved' | 'saving' | 'error';

export function useReviewSession(session: SessionView, onExit: () => void) {
  const [model, setModel] = useState(session);
  const [question, setQuestion] = useState<Question | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [letters, setLetters] = useState<string[]>([]);

  const [busy, setBusy] = useState(true);
  const [graded, setGraded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
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
    setQuestion(null);
    setFeedback(null);
    setLetters([]);
    setAudioError(null);
    setDraftState('saved');
    setGraded(next.phase === 'feedback');

    if (next.paused || next.phase === 'complete') {
      return;
    }

    if (next.phase === 'question') {
      const nextQuestion = await backend.study.question(next.id);

      if (alive.current) {
        setLetters(restoreLetters(nextQuestion, next.draftAnswer));
        setQuestion(nextQuestion);
      }
    } else if (next.phase === 'feedback') {
      const result = await backend.study.feedback(next.id);

      if (alive.current) {
        setFeedback(result);
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
        setError(errorMessage(cause));
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

  function changeLetters(nextLetters: string[]) {
    const activeQuestion = question;

    if (!activeQuestion || graded) {
      return;
    }

    setLetters(nextLetters);
    setDraftState('saving');

    const sequence = ++draftSequence.current;
    const draft = makeDraft(activeQuestion, nextLetters);

    draftQueue.current = draftQueue.current.then(async () => {
      try {
        const latest = current.current;

        if (
          latest.phase !== 'question' ||
          latest.paused ||
          latest.items[latest.index]?.attemptId !== activeQuestion.attemptId
        ) {
          return;
        }

        current.current = await backend.study.saveDraft(
          latest.id,
          latest.version,
          draft,
        );

        if (alive.current && sequence === draftSequence.current) {
          setDraftState('saved');
        }
      } catch (cause: unknown) {
        if (alive.current) {
          setError(errorMessage(cause));

          if (sequence === draftSequence.current) {
            setDraftState('error');
          }
        }
      }
    });
  }

  function submitReview(forgotten = false) {
    const activeQuestion = question;

    if (!activeQuestion || busy || graded) {
      return;
    }

    let answer = '';

    if (!forgotten) {
      try {
        answer = assembleAnswer(activeQuestion.cells, letters);
      } catch {
        setError('Bạn cần điền đủ các chữ còn thiếu.');
        return;
      }
    }

    stopAudio();

    void runAction(async () => {
      const latest = current.current;

      const result = await backend.study.submit({
        sessionId: latest.id,
        attemptId: activeQuestion.attemptId,
        expectedSessionVersion: latest.version,
        answer,
        forgotten,
      });

      if (result.kind !== 'committed') {
        throw new Error('Chưa ghi nhận được kết quả ôn.');
      }

      setGraded(true);
      setQuestion(null);

      const next = await backend.study.session(latest.id);
      await showSession(next);
    });
  }

  function nextQuestion() {
    stopAudio();

    void runAction(async () => {
      const latest = current.current;

      const next = await backend.study.transition(
        latest.id,
        latest.version,
        'next',
      );

      await showSession(next);
    });
  }

  function pauseSession() {
    stopAudio();

    void runAction(async () => {
      const latest = current.current;

      const draft = question
        ? makeDraft(question, letters)
        : latest.draftAnswer;

      await backend.study.transition(latest.id, latest.version, 'pause', draft);

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
    if (!feedback || current.current.phase !== 'feedback') {
      return;
    }

    const turn = ++audioTurn.current;
    setAudioError(null);

    try {
      await backend.audio.speakEntry(feedback.entry.id, options);
    } catch (cause: unknown) {
      if (alive.current && turn === audioTurn.current) {
        setAudioError(errorMessage(cause));
      }
    }
  }

  const completed = Math.min(
    model.items.length,
    model.index + (model.phase === 'feedback' ? 1 : 0),
  );

  const example = feedback?.entry.examples[0];

  return {
    model,
    busy,
    error,
    completed,
    feedback,
    question,
    graded,
    letters,
    draftState,
    example,
    audioError,
    pauseSession,
    resumeSession,
    reloadSession,
    submitReview,
    changeLetters,
    nextQuestion,
    playAudio,
  };
}
