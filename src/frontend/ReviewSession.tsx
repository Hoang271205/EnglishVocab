import { useEffect, useRef, useState } from 'react';
import type { Question, SessionView } from '../domain/types';
import { assembleAnswer } from '../domain/cloze';
import { backend } from './backend';
import ClozeInputs from './ClozeInputs';

type ReviewSessionProps = {
  session: SessionView;
  onExit: () => void;
};

type Feedback = Awaited<
  ReturnType<typeof backend.study.feedback>
>;

type DraftState = 'saved' | 'saving' | 'error';

function errorMessage(cause: unknown): string {
  return cause instanceof Error
    ? cause.message
    : 'Không thực hiện được thao tác.';
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('vi-VN');
}

function restoreLetters(
  question: Question,
  draft: string,
): string[] {
  const characters = Array.from(draft.normalize('NFKC'));

  return question.cells.flatMap((cell, index) => {
    if (cell.kind === 'fixed') {
      return [];
    }

    const character = characters[index] ?? '';

    return [
      characters.length === question.cells.length &&
      /^\p{L}$/u.test(character)
        ? character
        : '',
    ];
  });
}

function makeDraft(
  question: Question,
  letters: string[],
): string {
  let index = 0;

  return question.cells
    .map((cell) =>
      cell.kind === 'fixed'
        ? cell.value
        : letters[index++] || '_',
    )
    .join('');
}

