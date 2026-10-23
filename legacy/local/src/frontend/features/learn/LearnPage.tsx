import PendingLearning from './PendingLearning';
import LearnLibraryPicker from './LearnLibraryPicker';
import TopicList from './TopicList';
import DailyGoal from './DailyGoal';
import type { LearnPageProps } from './types';
import { useLearnPage } from './useLearnPage';

export default function LearnPage(props: LearnPageProps) {
  const model = useLearnPage(props);
  const {
    groups,
    error,
    setRetryKey,
    pendingSession,
    working,
    actionError,
    allTopics,
    populatedCount,
    search,
    setSearch,
    setSelectedTopicId,
    visibleTopics,
  } = model;
  return (
    <section className="learn-page" aria-labelledby="learn-title">
      <p className="eyebrow">MỖI NGÀY MỘT CHÚT</p>
      <h1 id="learn-title">Học từ mới</h1>
      <DailyGoal />

      <LearnLibraryPicker model={model} />
      {!groups && !error && (
        <p className="topic-message" role="status">
          Đang tải thư viện từ vựng…
        </p>
      )}

      {error && (
        <div className="load-error" role="alert">
          <p>Không tải được thư viện.</p>
          <p className="error-detail">{error}</p>

          <button
            className="primary-button"
            type="button"
            onClick={() => setRetryKey((value) => value + 1)}
          >
            Thử lại
          </button>
        </div>
      )}

      {groups && (
        <>
          {pendingSession && <PendingLearning model={model} />}

          {actionError && (
            <div className="load-error" role="alert">
              <p className="error-detail">{actionError}</p>

              <button
                className="secondary-button"
                type="button"
                disabled={working}
                onClick={() => setRetryKey((value) => value + 1)}
              >
                Tải lại danh sách
              </button>
            </div>
          )}

          <p className="topic-message">
            {allTopics.length} chủ đề · {populatedCount} chủ đề đã có nội dung
          </p>

          <label className="search-label" htmlFor="topic-search">
            Tìm chủ đề
          </label>

          <input
            id="topic-search"
            className="topic-search"
            type="search"
            placeholder="Nhập tên tiếng Anh hoặc tiếng Việt…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setSelectedTopicId(null);
            }}
          />

          {visibleTopics.length === 0 ? (
            <p className="topic-message" role="status">
              Không tìm thấy chủ đề phù hợp.
            </p>
          ) : (
            <TopicList model={model} />
          )}
        </>
      )}
    </section>
  );
}
