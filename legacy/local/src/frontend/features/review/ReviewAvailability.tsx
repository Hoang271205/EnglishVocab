import { formatTime } from '../../../../../../src/frontend/components/format';
import type { ReviewPageProps } from './types';
import type { useReviewPage } from './useReviewPage';

export default function ReviewAvailability({
  model,
  onLearn,
}: {
  model: ReturnType<typeof useReviewPage>;
  onLearn: ReviewPageProps['onLearn'];
}) {
  const { content, working, batchSize, setBatchSize, error, startReview } =
    model;
  if (!content) return null;
  return (
    <>
      {content.overview.learned === 0 ? (
        <div className="review-state">
          <div className="empty-illustration" aria-hidden="true">
            🌱
          </div>

          <h2>Bắt đầu với những từ đầu tiên</h2>

          <p>Học từ mới để thêm từ vào lịch ôn của bạn.</p>

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
                <strong>{formatTime(content.overview.nextReviewAt)}</strong>
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
            Chọn số từ cho lượt ôn này. Các từ còn lại sẽ tiếp tục nằm trong
            danh sách đến hạn.
          </p>

          <div className="review-batch">
            <label htmlFor="review-batch-size">Số từ mỗi lượt</label>

            <select
              id="review-batch-size"
              value={batchSize}
              disabled={working}
              onChange={(event) =>
                setBatchSize(event.target.value === '20' ? 20 : 10)
              }
            >
              <option value="10">Tối đa 10 từ</option>
              <option value="20">Tối đa 20 từ</option>
            </select>
          </div>

          <button
            className="primary-button"
            type="button"
            disabled={working || content.pending !== null || error !== null}
            onClick={startReview}
          >
            {working ? 'Đang mở…' : 'Bắt đầu ôn tập'}
          </button>
        </div>
      )}
    </>
  );
}
