import { useEffect, useRef, useState } from 'react';
import type { CollectionId, SessionView } from '../domain/types';
import { backend, initializeBackend } from './backend';

type ReviewFilter = 'all' | CollectionId;

type Overview = Awaited<
  ReturnType<typeof backend.queries.overview>
>;

type ReviewData = {
  filter: ReviewFilter;
  overview: Overview;
  dueIds: string[];
  pending: SessionView | null;
};

type ReviewPageProps = {
  onLearn: () => void;
  onOpenSession: (session: SessionView) => void;
};

const filters: { id: ReviewFilter; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'ielts', label: 'IELTS' },
  { id: 'daily', label: 'Giao tiếp' },
  { id: 'personal', label: 'Từ của tôi' },
];

function errorMessage(cause: unknown): string {
  return cause instanceof Error
    ? cause.message
    : 'Không thực hiện được thao tác.';
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('vi-VN');
}

export default function ReviewPage({
  onLearn,
  onOpenSession,
}: ReviewPageProps) {
  const [filter, setFilter] = useState<ReviewFilter>('all');
  const [batchSize, setBatchSize] = useState<10 | 20>(10);
  const [data, setData] = useState<ReviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const actionLock = useRef(false);

  useEffect(() => {
    let alive = true;
    let requestNumber = 0;

    setData(null);
    setError(null);
    setActionError(null);

    async function loadData() {
      const request = ++requestNumber;

      try {
        await initializeBackend();

        const query =
          filter === 'all'
            ? { due: true }
            : { due: true, collection: filter };

        const [overview, dueRows, pending] = await Promise.all([
          backend.queries.overview(),
          backend.queries.notebook(query),
          backend.study.active(),
        ]);

        if (!alive || request !== requestNumber) {
          return;
        }

        setData({
          filter,
          overview,
          dueIds: dueRows.map((row) => row.entry.id),
          pending,
        });

        setError(null);
      } catch (cause: unknown) {
        if (alive && request === requestNumber) {
          setError(errorMessage(cause));
        }
      }
    }

    function refreshWhenVisible() {
      if (document.visibilityState === 'visible') {
        void loadData();
      }
    }

    void loadData();

    const timer = window.setInterval(() => {
      void loadData();
    }, 30_000);

    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener(
      'visibilitychange',
      refreshWhenVisible,
    );

    return () => {
      alive = false;
      window.clearInterval(timer);

      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener(
        'visibilitychange',
        refreshWhenVisible,
      );
    };
  }, [filter, reloadKey]);

  const content = data?.filter === filter ? data : null;

  async function runAction(action: () => Promise<void>) {
    if (actionLock.current) {
      return;
    }

    actionLock.current = true;
    setWorking(true);
    setActionError(null);

    try {
      await action();
    } catch (cause: unknown) {
      setActionError(errorMessage(cause));
    } finally {
      actionLock.current = false;
      setWorking(false);
    }
  }

  function startReview() {
    const selected = content;

    if (!selected || selected.dueIds.length === 0) {
      return;
    }

    void runAction(async () => {
      const pending = await backend.study.active();

      if (pending) {
        setActionError(
          'Bạn có một phiên đang dở. Hãy tiếp tục phiên đó trước.',
        );
        setReloadKey((value) => value + 1);
        return;
      }

      const session = await backend.study.create(
        'review',
        batchSize,
        selected.dueIds,
      );

      onOpenSession(session);
    });
  }

  function resumeSession() {
    const pending = content?.pending;

    if (!pending) {
      return;
    }

    void runAction(async () => {
      const latest = await backend.study.session(pending.id);

      if (latest.phase === 'complete') {
        setReloadKey((value) => value + 1);
        return;
      }

      const session = latest.paused
        ? await backend.study.transition(
            latest.id,
            latest.version,
            'resume',
          )
        : latest;

      onOpenSession(session);
    });
  }

  return (
    <section aria-labelledby="review-title">
      <p className="eyebrow">ÔN TẬP MỖI NGÀY</p>
      <h1 id="review-title">Ôn tập</h1>

      <div className="collection-picker" aria-label="Lọc bộ từ">
        {filters.map((item) => (
          <button
            key={item.id}
            className={`collection-chip${
              filter === item.id ? ' is-selected' : ''
            }`}
            type="button"
            aria-pressed={filter === item.id}
            disabled={working}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="load-error" role="alert">
          <p>{error}</p>

          <button
            className="secondary-button"
            type="button"
            disabled={working}
            onClick={() => setReloadKey((value) => value + 1)}
          >
            Thử lại
          </button>
        </div>
      )}

      {actionError && (
        <p className="load-error" role="alert">
          {actionError}
        </p>
      )}

      {!content && !error && (
        <p className="topic-message" role="status">
          Đang kiểm tra các từ đến hạn…
        </p>
      )}

      {content && (
        <>
          <div className="review-stats">
            <p>
              Đã học
              <strong>{content.overview.learned}</strong>
            </p>

            <p>
              Thành thạo
              <strong>{content.overview.mastered}</strong>
            </p>
          </div>

          {content.pending && (
            <div className="pending-session">
              <div>
                <strong>
                  Bạn có một phiên{' '}
                  {content.pending.mode === 'learn' ? 'học' : 'ôn'} đang dở
                </strong>

                <p>
                  Đã hoàn thành {content.pending.index}/
                  {content.pending.items.length} từ.
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
          )}

          {content.overview.learned === 0 ? (
            <div className="review-state">
              <div className="empty-illustration" aria-hidden="true">
                🌱
              </div>

              <h2>Bắt đầu với những từ đầu tiên</h2>

              <p>
                Học từ mới để thêm từ vào lịch ôn của bạn.
              </p>

              <button
                className="primary-button"
                type="button"
                disabled={working}
                onClick={onLearn}
              >
                Học từ mới
              </button>
            </div>
          ) : content.dueIds.length === 0 ? (
            <div className="review-state">
              <div className="empty-illustration" aria-hidden="true">
                📖
              </div>

              <h2>
                {content.overview.due === 0
                  ? 'Chưa có từ đến hạn'
                  : 'Bộ từ này chưa có từ đến hạn'}
              </h2>

              <p>Từ đã học và tiến độ của bạn vẫn được lưu.</p>

              {content.overview.due === 0 &&
                content.overview.nextReviewAt !== null && (
                  <p>
                    Lần ôn tiếp theo:{' '}
                    <strong>
                      {formatTime(content.overview.nextReviewAt)}
                    </strong>
                  </p>
                )}

              <button
                className="primary-button"
                type="button"
                disabled={working}
                onClick={onLearn}
              >
                Học thêm từ mới
              </button>
            </div>
          ) : (
            <div className="review-state">
              <p className="due-count">{content.dueIds.length}</p>

              <h2>Từ đang đến hạn ôn</h2>

              <p>
                Chọn số từ cho lượt ôn này. Các từ còn lại sẽ tiếp tục
                nằm trong danh sách đến hạn.
              </p>

              <div className="review-batch">
                <label htmlFor="review-batch-size">
                  Số từ mỗi lượt
                </label>

                <select
                  id="review-batch-size"
                  value={batchSize}
                  disabled={working}
                  onChange={(event) =>
                    setBatchSize(
                      event.target.value === '20' ? 20 : 10,
                    )
                  }
                >
                  <option value="10">Tối đa 10 từ</option>
                  <option value="20">Tối đa 20 từ</option>
                </select>
              </div>

              <button
                className="primary-button"
                type="button"
                disabled={
                  working ||
                  content.pending !== null ||
                  error !== null
                }
                onClick={startReview}
              >
                {working ? 'Đang mở…' : 'Bắt đầu ôn tập'}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}