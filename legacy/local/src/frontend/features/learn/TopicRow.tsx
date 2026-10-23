import type { useLearnPage } from './useLearnPage';
import type { TopicSummary } from './types';

export default function TopicRow({
  model,
  topic,
  hasContent,
  completed,
}: {
  model: ReturnType<typeof useLearnPage>;
  topic: TopicSummary;
  hasContent: boolean;
  completed: boolean;
}) {
  const {
    selectedTopicId,
    working,
    chooseTopic,
    batchSize,
    pendingSession,
    startSelectedTopic,
    setSelectedTopicId,
  } = model;
  return (
    <li key={topic.id}>
      <button
        className={`topic-row${selectedTopicId === topic.id ? ' is-selected' : ''}`}
        type="button"
        disabled={!hasContent || working}
        aria-expanded={selectedTopicId === topic.id}
        aria-controls={
          selectedTopicId === topic.id ? `topic-panel-${topic.id}` : undefined
        }
        onClick={() => chooseTopic(topic)}
      >
        <span className="topic-number" aria-hidden="true">
          {String(topic.order).padStart(2, '0')}
        </span>

        <span className="topic-info">
          <strong>{topic.nameEn}</strong>

          <span className="topic-translation">{topic.nameVi}</span>

          {hasContent ? (
            <>
              <span className="topic-progress-text">
                {topic.learned}/{topic.total} từ đã học
              </span>

              <progress
                className="topic-progress"
                max={topic.total}
                value={Math.min(topic.learned, topic.total)}
                aria-label={`Tiến độ ${topic.nameVi}`}
              />
            </>
          ) : (
            <span className="topic-progress-text">Chưa có nội dung</span>
          )}
        </span>

        <span className="topic-action">
          {!hasContent
            ? 'Chưa có từ'
            : completed
              ? 'Xem Sổ tay'
              : 'Chọn chủ đề'}
        </span>
      </button>

      {selectedTopicId === topic.id && (
        <div
          id={`topic-panel-${topic.id}`}
          className="selected-topic topic-dropdown"
          role="region"
          aria-label={`Bắt đầu học ${topic.nameVi}`}
        >
          <div>
            <strong>{topic.nameEn}</strong>
            <p>{topic.nameVi}</p>

            <p>
              Đã học {topic.learned}/{topic.total} từ. Mỗi lượt tối đa{' '}
              {batchSize} từ chưa học.
            </p>

            <button
              className="primary-button start-topic-button"
              type="button"
              disabled={working || pendingSession !== null}
              onClick={startSelectedTopic}
            >
              {working ? 'Đang mở…' : 'Bắt đầu học'}
            </button>
          </div>

          <button
            className="close-selection"
            type="button"
            aria-label="Đóng thông tin chủ đề"
            disabled={working}
            onClick={() => setSelectedTopicId(null)}
          >
            ×
          </button>
        </div>
      )}
    </li>
  );
}
