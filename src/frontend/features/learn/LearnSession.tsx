import LearnRecallCard from './LearnRecallCard';
import LearnFrontCard from './LearnFrontCard';
import type { SessionView } from '../../../domain/types';
import { useLearnSession } from './useLearnSession';

type LearnSessionProps = {
  session: SessionView;
  onExit: () => void;
};

export default function LearnSession({ session, onExit }: LearnSessionProps) {
  const controller = useLearnSession(session, onExit);
  const {
    model,
    busy,
    notice,
    error,
    entry,
    question,
    reloadSession,
    pauseSession,
    resumeSession,
  } = controller;
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
        <LearnFrontCard controller={controller} />
      ) : model.phase === 'recall' && question ? (
        <LearnRecallCard controller={controller} />
      ) : (
        <p className="topic-message" role="status">
          {busy ? 'Đang tải từ…' : 'Chưa tải được nội dung phiên.'}
        </p>
      )}
    </section>
  );
}
