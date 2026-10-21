import type { SessionView } from '../../../domain/types';
import { useReviewSession } from './useReviewSession';
import { formatTime } from '../../components/format';
import ClozeInputs from './ClozeInputs';

type ReviewSessionProps = {
  session: SessionView;
  onExit: () => void;
};

export default function ReviewSession({ session, onExit }: ReviewSessionProps) {
  const {
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
  } = useReviewSession(session, onExit);

  return (
    <section className="session-page" aria-labelledby="review-session-title">
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
          Đã ôn {completed}/{model.items.length} từ
        </span>
      </div>

      <progress
        className="session-progress"
        max={Math.max(model.items.length, 1)}
        value={completed}
        aria-label="Tiến độ ôn tập"
      />

      <h1 id="review-session-title" className="study-title">
        {model.phase === 'complete' ? 'Hoàn thành lượt ôn' : 'Ôn tập'}
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
          <p>Bạn đã ôn xong {model.items.length} từ trong lượt này.</p>

          <p>Quay lại trang Ôn tập để xem các từ còn đến hạn.</p>

          <button
            className="primary-button"
            type="button"
            disabled={busy}
            onClick={onExit}
          >
            Về trang Ôn tập
          </button>
        </div>
      ) : model.phase === 'question' && question && !graded ? (
        <form
          className="study-card"
          onSubmit={(event) => {
            event.preventDefault();
            submitReview();
          }}
        >
          <p className="eyebrow">ĐIỀN CHỮ CÒN THIẾU</p>

          <p className="study-meaning">{question.meaningVi}</p>

          <p className="word-type">{question.partOfSpeech}</p>

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
            <button className="primary-button" type="submit" disabled={busy}>
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
              feedback.event.correct ? 'is-success' : 'is-hint'
            }`}
            role="status"
          >
            {feedback.event.correct
              ? 'Đúng rồi!'
              : 'Chưa đúng. Xem lại từ trước khi tiếp tục nhé.'}
          </p>

          <h2 className="study-word">{feedback.entry.headword}</h2>

          <p className="word-type">{feedback.entry.partOfSpeech}</p>

          <p className="study-meaning">{feedback.entry.meaningVi}</p>

          <p className="study-ipa">
            {feedback.entry.pronunciation.ipa ?? 'Chưa có phiên âm IPA'}
          </p>

          <p className="cefr-label">
            CEFR: {feedback.entry.cefr.level ?? 'Chưa có'}
            {feedback.entry.cefr.status === 'estimated' ? ' · tham khảo' : ''}
          </p>

          <div className="review-result">
            <p>
              Level ghi nhớ sau lượt này:{' '}
              <strong>{feedback.event.afterLevel}</strong>
            </p>

            <p>
              Lần ôn tiếp theo:{' '}
              <strong>{formatTime(feedback.event.nextReviewAt)}</strong>
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
