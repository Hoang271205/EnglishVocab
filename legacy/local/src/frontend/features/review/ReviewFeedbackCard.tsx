import type { useReviewSession } from './useReviewSession';
import { formatTime } from '../../../../../../src/frontend/components/format';

export default function ReviewFeedbackCard({
  controller,
}: {
  controller: ReturnType<typeof useReviewSession>;
}) {
  const { feedback, busy, playAudio, example, audioError, nextQuestion } =
    controller;
  if (!feedback) return null;
  return (
    <div className="study-card">
      <p
        className={`study-notice ${feedback.event.correct ? 'is-success' : 'is-hint'}`}
        role="status"
      >
        {feedback.event.correct
          ? 'Đúng rồi!'
          : 'Chưa đúng. Xem lại từ trước khi tiếp tục nhé.'}
      </p>

      <h2 className="study-word">{feedback.entry.headword}</h2>

      <p className="word-type">{feedback.entry.partOfSpeech}</p>

      <p className="study-meaning">{feedback.entry.meaningVi}</p>

      <p className="study-ipa">
        {feedback.entry.pronunciation.ipa ?? 'Chưa có phiên âm IPA'}
      </p>

      <p className="cefr-label">
        CEFR: {feedback.entry.cefr.level ?? 'Chưa có'}
        {feedback.entry.cefr.status === 'estimated' ? ' · tham khảo' : ''}
      </p>

      <div className="review-result">
        <p>
          Level ghi nhớ sau lượt này:{' '}
          <strong>{feedback.event.afterLevel}</strong>
        </p>

        <p>
          Lần ôn tiếp theo:{' '}
          <strong>{formatTime(feedback.event.nextReviewAt)}</strong>
        </p>
      </div>

      <div className="audio-actions">
        <button
          className="secondary-button"
          type="button"
          disabled={busy}
          onClick={() => void playAudio()}
        >
          Nghe từ · Mỹ
        </button>

        <button
          className="secondary-button"
          type="button"
          disabled={busy}
          onClick={() => void playAudio({ slow: true })}
        >
          Nghe chậm
        </button>
      </div>

      {example && (
        <div className="study-example">
          <p>
            {example.prefix}
            <strong>{example.targetSurface}</strong>
            {example.suffix}
          </p>

          <button
            className="secondary-button"
            type="button"
            disabled={busy}
            onClick={() =>
              void playAudio({
                exampleId: example.id,
              })
            }
          >
            Nghe câu ví dụ
          </button>
        </div>
      )}

      {audioError && (
        <p className="audio-message" role="status">
          {audioError} Bạn vẫn có thể tiếp tục ôn.
        </p>
      )}

      <button
        className="primary-button study-next"
        type="button"
        disabled={busy}
        onClick={nextQuestion}
      >
        {busy ? 'Đang chuyển…' : 'Từ tiếp theo'}
      </button>
    </div>
  );
}
