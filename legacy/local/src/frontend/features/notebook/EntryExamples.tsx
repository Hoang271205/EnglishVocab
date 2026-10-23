import type { useEntryDetails } from './useEntryDetails';

export default function EntryExamples({
  model,
}: {
  model: ReturnType<typeof useEntryDetails>;
}) {
  const { playAudio, audioError, data } = model;
  if (!data) return null;
  return (
    <>
      <div className="audio-actions">
        <button
          className="secondary-button"
          type="button"
          onClick={() => void playAudio()}
        >
          Nghe từ · Mỹ
        </button>

        <button
          className="secondary-button"
          type="button"
          onClick={() => void playAudio({ slow: true })}
        >
          Nghe chậm
        </button>
      </div>

      {audioError && (
        <p className="audio-message" role="status">
          {audioError}
        </p>
      )}

      {data.entry.examples.map((example) => (
        <div className="study-example" key={example.id}>
          <p>
            {example.prefix}
            <strong>{example.targetSurface}</strong>
            {example.suffix}
          </p>

          <button
            className="secondary-button"
            type="button"
            onClick={() => void playAudio({ exampleId: example.id })}
          >
            Nghe câu ví dụ
          </button>
        </div>
      ))}
    </>
  );
}
