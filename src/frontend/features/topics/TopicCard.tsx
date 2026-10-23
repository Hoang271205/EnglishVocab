import TopicDetails from './TopicDetails';
import type { TopicSummary } from './topics.types';

interface TopicCardProps {
  topic: TopicSummary;
  selected: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export default function TopicCard({
  topic,
  selected,
  onToggle,
  onClose,
}: TopicCardProps) {
  const hasContent = topic.total > 0;

  return (
    <li>
      <button
        className={`topic-row${selected ? ' is-selected' : ''}`}
        type="button"
        disabled={!hasContent}
        aria-expanded={selected}
        aria-controls={selected ? `online-topic-${topic.id}` : undefined}
        onClick={onToggle}
      >
        <span className="topic-number" aria-hidden="true">
          {String(topic.order).padStart(2, '0')}
        </span>

        <span className="topic-info">
          <strong>{topic.nameEn}</strong>

          <span className="topic-translation">{topic.nameVi}</span>

          <span className="topic-progress-text">
            {hasContent
              ? `${topic.learned}/${topic.total} từ đã học`
              : 'Chưa có nội dung'}
            {topic.known > 0 && ` · ${topic.known} từ đã biết`}
          </span>

          {hasContent && (
            <progress
              className="topic-progress"
              max={topic.total}
              value={Math.min(topic.learned + topic.known, topic.total)}
              aria-label={`Tiến độ ${topic.nameVi}`}
            />
          )}
        </span>

        <span className="topic-action">
          {hasContent ? 'Xem từ' : 'Chưa có từ'}
        </span>
      </button>

      {selected && (
        <TopicDetails
          key={topic.id}
          topicId={topic.id}
          topicName={topic.nameVi}
          remaining={Math.max(0, topic.total - topic.learned - topic.known)}
          onClose={onClose}
        />
      )}
    </li>
  );
}
