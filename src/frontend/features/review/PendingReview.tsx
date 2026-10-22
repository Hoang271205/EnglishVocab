import type { useReviewPage } from './useReviewPage';

export default function PendingReview({
  model,
}: {
  model: ReturnType<typeof useReviewPage>;
}) {
  const { content, working, resumeSession } = model;
  if (!content) return null;
  return (
    <div className="pending-session">
      <div>
        <strong>
          Bạn có một phiên {content.pending.mode === 'learn' ? 'học' : 'ôn'}{' '}
          đang dở
        </strong>

        <p>
          Đã hoàn thành {content.pending.index}/{content.pending.items.length}{' '}
          từ.
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
