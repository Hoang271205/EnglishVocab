import PendingReview from './PendingReview';
import ReviewAvailability from './ReviewAvailability';
import LevelDistribution from './LevelDistribution';
import type { ReviewPageProps } from './types';
import { filters } from './constants';
import { useReviewPage } from './useReviewPage';

export default function ReviewPage(props: ReviewPageProps) {
  const { onLearn } = props;
  const model = useReviewPage(props);
  const {
    filter,
    working,
    setFilter,
    error,
    setReloadKey,
    actionError,
    content,
  } = model;
  return (
    <section aria-labelledby="review-title">
      <p className="eyebrow">ÔN TẬP MỖI NGÀY</p>
      <h1 id="review-title">Ôn tập</h1>

      <div className="collection-picker" aria-label="Lọc bộ từ">
        {filters.map((item) => (
          <button
            key={item.id}
            className={`collection-chip${filter === item.id ? ' is-selected' : ''}`}
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

          {content.pending && <PendingReview model={model} />}

          <ReviewAvailability model={model} onLearn={onLearn} />
          <LevelDistribution counts={content.levelCounts} />
        </>
      )}
    </section>
  );
}
