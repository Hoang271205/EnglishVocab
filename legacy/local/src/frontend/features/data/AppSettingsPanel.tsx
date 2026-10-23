import type { AppSettingsPanelProps } from './types';
import { useAppSettingsPanel } from './useAppSettingsPanel';

export default function AppSettingsPanel(props: AppSettingsPanelProps) {
  const { disabled } = props;
  const {
    loading,
    form,
    save,
    blocked,
    change,
    dailyTarget,
    setDailyTarget,
    operation,
    clearCache,
    notice,
    error,
    setReloadKey,
  } = useAppSettingsPanel(props);
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
