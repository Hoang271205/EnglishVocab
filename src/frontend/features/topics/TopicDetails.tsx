import Icon from '../../components/ui/Icon';
import Button from '../../components/ui/Button';
import StatusMessage from '../../components/ui/StatusMessage';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import { useTopicEntries } from './useTopicEntries';
import LearningStartButton from '../learning/LearningStartButton';

interface TopicDetailsProps {
  topicId: string;
  topicName: string;
  remaining: number;
  onClose: () => void;
}

export default function TopicDetails({
  topicId,
  topicName,
  remaining,
  onClose,
}: TopicDetailsProps) {
  const resource = useTopicEntries(topicId);

  return (
    <div
      id={`online-topic-${topicId}`}
      className="selected-topic topic-dropdown"
      role="region"
      aria-label={`Từ trong chủ đề ${topicName}`}
    >
      <div className="online-topic-details">
        <strong>{topicName}</strong>

        {resource.loading && <LoadingSkeleton label="Đang tải từ vựng" rows={3} />}

        {resource.error && (
          <>
            <StatusMessage tone="error">{resource.error}</StatusMessage>

            <Button onClick={resource.reload}>Thử lại</Button>
          </>
        )}

        {resource.data && (
          <>
            <p>
              {resource.data.length} từ sẵn sàng trong chủ đề · {remaining} từ
              chưa học hoặc chưa đánh dấu đã biết.
            </p>
            <LearningStartButton
              topicId={topicId}
              disabled={resource.data.length === 0 || remaining === 0}
            />

            {resource.data.length === 0 ? (
              <p>Chủ đề chưa có từ đủ điều kiện học.</p>
            ) : (
              <ul className="online-topic-words">
                {resource.data.map((entry) => (
                  <li key={entry.id}>
                    <strong>{entry.headword}</strong>
                    <span>{entry.partOfSpeech}</span>
                    <span>{entry.meaningVi}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      <button
        className="close-selection"
        type="button"
        aria-label="Đóng thông tin chủ đề"
        onClick={onClose}
      >
        <Icon name="close" />
      </button>
    </div>
  );
}