export default function ReviewSession({
  session,
  onExit,
}: ReviewSessionProps) {
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
        setLetters(
          restoreLetters(nextQuestion, next.draftAnswer),
        );
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
          latest.items[latest.index]?.attemptId !==
            activeQuestion.attemptId
        ) {
          return;
        }

        current.current = await backend.study.saveDraft(
          latest.id,
          latest.version,
          draft,
        );

        if (
          alive.current &&
          sequence === draftSequence.current
        ) {
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
        answer = assembleAnswer(
          activeQuestion.cells,
          letters,
        );
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

      await backend.study.transition(
        latest.id,
        latest.version,
        'pause',
        draft,
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
      const latest = await backend.study.session(
        current.current.id,
      );

      await showSession(latest);
    });
  }

  async function playAudio(
    options: { slow?: boolean; exampleId?: string } = {},
  ) {
    if (
      !feedback ||
      current.current.phase !== 'feedback'
    ) {
      return;
    }

    const turn = ++audioTurn.current;
    setAudioError(null);

    try {
      await backend.audio.speakEntry(
        feedback.entry.id,
        options,
      );
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

  return (
    <section
      className="session-page"
      aria-labelledby="review-session-title"
    >
      <div className="study-toolbar">
        <button
          className="secondary-button"
          type="button"
          disabled={busy}
          onClick={
            model.phase === 'complete'
              ? onExit
              : pauseSession
          }
        >
          {model.phase === 'complete'
            ? 'Quay lại'
            : 'Tạm dừng'}
        </button>

        <span>
          Đã ôn {completed}/{model.items.length} từ
        </span>
      </div>

      <progress
        className="session-progress"
        max={Math.max(model.items.length, 1)}
        value={completed}
        aria-label="Tiến độ ôn tập"
      />

      <h1
        id="review-session-title"
        className="study-title"
      >
        {model.phase === 'complete'
          ? 'Hoàn thành lượt ôn'
          : 'Ôn tập'}
      </h1>

      {error && (
        <div className="load-error" role="alert">
          <p>{error}</p>

          <button
            className="secondary-button"
            type="button"
            disabled={busy}
            onClick={reloadSession}
          >
            Tải lại phiên từ bản đã lưu
          </button>
        </div>
      )}

      {model.paused ? (
        <div className="study-card">
          <p>Phiên ôn đang tạm dừng.</p>

          <button
            className="primary-button"
            type="button"
            disabled={busy}
            onClick={resumeSession}
          >
            Tiếp tục
          </button>
        </div>
      ) : model.phase === 'complete' ? (
        <div className="study-card">
          <p>
            Bạn đã ôn xong {model.items.length} từ trong lượt này.
          </p>

          <p>
            Quay lại trang Ôn tập để xem các từ còn đến hạn.
          </p>

          <button
            className="primary-button"
            type="button"
            disabled={busy}
            onClick={onExit}
          >
            Về trang Ôn tập
          </button>
        </div>
      ) : model.phase === 'question' &&
        question &&
        !graded ? (
        <form
          className="study-card"
          onSubmit={(event) => {
            event.preventDefault();
            submitReview();
          }}
        >
          <p className="eyebrow">ĐIỀN CHỮ CÒN THIẾU</p>

          <p className="study-meaning">
            {question.meaningVi}
          </p>

          <p className="word-type">
            {question.partOfSpeech}
          </p>

          <p className="review-sentence">
            {question.prefix}
            <ClozeInputs
              key={question.attemptId}
              cells={question.cells}
              values={letters}
              disabled={busy}
              onChange={changeLetters}
            />
            {question.suffix}
          </p>

          <p className="draft-status" role="status">
            {draftState === 'saving'
              ? 'Đang lưu bản nháp…'
              : draftState === 'error'
                ? 'Chưa lưu được bản nháp.'
                : 'Bản nháp đã lưu trên thiết bị.'}
          </p>

          <div className="study-answer-actions">
            <button
              className="primary-button"
              type="submit"
              disabled={busy}
            >
              {busy ? 'Đang chấm…' : 'Kiểm tra'}
            </button>

            <button
              className="secondary-button"
              type="button"
              disabled={busy}
              onClick={() => submitReview(true)}
            >
              Không nhớ
            </button>
          </div>
        </form>
      ) : model.phase === 'feedback' && feedback ? (
        <div className="study-card">
          <p
            className={`study-notice ${
              feedback.event.correct
                ? 'is-success'
                : 'is-hint'
            }`}
            role="status"
          >
            {feedback.event.correct
              ? 'Đúng rồi!'
              : 'Chưa đúng. Xem lại từ trước khi tiếp tục nhé.'}
          </p>

          <h2 className="study-word">
            {feedback.entry.headword}
          </h2>

          <p className="word-type">
            {feedback.entry.partOfSpeech}
          </p>

          <p className="study-meaning">
            {feedback.entry.meaningVi}
          </p>

          <p className="study-ipa">
            {feedback.entry.pronunciation.ipa ??
              'Chưa có phiên âm IPA'}
          </p>

          <p className="cefr-label">
            CEFR: {feedback.entry.cefr.level ?? 'Chưa có'}
            {feedback.entry.cefr.status === 'estimated'
              ? ' · tham khảo'
              : ''}
          </p>

          <div className="review-result">
            <p>
              Level ghi nhớ sau lượt này:{' '}
              <strong>{feedback.event.afterLevel}</strong>
            </p>

            <p>
              Lần ôn tiếp theo:{' '}
              <strong>
                {formatTime(feedback.event.nextReviewAt)}
              </strong>
            </p>
          </div>

          <div className="audio-actions">
            <button
              className="secondary-button"
              type="button"
              disabled={busy}
              onClick={() => void playAudio()}
            >
              Nghe từ · Mỹ
            </button>

            <button
              className="secondary-button"
              type="button"
              disabled={busy}
              onClick={() =>
                void playAudio({ slow: true })
              }
            >
              Nghe chậm
            </button>
          </div>

          {example && (
            <div className="study-example">
              <p>
                {example.prefix}
                <strong>{example.targetSurface}</strong>
                {example.suffix}
              </p>

              <button
                className="secondary-button"
                type="button"
                disabled={busy}
                onClick={() =>
                  void playAudio({
                    exampleId: example.id,
                  })
                }
              >
                Nghe câu ví dụ
              </button>
            </div>
          )}

          {audioError && (
            <p className="audio-message" role="status">
              {audioError} Bạn vẫn có thể tiếp tục ôn.
            </p>
          )}

          <button
            className="primary-button study-next"
            type="button"
            disabled={busy}
            onClick={nextQuestion}
          >
            {busy ? 'Đang chuyển…' : 'Từ tiếp theo'}
          </button>
        </div>
      ) : (
        <p className="topic-message" role="status">
          {busy
            ? 'Đang tải nội dung…'
            : 'Chưa tải được nội dung phiên. Hãy tải lại phiên.'}
        </p>
      )}
    </section>
  );
}