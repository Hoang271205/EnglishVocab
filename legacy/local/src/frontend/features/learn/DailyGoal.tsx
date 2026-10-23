import { useEffect, useState } from 'react';
import { backend, initializeBackend } from '../../backend';

type DailyProgress = Awaited<ReturnType<typeof backend.queries.dailyProgress>>;

export default function DailyGoal() {
  const [data, setData] = useState<DailyProgress | null>(null);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let requestNumber = 0;

    async function load() {
      const request = ++requestNumber;

      try {
        await initializeBackend();

        const result = await backend.queries.dailyProgress();

        if (!cancelled && request === requestNumber) {
          setData(result);
          setError(false);
        }
      } catch {
        if (!cancelled && request === requestNumber) {
          setError(true);
        }
      }
    }

    function refresh() {
      if (document.visibilityState === 'visible') {
        void load();
      }
    }

    void load();

    const timer = window.setInterval(refresh, 60_000);

    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [reloadKey]);

  return (
    <aside className="daily-goal" aria-label="Mục tiêu học hôm nay">
      {data && (
        <>
          <p>
            Hôm nay đã học{' '}
            <strong>
              {data.learnedToday}/{data.target}
            </strong>{' '}
            từ mới
          </p>

          <progress
            max={data.target}
            value={Math.min(data.learnedToday, data.target)}
            aria-label="Tiến độ mục tiêu hằng ngày"
          />

          <p className="draft-status">
            {data.remaining > 0
              ? `Còn ${data.remaining} từ để đạt mục tiêu.`
              : 'Đã đạt mục tiêu hôm nay. Bạn vẫn có thể học thêm.'}
          </p>
        </>
      )}

      {!data && !error && <p role="status">Đang tải mục tiêu hôm nay…</p>}

      {error && (
        <div>
          <p role="status">Không tải được mục tiêu hôm nay.</p>
          <button
            className="secondary-button"
            type="button"
            onClick={() => setReloadKey((value) => value + 1)}
          >
            Thử lại
          </button>
        </div>
      )}
    </aside>
  );
}
