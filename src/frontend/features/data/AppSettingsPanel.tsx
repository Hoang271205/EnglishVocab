import { useEffect, useRef, useState } from 'react';
import { backend, initializeBackend } from '../../backend';

type Settings = Awaited<ReturnType<typeof backend.settings.get>>;

type FormValues = Pick<
  Settings,
  'learnBatchSize' | 'reviewBatchSize' | 'onlineLookupEnabled'
>;

type AppSettingsPanelProps = {
  disabled: boolean;
};

type Operation = 'save' | 'clear-cache';

export default function AppSettingsPanel({ disabled }: AppSettingsPanelProps) {
  const [form, setForm] = useState<FormValues | null>(null);
  const [dailyTarget, setDailyTarget] = useState('');
  const [loading, setLoading] = useState(true);
  const [operation, setOperation] = useState<Operation | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const lock = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    let cancelled = false;

    mounted.current = true;
    setLoading(true);
    setError(null);

    async function load() {
      try {
        await initializeBackend();

        const settings = await backend.settings.get();

        if (cancelled) return;

        setForm({
          learnBatchSize: settings.learnBatchSize,
          reviewBatchSize: settings.reviewBatchSize,
          onlineLookupEnabled: settings.onlineLookupEnabled,
        });

        setDailyTarget(String(settings.dailyNewWordTarget));
      } catch (cause: unknown) {
        if (!cancelled) {
          setError(
            cause instanceof Error ? cause.message : 'Không tải được cài đặt.',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
      mounted.current = false;
    };
  }, [reloadKey]);

  function change(patch: Partial<FormValues>) {
    setForm((current) => (current ? { ...current, ...patch } : current));
  }

  async function run(nextOperation: Operation, action: () => Promise<void>) {
    if (lock.current || disabled || loading) return;

    lock.current = true;
    setOperation(nextOperation);
    setError(null);
    setNotice(null);

    try {
      await action();
    } catch (cause: unknown) {
      if (mounted.current) {
        setError(
          cause instanceof Error
            ? cause.message
            : 'Không thực hiện được thao tác.',
        );
      }
    } finally {
      lock.current = false;

      if (mounted.current) setOperation(null);
    }
  }

  async function save() {
    if (!form) return;

    await run('save', async () => {
      const target = Number(dailyTarget);

      if (!Number.isInteger(target) || target < 1 || target > 1000) {
        throw new Error('Mục tiêu phải là số nguyên từ 1 đến 1.000.');
      }

      const saved = await backend.settings.update({
        learnBatchSize: form.learnBatchSize,
        reviewBatchSize: form.reviewBatchSize,
        dailyNewWordTarget: target,
        onlineLookupEnabled: form.onlineLookupEnabled,
      });

      if (!mounted.current) return;

      setForm({
        learnBatchSize: saved.learnBatchSize,
        reviewBatchSize: saved.reviewBatchSize,
        onlineLookupEnabled: saved.onlineLookupEnabled,
      });

      setDailyTarget(String(saved.dailyNewWordTarget));
      setNotice('Đã lưu cài đặt.');
    });
  }

  async function clearCache() {
    await run('clear-cache', async () => {
      await backend.dictionary.clearCache();

      if (mounted.current) {
        setNotice(
          'Đã xóa cache tra cứu của web. ' +
            'Từ đã lưu và tiến độ vẫn được giữ nguyên.',
        );
      }
    });
  }

  const blocked = disabled || loading || operation !== null;

  return (
    <section className="entry-details" aria-labelledby="app-settings-title">
      <h2 id="app-settings-title">Cài đặt học và tra từ</h2>

      {loading && <p role="status">Đang tải cài đặt…</p>}

      {form && (
        <form
          className="settings-form"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <fieldset disabled={blocked}>
            <div className="settings-options">
              <label>
                Số từ mặc định mỗi lượt học
                <select
                  value={form.learnBatchSize}
                  onChange={(event) =>
                    change({
                      learnBatchSize: Number(event.target.value) as 5 | 10,
                    })
                  }
                >
                  <option value={5}>5 từ</option>
                  <option value={10}>10 từ</option>
                </select>
              </label>

              <label>
                Số từ mặc định mỗi lượt ôn
                <select
                  value={form.reviewBatchSize}
                  onChange={(event) =>
                    change({
                      reviewBatchSize: Number(event.target.value) as 10 | 20,
                    })
                  }
                >
                  <option value={10}>10 từ</option>
                  <option value={20}>20 từ</option>
                </select>
              </label>

              <label>
                Mục tiêu từ mới mỗi ngày
                <input
                  type="number"
                  min={1}
                  max={1000}
                  step={1}
                  required
                  value={dailyTarget}
                  onChange={(event) => setDailyTarget(event.target.value)}
                />
              </label>
            </div>

            <label className="settings-online">
              <input
                type="checkbox"
                checked={form.onlineLookupEnabled}
                onChange={(event) =>
                  change({
                    onlineLookupEnabled: event.target.checked,
                  })
                }
              />
              Cho phép tra từ trực tuyến trong web
            </label>

            <p className="draft-status">
              Khi tắt, web vẫn tra được từ trong thư viện và kết quả đã lưu
              trong cache.
            </p>

            <button className="primary-button" type="submit">
              {operation === 'save' ? 'Đang lưu…' : 'Lưu cài đặt'}
            </button>
          </fieldset>
        </form>
      )}

      <hr />

      <h3>Bộ nhớ tra cứu của web</h3>

      <p className="topic-message">
        Cache chứa kết quả tra từ có thể tải lại. Popup Chrome có bộ nhớ tra cứu
        riêng.
      </p>

      <button
        className="secondary-button"
        type="button"
        disabled={blocked}
        onClick={() => void clearCache()}
      >
        {operation === 'clear-cache'
          ? 'Đang xóa…'
          : 'Xóa cache tra cứu của web'}
      </button>

      {notice && (
        <p className="study-notice is-success" role="status">
          {notice}
        </p>
      )}

      {error && (
        <div className="load-error" role="alert">
          <p>{error}</p>

          {!form && (
            <button
              className="secondary-button"
              type="button"
              disabled={blocked}
              onClick={() => setReloadKey((value) => value + 1)}
            >
              Thử tải lại
            </button>
          )}
        </div>
      )}
    </section>
  );
}
