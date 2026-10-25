import FinishReviewDialog from './FinishReviewDialog';
import Mascot from '../../components/mascot/Mascot';
import Button from '../../components/ui/Button';
import StatusMessage from '../../components/ui/StatusMessage';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import ReviewFeedbackCard from './ReviewFeedbackCard';
import ReviewQuestionCard from './ReviewQuestionCard';
import { useOnlineReviewSession } from './useOnlineReviewSession';

interface ReviewSessionPageProps {
  sessionId: string;
  voiceURI: string | null;
  onExit: () => void;
  onOpenNotebook: () => void;
}

export default function ReviewSessionPage({
  sessionId,
  voiceURI,
  onExit,
  onOpenNotebook,
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
      {model.finishConfirmationOpen && (
        <FinishReviewDialog
          busy={model.busy}
          onCancel={model.cancelFinish}
          onConfirm={() => void model.finish()}
        />
      )}
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
        !model.error && (
          <LoadingSkeleton variant="session" label="Đang tải phiên ôn" />
        )
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
            <div className="session-summary review-summary">
              <span className="completion-pill">Đã hoàn tất</span>
              <Mascot mood={answered > 0 ? 'celebrate' : 'encourage'} />
              <h1>
                {session.endedEarly
                  ? 'Đã kết thúc phiên ôn'
                  : 'Hoàn thành phiên ôn!'}
              </h1>
              <p>
                {answered > 0
                  ? 'Mỗi lần ôn, mình lại nhớ thêm một chút!'
                  : 'Bạn chưa gửi câu trả lời nào. Mình cùng thử lại khi sẵn sàng nhé!'}
              </p>
              <div className="result-metrics" aria-label="Kết quả phiên ôn">
                <div>
                  <strong>{answered}</strong>
                  <span>Câu đã trả lời</span>
                </div>
                <div className="result-correct">
                  <strong>{session.correctCount ?? '—'}</strong>
                  <span>Câu đúng</span>
                </div>
                <div className="result-incorrect">
                  <strong>{session.incorrectCount ?? '—'}</strong>
                  <span>Câu sai</span>
                </div>
              </div>
              {answered > 0 && session.correctCount != null && (
                <p className="result-rate">
                  Tỷ lệ đúng:{' '}
                  <strong>
                    {Math.round((session.correctCount / answered) * 100)}%
                  </strong>
                </p>
              )}
              {(session.ungradedCount ?? 0) > 0 && (
                <p className="result-note">
                  {session.ungradedCount} câu chưa trả lời hoặc đã bỏ qua do tắt
                  ôn tập, không tính là câu sai. Những từ chưa làm vẫn giữ lịch
                  ôn.
                </p>
              )}
              <div className="summary-actions">
                <Button
                  disabled={model.blocked}
                  onClick={() => void model.exit()}
                >
                  Về trang ôn tập
                </Button>
                <Button
                  variant="secondary"
                  icon="notebook"
                  disabled={model.blocked}
                  onClick={onOpenNotebook}
                >
                  Mở sổ tay
                </Button>
              </div>
            </div>
          ) : session.paused ? (
            <div className="session-summary">
              <Mascot
                mood="rest"
                message="Nghỉ một chút, rồi mình ôn tiếp nhé!"
              />
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
                onClick={model.requestFinish}
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
