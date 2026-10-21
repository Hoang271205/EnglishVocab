import { useEffect, useRef, useState } from 'react';
import type { Entry, Question, SessionView } from '../domain/types';
import { backend } from './backend';

type LearnSessionProps = {
  session: SessionView;
  onExit: () => void;
};

type Notice = {
  kind: 'success' | 'hint';
  text: string;
};

type DraftState = 'saved' | 'saving' | 'error';

function errorMessage(cause: unknown): string {
  return cause instanceof Error
    ? cause.message
    : 'Không thực hiện được thao tác. Hãy thử lại.';
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('vi-VN');
}

export default function LearnSession({
  session,
  onExit,
}: LearnSessionProps) {
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

  function changeAnswer(value: string) {
    setAnswer(value);
    setNotice(null);
    setDraftState('saving');

    const savedSession = current.current;
    const attemptId =
      savedSession.items[savedSession.index]?.attemptId;

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
          setError(errorMessage(cause));

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
        setAudioError(errorMessage(cause));
      }
    }
  }

  const example = entry?.examples[0];

  return (
    <section className="session-page" aria-labelledby="session-title">
      <div className="study-toolbar">
        <button
          className="secondary-button"
          type="button"
          disabled={busy}
          onClick={
            model.phase === 'complete' ? onExit : pauseSession
          }
        >
          {model.phase === 'complete' ? 'Quay lại' : 'Tạm dừng'}
        </button>

        <span>
          Đã học {model.index}/{model.items.length} từ
        </span>
      </div>

      <progress
        className="session-progress"
        max={Math.max(model.items.length, 1)}
        value={model.index}
        aria-label="Tiến độ phiên học"
      />

      <h1 id="session-title" className="study-title">
        {model.phase === 'complete'
          ? 'Hoàn thành lượt học'
          : 'Học từ mới'}
      </h1>

      {notice && (
        <p
          className={`study-notice is-${notice.kind}`}
          role="status"
        >
          {notice.text}
        </p>
      )}

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
          <p>Phiên học đang tạm dừng.</p>

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
          <p>Bạn đã hoàn thành {model.items.length} từ trong lượt này.</p>

          <button
            className="primary-button"
            type="button"
            disabled={busy}
            onClick={onExit}
          >
            Về danh sách chủ đề
          </button>
        </div>
      ) : model.phase === 'front' && entry ? (
        <div className="study-card">
          <p className="word-type">{entry.partOfSpeech}</p>
          <h2 className="study-word">{entry.headword}</h2>

          <p className="cefr-label">
            {entry.cefr.level ?? 'Chưa có CEFR'}
            {entry.cefr.status === 'estimated' ? ' · tham khảo' : ''}
          </p>

          <p className="study-meaning">{entry.meaningVi}</p>

          <p className="study-ipa">
            {entry.pronunciation.ipa ?? 'Chưa có phiên âm IPA'}
          </p>

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
              onClick={() => void playAudio({ slow: true })}
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
                  void playAudio({ exampleId: example.id })
                }
              >
                Nghe câu ví dụ
              </button>
            </div>
          )}

          {audioError && (
            <p className="audio-message" role="status">
              {audioError} Bạn vẫn có thể tiếp tục học.
            </p>
          )}

          <details className="study-sources">
            <summary>Nguồn dữ liệu</summary>

            {entry.provenance.map((source, index) => (
              <p key={`${source.field}-${index}`}>
                {source.attribution} · {source.license}
                {source.url && (
                  <>
                    {' · '}
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Xem nguồn
                    </a>
                  </>
                )}
              </p>
            ))}
          </details>

          <button
            className="primary-button study-next"
            type="button"
            disabled={busy}
            onClick={goToRecall}
          >
            Next — Viết lại từ
          </button>
        </div>
      ) : model.phase === 'recall' && question ? (
        <form
          className="study-card"
          onSubmit={(event) => {
            event.preventDefault();
            submitAnswer();
          }}
        >
          <p className="eyebrow">NHỚ VÀ VIẾT LẠI</p>

          <p className="study-meaning">
            {question.meaningVi}
          </p>

          <p className="word-type">{question.partOfSpeech}</p>

          <label className="answer-label" htmlFor="learn-answer">
            Viết lại từ hoặc cụm từ vừa học
          </label>

          <input
            key={question.attemptId}
            id="learn-answer"
            className="learn-answer"
            type="text"
            value={answer}
            maxLength={10_000}
            disabled={busy}
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            onChange={(event) => changeAnswer(event.target.value)}
          />

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
              disabled={busy || !answer.trim()}
            >
              {busy ? 'Đang xử lý…' : 'Kiểm tra'}
            </button>

            <button
              className="secondary-button"
              type="button"
              disabled={busy}
              onClick={showFrontAgain}
            >
              Xem lại từ
            </button>
          </div>
        </form>
      ) : (
        <p className="topic-message" role="status">
          {busy ? 'Đang tải từ…' : 'Chưa tải được nội dung phiên.'}
        </p>
      )}
    </section>
  );
}