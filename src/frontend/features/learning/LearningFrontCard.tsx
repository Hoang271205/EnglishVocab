import Mascot from '../../components/mascot/Mascot';
import type { Entry } from '../../../domain/types';
import Button from '../../components/ui/Button';
import StatusMessage from '../../components/ui/StatusMessage';
import { useAmericanSpeech } from '../../hooks/useAmericanSpeech';

interface LearningFrontCardProps {
  entry: Entry;
  voiceURI: string | null;
  busy: boolean;
  onNext: () => void;
}

export default function LearningFrontCard({
  entry,
  voiceURI,
  busy,
  onNext,
}: LearningFrontCardProps) {
  const speech = useAmericanSpeech(voiceURI);
  const example = entry.examples[0];

  return (
    <div className="study-card">
      <Mascot
        compact
        className="study-mascot"
        message="Nghe phát âm, đọc nghĩa rồi thử viết lại nhé!"
      />
      <p className="word-type">{entry.partOfSpeech}</p>
      <h2 className="study-word">{entry.headword}</h2>

      <p className="cefr-label">
        {entry.cefr.level ?? 'Chưa có CEFR'}
        {entry.cefr.status === 'estimated' ? ' · tham khảo' : ''}
      </p>

      <p className="study-meaning">{entry.meaningVi}</p>

      <p className="study-ipa">
        {entry.pronunciation.ipa ?? 'Chưa có phiên âm IPA'}
      </p>

      <div className="audio-actions">
        <Button
          icon="volume"
          variant="secondary"
          disabled={busy}
          onClick={() => speech.speak(entry.headword)}
        >
          Nghe từ · Mỹ
        </Button>

        <Button
          icon="slow"
          variant="secondary"
          disabled={busy}
          onClick={() => speech.speak(entry.headword, true)}
        >
          Nghe chậm
        </Button>
      </div>

      {example && (
        <div className="study-example">
          <p>
            {example.prefix}
            <strong>{example.targetSurface}</strong>
            {example.suffix}
          </p>

          <Button
            icon="volume"
            variant="secondary"
            disabled={busy}
            onClick={() =>
              speech.speak(
                example.prefix + example.targetSurface + example.suffix,
              )
            }
          >
            Nghe câu ví dụ
          </Button>
        </div>
      )}

      {speech.error && (
        <StatusMessage>
          {speech.error} Bạn vẫn có thể tiếp tục học.
        </StatusMessage>
      )}

      <details className="study-sources">
        <summary>Nguồn dữ liệu</summary>

        {entry.provenance.map((source, index) => (
          <p key={`${source.field}-${index}`}>
            {source.attribution} · {source.license}
            {source.url && (
              <>
                {' · '}
                <a href={source.url} target="_blank" rel="noreferrer">
                  Xem nguồn
                </a>
              </>
            )}
          </p>
        ))}
      </details>

      <Button className="study-next" loading={busy} onClick={onNext}>
        Tiếp theo — Viết lại từ
      </Button>
    </div>
  );
}
