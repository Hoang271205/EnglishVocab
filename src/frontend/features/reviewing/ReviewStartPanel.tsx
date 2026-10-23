import { useState } from 'react';
import { REVIEW_BATCH_SIZES } from '../../../shared/studyOptions';
import Button from '../../components/ui/Button';
import type { ReviewBatchSize, ReviewCollection } from './review.types';

interface ReviewStartPanelProps {
  defaultBatchSize: ReviewBatchSize;
  disabled: boolean;
  working: boolean;
  onStart: (
    collection: ReviewCollection,
    limit: ReviewBatchSize,
  ) => Promise<void>;
}

const collections: {
  value: ReviewCollection;
  label: string;
}[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'ielts', label: 'IELTS' },
  { value: 'daily', label: 'Giao tiếp' },
  { value: 'personal', label: 'Từ của tôi' },
];

export default function ReviewStartPanel({
  defaultBatchSize,
  disabled,
  working,
  onStart,
}: ReviewStartPanelProps) {
  const [collection, setCollection] = useState<ReviewCollection>('all');

  const [selectedLimit, setSelectedLimit] = useState<ReviewBatchSize | null>(
    null,
  );

  const limit = selectedLimit ?? defaultBatchSize;

  return (
    <section className="online-review-start">
      <h2>Bắt đầu ôn tập</h2>

      <p>Chọn bộ từ cho lượt ôn này.</p>

      <div className="collection-picker">
        {collections.map((item) => (
          <button
            key={item.value}
            className={`collection-chip${
              collection === item.value ? ' is-selected' : ''
            }`}
            type="button"
            disabled={working}
            aria-pressed={collection === item.value}
            onClick={() => setCollection(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="study-answer-actions">
        <label className="review-batch-picker">
          Số từ mỗi lượt
          <select
            value={limit}
            disabled={working}
            onChange={(event) =>
              setSelectedLimit(Number(event.target.value) as ReviewBatchSize)
            }
          >
            {REVIEW_BATCH_SIZES.map((size) => (
              <option key={size} value={size}>
                {size} từ
              </option>
            ))}
          </select>
        </label>

        <Button
          icon="review"
          disabled={disabled}
          loading={working}
          onClick={() => void onStart(collection, limit)}
        >
          {working ? 'Đang mở…' : 'Bắt đầu ôn tập'}
        </Button>
      </div>
    </section>
  );
}
