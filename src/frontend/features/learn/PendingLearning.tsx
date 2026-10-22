import type { useLearnPage } from './useLearnPage';

export default function PendingLearning({
  model,
}: {
  model: ReturnType<typeof useLearnPage>;
}) {
  const { pendingSession, working, resumePendingSession } = model;
  return (
    <div className="pending-session">
      <div>
        <strong>
          Bạn có một phiên {pendingSession.mode === 'learn' ? 'học' : 'ôn'} đang
          dở
        </strong>

        <p>
          Đã hoàn thành {pendingSession.index}/{pendingSession.items.length} từ.
        </p>
      </div>

      <button
        className="primary-button"
        type="button"
        disabled={working}
        onClick={resumePendingSession}
      >
        {working ? 'Đang mở…' : 'Tiếp tục'}
      </button>
    </div>
  );
}
