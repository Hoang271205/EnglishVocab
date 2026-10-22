import ReviewFeedbackCard from './ReviewFeedbackCard';
import ReviewQuestionCard from './ReviewQuestionCard';
import type { SessionView } from '../../../domain/types';
import { useReviewSession } from './useReviewSession';

type ReviewSessionProps = {
  session: SessionView;
  onExit: () => void;
};

export default function ReviewSession({ session, onExit }: ReviewSessionProps) {
  const controller = useReviewSession(session, onExit);
  const {
    model,
    busy,
    error,
    completed,
    feedback,
    question,
    graded,
    pauseSession,
    resumeSession,
    reloadSession,
  } = controller;
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
        <ReviewQuestionCard controller={controller} />
      ) : model.phase === 'feedback' && feedback ? (
        <ReviewFeedbackCard controller={controller} />
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
