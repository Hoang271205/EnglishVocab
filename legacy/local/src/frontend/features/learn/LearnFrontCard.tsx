import type { useLearnSession } from './useLearnSession';

export default function LearnFrontCard({
  controller,
}: {
  controller: ReturnType<typeof useLearnSession>;
}) {
  const { entry, busy, playAudio, example, audioError, goToRecall } =
    controller;
  if (!entry) return null;
  return (
    <div className="study-card">
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
            onClick={() => void playAudio({ exampleId: example.id })}
          >
            Nghe câu ví dụ
          </button>
        </div>
      )}

      {audioError && (
        <p className="audio-message" role="status">
          {audioError} Bạn vẫn có thể tiếp tục học.
        </p>
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

      <button
        className="primary-button study-next"
        type="button"
        disabled={busy}
        onClick={goToRecall}
      >
        Next — Viết lại từ
      </button>
    </div>
  );
}
