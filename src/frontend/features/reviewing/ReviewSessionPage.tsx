import Button from '../../components/ui/Button';
import StatusMessage from '../../components/ui/StatusMessage';
import ReviewFeedbackCard from './ReviewFeedbackCard';
import ReviewQuestionCard from './ReviewQuestionCard';
import { useOnlineReviewSession } from './useOnlineReviewSession';

interface ReviewSessionPageProps {
  sessionId: string;
  voiceURI: string | null;
  onExit: () => void;
}

export default function ReviewSessionPage({
  sessionId,
  voiceURI,
  onExit,
}: ReviewSessionPageProps) {
  const model = useOnlineReviewSession(sessionId, onExit);

  const session = model.session;

  const answered = session
    ? (session.reviewedCount ??
      Math.min(
        session.total,
        session.index + (session.phase === 'feedback' ? 1 : 0),
      ))
    : 0;

  return (
    <section className="session-page">
      {model.error && (
        <div className="dashboard-error">
          <StatusMessage tone="error">
            {model.error}
            {model.needsReload ? ' Hãy tải lại phiên trước khi tiếp tục.' : ''}
          </StatusMessage>

          <Button
            variant="secondary"
            disabled={model.busy}
            onClick={model.reload}
          >
            Tải lại phiên
          </Button>
        </div>
      )}

      {!session ? (
        !model.error && <StatusMessage>Đang tải phiên ôn…</StatusMessage>
      ) : (
        <>
          <div className="study-toolbar">
            <span>
              Đã trả lời {answered}/{session.total} từ
            </span>

            <Button
              variant="secondary"
              disabled={model.blocked}
              onClick={() => void model.exit()}
            >
              {session.phase === 'complete'
                ? 'Về trang ôn tập'
                : 'Tạm dừng và thoát'}
            </Button>
          </div>

          <progress
            className="session-progress"
            max={session.total}
            value={answered}
            aria-label="Tiến độ phiên ôn"
          />

          {model.notice && <StatusMessage>{model.notice}</StatusMessage>}

          {session.phase === 'complete' ? (
            <div className="session-summary">
              <h1>
                {session.endedEarly
                  ? 'Đã kết thúc lượt ôn'
                  : 'Hoàn thành lượt ôn!'}
              </h1>
              {session.endedEarly && (
                <p>
                  Đã lưu kết quả {answered}/{session.total} từ.{' '}
                  {session.remainingCount ?? 0} từ chưa làm vẫn giữ nguyên lịch
                  ôn.
                </p>
              )}

              <Button
                disabled={model.blocked}
                onClick={() => void model.exit()}
              >
                Về trang ôn tập
              </Button>
            </div>
          ) : session.paused ? (
            <div className="session-summary">
              <h1>Phiên ôn đang tạm dừng</h1>

              <Button
                disabled={model.blocked}
                onClick={() => void model.transition('resume')}
              >
                Tiếp tục ôn
              </Button>
            </div>
          ) : session.reviewDisabled ? (
            <div className="session-summary">
              <StatusMessage>
                Từ này đã được tắt ôn tập. Bỏ qua sẽ giữ nguyên level và lịch
                ôn.
              </StatusMessage>
              <Button
                disabled={model.blocked}
                onClick={() => void model.transition('next')}
              >
                Bỏ qua từ đã tắt ôn
              </Button>
            </div>
          ) : session.phase === 'question' && session.question ? (
            <ReviewQuestionCard
              key={session.question.attemptId}
              question={session.question}
              letters={model.letters}
              disabled={model.blocked}
              canSubmit={model.canSubmit}
              onChange={model.setLetters}
              onSubmit={() => void model.submit()}
              onForgotten={() => void model.submit(true)}
              onSaveDraft={() => void model.transition('draft')}
            />
          ) : session.feedback ? (
            <ReviewFeedbackCard
              feedback={session.feedback}
              voiceURI={voiceURI}
              disabled={model.blocked}
              onNext={() => void model.transition('next')}
            />
          ) : null}

          {session.phase !== 'complete' && (
            <div className="review-finish-actions">
              <Button
                variant="secondary"
                disabled={model.blocked}
                onClick={() => void model.finish()}
              >
                Kết thúc lượt ôn
              </Button>
              <p>
                Kết quả đã gửi được giữ lại; từ chưa làm vẫn chờ ôn lần sau.
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
