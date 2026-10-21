import type { SessionView } from '../../../domain/types';
import { useLearnSession } from './useLearnSession';

type LearnSessionProps = {
  session: SessionView;
  onExit: () => void;
};

export default function LearnSession({ session, onExit }: LearnSessionProps) {
  const {
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
  } = useLearnSession(session, onExit);

  return (
    <section className="session-page" aria-labelledby="session-title">
      <div className="study-toolbar">
        <button
          className="secondary-button"
          type="button"
          disabled={busy}
          onClick={model.phase === 'complete' ? onExit : pauseSession}
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
        {model.phase === 'complete' ? 'Hoàn thành lượt học' : 'Học từ mới'}
      </h1>

      {notice && (
        <p className={`study-notice is-${notice.kind}`} role="status">
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
                onClick={() => void playAudio({ exampleId: example.id })}
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
                    <a href={source.url} target="_blank" rel="noreferrer">
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

          <p className="study-meaning">{question.meaningVi}</p>

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
