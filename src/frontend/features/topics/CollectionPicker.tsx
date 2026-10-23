import type { VocabularyCollection } from './topics.types';

interface CollectionPickerProps {
  value: VocabularyCollection;
  onChange: (value: VocabularyCollection) => void;
}

const collections = [
  {
    id: 'ielts',
    label: 'IELTS Vocabulary',
    banner: 'IELTS VOCABULARY · B1–C2',
  },
  {
    id: 'daily',
    label: 'Giao tiếp hằng ngày',
    banner: 'GIAO TIẾP HẰNG NGÀY · A1–B2',
  },
] as const;

export default function CollectionPicker({
  value,
  onChange,
}: CollectionPickerProps) {
  const selected = collections.find(
    (collection) => collection.id === value,
  )!;

  return (
    <>
      <div
        className="collection-picker"
        aria-label="Chọn bộ từ"
      >
        {collections.map((collection) => (
          <button
            key={collection.id}
            className={[
              'collection-chip',
              value === collection.id ? 'is-selected' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            type="button"
            aria-pressed={value === collection.id}
            onClick={() => onChange(collection.id)}
          >
            {collection.label}
          </button>
        ))}
      </div>

      <div className="collection-banner">
        {selected.banner}
      </div>
    </>
  );
}