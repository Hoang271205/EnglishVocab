import type { useReviewPage } from './useReviewPage';

type PendingReviewProps = {
  model: ReturnType<typeof useReviewPage>;
};

export default function PendingReview({
  model,
}: PendingReviewProps) {
  const {
    content,
    working,
    resumeSession,
  } = model;

  const pending = content?.pending;

  if (!pending) return null;

  return (
    <div className="pending-session">
      <div>
        <strong>
          Bạn có một phiên{' '}
          {pending.mode === 'learn' ? 'học' : 'ôn'}{' '}
          đang dở
        </strong>

        <p>
          Đã hoàn thành {pending.index}/
          {pending.items.length} từ.
        </p>
      </div>

      <button
        className="primary-button"
        type="button"
        disabled={working}
        onClick={resumeSession}
      >
        {working ? 'Đang mở…' : 'Tiếp tục'}
      </button>
    </div>
  );
}