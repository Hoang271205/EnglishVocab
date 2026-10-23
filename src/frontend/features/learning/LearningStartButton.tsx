import Button from '../../components/ui/Button';
import { useLearning } from './LearningContext';

interface LearningStartButtonProps {
  topicId: string;
  disabled?: boolean;
}

export default function LearningStartButton({
  topicId,
  disabled = false,
}: LearningStartButtonProps) {
  const learning = useLearning();

  return (
    <div>
      <p>Mỗi lượt tối đa {learning.batchSize} từ chưa học.</p>

      <Button
        icon="learn"
        className="start-topic-button"
        loading={learning.working}
        disabled={
          disabled ||
          learning.loading ||
          Boolean(learning.pending) ||
          Boolean(learning.error)
        }
        onClick={() => void learning.start(topicId)}
      >
        {learning.working ? 'Đang mở…' : 'Bắt đầu học'}
      </Button>
    </div>
  );
}
