import TopicDetails from './TopicDetails';
import type { TopicSummary } from './topics.types';

interface TopicCardProps {
  topic: TopicSummary;
  selected: boolean;
  onToggle: () => void;
  onClose: () => void;
  displayNumber?: number;
}

export default function TopicCard({
  topic,
  selected,
  onToggle,
  onClose,
  displayNumber,
}: TopicCardProps) {
  const hasContent = topic.total > 0;
  const noun = topic.collectionId === 'idioms' ? 'thành ngữ' : 'từ';

  return (
    <li>
      <button
        className={`topic-row${selected ? ' is-selected' : ''}${topic.part === 2 ? ' topic-row--part-two' : ''}`}
        type="button"
        disabled={!hasContent}
        aria-expanded={selected}
        aria-controls={selected ? `online-topic-${topic.id}` : undefined}
        onClick={onToggle}
      >
        <span className="topic-number" aria-hidden="true">
          {String(displayNumber ?? topic.order).padStart(2, '0')}
        </span>

        <span className="topic-info">
          <strong>{topic.nameEn}</strong>

          <span className="topic-translation">{topic.nameVi}</span>

          <span className="topic-progress-text">
            {hasContent
              ? `${topic.learned}/${topic.total} ${noun} đã học`
              : 'Chưa có nội dung'}
            {topic.processed >= topic.total && hasContent && ' · Đã hoàn thành'}
          </span>

          {hasContent && (
            <progress
              className="topic-progress"
              max={topic.total}
              value={Math.min(topic.processed, topic.total)}
              aria-label={`Tiến độ ${topic.nameVi}`}
            />
          )}
        </span>

        <span className="topic-action">
          {hasContent ? `Xem ${noun}` : `Chưa có ${noun}`}
        </span>
      </button>

      {selected && (
        <TopicDetails
          key={topic.id}
          topicId={topic.id}
          topicName={topic.nameVi}
          entryLabel={noun}
          remaining={Math.max(0, topic.total - topic.processed)}
          onClose={onClose}
        />
      )}
    </li>
  );
}
