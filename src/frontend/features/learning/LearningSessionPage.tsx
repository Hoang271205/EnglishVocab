import Mascot from '../../components/mascot/Mascot';
import Button from '../../components/ui/Button';
import StatusMessage from '../../components/ui/StatusMessage';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import LearningFrontCard from './LearningFrontCard';
import LearningRecallCard from './LearningRecallCard';
import { useLearningSession } from './useLearningSession';

interface LearningSessionPageProps {
  sessionId: string;
  voiceURI: string | null;
  onExit: () => void;
}

export default function LearningSessionPage({
  sessionId,
  voiceURI,
  onExit,
}: LearningSessionPageProps) {
  const model = useLearningSession(sessionId, onExit);
  const session = model.session;

  const blocked = model.busy || model.needsReload || Boolean(model.error);

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
        !model.error && (
          <LoadingSkeleton variant="session" label="Đang tải phiên học" />
        )
      ) : (
        <>
          <div className="study-toolbar">
            <span>
              Đã hoàn thành {session.index}/{session.total} từ
            </span>

            <Button
              variant="secondary"
              disabled={blocked}
              onClick={() => void model.exit()}
            >
              {session.phase === 'complete'
                ? 'Về danh sách chủ đề'
                : 'Tạm dừng và thoát'}
            </Button>
          </div>

          <progress
            className="session-progress"
            max={session.total}
            value={session.index}
            aria-label="Tiến độ phiên học"
          />

          {model.notice && <StatusMessage>{model.notice}</StatusMessage>}

          {session.phase === 'complete' ? (
            <div className="session-summary">
              <Mascot
                mood={
                  session.total > (session.skippedCount ?? 0)
                    ? 'celebrate'
                    : 'encourage'
                }
                message="Mình cùng tiếp tục hành trình học nhé!"
              />
              <h1>Hoàn thành lượt học!</h1>
              <div className="result-metrics">
                <div>
                  <strong>{session.total}</strong>
                  <span>Từ trong lượt</span>
                </div>
                <div className="result-correct">
                  <strong>
                    {Math.max(0, session.total - (session.skippedCount ?? 0))}
                  </strong>
                  <span>Từ đã học</span>
                </div>
                <div>
                  <strong>{session.skippedCount ?? 0}</strong>
                  <span>Từ đã bỏ qua</span>
                </div>
              </div>

              <p>
                Các từ đã viết đúng được lưu vào lịch ôn.{' '}
                {session.skippedCount ?? 0} từ đã bỏ qua, không thêm vào sổ tay
                hoặc lịch ôn.
              </p>

              <Button disabled={blocked} onClick={() => void model.exit()}>
                Về danh sách chủ đề
              </Button>
            </div>
          ) : session.paused ? (
            <div className="session-summary">
              <Mascot
                mood="rest"
                message="Nghỉ một chút, rồi mình học tiếp nhé!"
              />
              <h1>Phiên học đang tạm dừng</h1>

              <Button
                disabled={blocked}
                onClick={() => void model.transition('resume')}
              >
                Tiếp tục học
              </Button>
            </div>
          ) : session.phase === 'front' && session.front ? (
            <LearningFrontCard
              key={session.attemptId}
              entry={session.front}
              voiceURI={voiceURI}
              busy={blocked}
              onNext={() => void model.transition('recall')}
            />
          ) : session.phase === 'recall' && session.hint ? (
            <LearningRecallCard
              key={session.attemptId}
              meaningVi={session.hint.meaningVi}
              partOfSpeech={session.hint.partOfSpeech}
              answer={model.answer}
              busy={blocked}
              onChange={model.setAnswer}
              onSubmit={() => void model.submit()}
              onShowFront={() => void model.transition('front')}
              onSaveDraft={() => void model.transition('draft')}
            />
          ) : null}

          {session.phase !== 'complete' && !session.paused && (
            <button
              type="button"
              className="learning-skip-button"
              disabled={blocked}
              onClick={() => void model.transition('skip')}
            >
              Skip — Bỏ qua từ này
            </button>
          )}
        </>
      )}
    </section>
  );
}
