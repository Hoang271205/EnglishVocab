import ReviewToggle from './ReviewToggle';
import EntryDetails from './EntryDetails';
import type { NotebookPageProps } from './types';
import { statusLabels } from './constants';
import type { useNotebookPage } from './useNotebookPage';
import type { NotebookRow } from './types';

export default function NotebookWordRow({
  model,
  row,
  onOpenSession,
}: {
  model: ReturnType<typeof useNotebookPage>;
  row: NotebookRow;
  onOpenSession: NotebookPageProps['onOpenSession'];
}) {
  const {
    deletingId,
    creating,
    readingOpen,
    setRows,
    selectedId,
    setSelectedId,
    scope,
    deleteWord,
    reloadKey,
    saved,
  } = model;
  return (
    <li key={row.entry.id} className="notebook-list-item">
      <div className="notebook-item-main">
        <ReviewToggle
          entryId={row.entry.id}
          headword={row.entry.headword}
          enabled={row.reviewEnabled}
          disabled={deletingId !== null || creating || readingOpen}
          onChanged={(enabled) => {
            setRows((current) =>
              current.map((item) =>
                item.entry.id === row.entry.id
                  ? { ...item, reviewEnabled: enabled }
                  : item,
              ),
            );
          }}
        />

        <button
          className={`notebook-row${selectedId === row.entry.id ? ' is-selected' : ''}`}
          type="button"
          aria-expanded={selectedId === row.entry.id}
          onClick={() =>
            setSelectedId((current) =>
              current === row.entry.id ? null : row.entry.id,
            )
          }
        >
          <span className="notebook-word">
            <strong>{row.entry.headword}</strong>
            <span>{row.entry.partOfSpeech}</span>
            <span>{row.entry.meaningVi || 'Chưa có nghĩa'}</span>
          </span>

          <span className="notebook-meta">
            <span>
              CEFR: {row.entry.cefr.level ?? 'Chưa có'}
              {row.entry.cefr.status === 'estimated' ? ' · tham khảo' : ''}
            </span>

            <span>
              {row.progress ? `Level ${row.progress.level}` : 'Chưa có level'}
            </span>

            <span>{statusLabels[row.status] ?? row.status}</span>
          </span>
        </button>

        {scope === 'personal' && row.entry.collectionId === 'personal' && (
          <button
            className="delete-word-button"
            type="button"
            title={`Xóa ${row.entry.headword}`}
            aria-label={`Xóa từ ${row.entry.headword}`}
            disabled={
              deletingId !== null ||
              creating ||
              readingOpen ||
              selectedId !== null
            }
            onClick={() => void deleteWord(row)}
          >
            {deletingId === row.entry.id ? (
              <span aria-hidden="true">…</span>
            ) : (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 6h18" />
                <path d="M9 6V4h6v2" />
                <path d="M5 6l1 14h12l1-14" />
                <path d="M10 10v6M14 10v6" />
              </svg>
            )}
          </button>
        )}
      </div>

      {selectedId === row.entry.id && (
        <EntryDetails
          key={`${row.entry.id}-${reloadKey}`}
          entryId={row.entry.id}
          onClose={() => setSelectedId(null)}
          onSaved={saved}
          onOpenSession={onOpenSession}
        />
      )}
    </li>
  );
}
