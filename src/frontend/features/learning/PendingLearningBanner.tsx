import Button from '../../components/ui/Button';
import StatusMessage from '../../components/ui/StatusMessage';
import { useLearning } from './LearningContext';

export default function PendingLearningBanner() {
  const learning = useLearning();
  const pending = learning.pending;

  return (
    <div className="learning-notices">
      {learning.error && (
        <div className="dashboard-error">
          <StatusMessage tone="error">
            {learning.error}
          </StatusMessage>

          <Button
            variant="secondary"
            onClick={learning.reload}
            disabled={learning.loading}
          >
            Tải lại
          </Button>
        </div>
      )}

      {pending && (
        <div className="pending-session">
          <div>
            <strong>Bạn có một phiên học đang dở</strong>

            <p>
              Đã hoàn thành {pending.index}/
              {pending.total} từ.
            </p>
          </div>

          <Button
            onClick={learning.openPending}
            disabled={learning.working}
          >
            Tiếp tục
          </Button>
        </div>
      )}
    </div>
  );
}