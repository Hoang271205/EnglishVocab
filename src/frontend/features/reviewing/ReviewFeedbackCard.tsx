import Mascot from '../../components/mascot/Mascot';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';
import StatusMessage from '../../components/ui/StatusMessage';
import { useAmericanSpeech } from '../../hooks/useAmericanSpeech';
import type { OnlineReviewSession } from './review.types';

interface ReviewFeedbackCardProps {
  feedback: NonNullable<OnlineReviewSession['feedback']>;
  voiceURI: string | null;
  disabled: boolean;
  onNext: () => void;
}

export default function ReviewFeedbackCard({
  feedback,
  voiceURI,
  disabled,
  onNext,
}: ReviewFeedbackCardProps) {
  const { entry, example, progress, event } = feedback;
  const speech = useAmericanSpeech(voiceURI);

  const sentence = example.prefix + example.targetSurface + example.suffix;

  return (
    <div className="study-card review-feedback-card">
      <div
        className={`feedback-banner ${event.correct ? 'is-correct' : 'is-incorrect'}`}
      >
        <div className="feedback-status">
          <span className="feedback-status-icon" aria-hidden="true">
            <Icon name={event.correct ? 'check' : 'close'} />
          </span>
          <div className="feedback-copy">
            <StatusMessage tone={event.correct ? 'info' : 'error'}>
              {event.correct
                ? 'Đúng rồi!'
                : 'Chưa đúng. Hãy xem lại từ này nhé.'}
            </StatusMessage>
            <p className="feedback-encouragement">
              {event.correct
                ? 'Bạn làm tốt lắm!'
                : 'Không sao, mình cùng nhớ lại nhé!'}
            </p>
          </div>
        </div>
        <Mascot
          compact
          className="feedback-mascot"
          mood={event.correct ? 'celebrate' : 'encourage'}
        />
      </div>

      <h2 className="study-word">{entry.headword}</h2>
      <p className="word-type">{entry.partOfSpeech}</p>
      <p className="study-meaning">{entry.meaningVi}</p>

      <div className="feedback-metadata">
        <p className="study-ipa">{entry.pronunciation.ipa ?? 'Chưa có IPA'}</p>
        <p className="cefr-label">
          CEFR: {entry.cefr.level ?? 'Chưa có'}
          {entry.cefr.status === 'estimated' ? ' · tham khảo' : ''}
        </p>
      </div>

      <div className="study-example">
        {example.prefix}
        <strong>{example.targetSurface}</strong>
        {example.suffix}
      </div>

      <div className="audio-actions">
        <Button
          icon="volume"
          variant="secondary"
          disabled={disabled}
          onClick={() => speech.speak(entry.headword)}
        >
          Nghe từ · Mỹ
        </Button>

        <Button
          icon="volume"
          variant="secondary"
          disabled={disabled}
          onClick={() => speech.speak(sentence)}
        >
          Nghe câu
        </Button>
      </div>

      {speech.error && <StatusMessage>{speech.error}</StatusMessage>}

      <div className="review-next-schedule">
        <p>
          Level ghi nhớ: <strong>{progress.level}</strong>
        </p>

        <p>
          Lần ôn tiếp theo:{' '}
          <strong>
            {new Date(progress.nextReviewAt).toLocaleString('vi-VN')}
          </strong>
        </p>
      </div>

      <Button className="study-next" disabled={disabled} onClick={onNext}>
        Tiếp tục
        <Icon name="arrow" />
      </Button>
    </div>
  );
}
