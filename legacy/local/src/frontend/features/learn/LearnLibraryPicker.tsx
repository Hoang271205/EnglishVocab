import type { useLearnPage } from './useLearnPage';

export default function LearnLibraryPicker({
  model,
}: {
  model: ReturnType<typeof useLearnPage>;
}) {
  const { collection, chooseCollection } = model;
  return (
    <>
      <div className="collection-picker" aria-label="Chọn bộ từ">
        <button
          className={`collection-chip${collection === 'ielts' ? ' is-selected' : ''}`}
          type="button"
          aria-pressed={collection === 'ielts'}
          onClick={() => chooseCollection('ielts')}
        >
          IELTS Vocabulary
        </button>

        <button
          className={`collection-chip${collection === 'daily' ? ' is-selected' : ''}`}
          type="button"
          aria-pressed={collection === 'daily'}
          onClick={() => chooseCollection('daily')}
        >
          Giao tiếp hằng ngày
        </button>
      </div>

      <div className="collection-banner">
        {collection === 'ielts'
          ? 'IELTS VOCABULARY · B1–C2'
          : 'GIAO TIẾP HẰNG NGÀY · A1–B2'}
      </div>
    </>
  );
}
