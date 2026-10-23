import { Fragment } from 'react';
import Button from '../../components/ui/Button';
import EntryDetails from './EntryDetails';
import type { NotebookRow } from './notebook.types';
interface Props {
  title: string;
  rows: NotebookRow[];
  selectedId: string | null;
  busy: boolean;
  voiceURI: string | null;
  onSelect: (id: string | null) => void;
  onEdit: (row: NotebookRow) => void;
  onDelete: (row: NotebookRow) => void;
  onReview: (row: NotebookRow, enabled: boolean) => void;
  onLearn: (row: NotebookRow) => void;
  canLearn: boolean;
}
export default function NotebookStack(props: Props) {
  return (
    <section className="cloud-stack">
      <h2>
        {props.title} <small>({props.rows.length})</small>
      </h2>
      {!props.rows.length && (
        <p className="page-description">Chưa có từ trong nhóm này.</p>
      )}
      {props.rows.map((row) => {
        const selected = props.selectedId === row.entry.id;
        return (
          <Fragment key={row.entry.id}>
            <div className={`cloud-word-row${selected ? ' is-selected' : ''}`}>
              <button
                type="button"
                className="cloud-word-select"
                aria-expanded={selected}
                aria-controls={`entry-${row.entry.id}`}
                onClick={() => props.onSelect(selected ? null : row.entry.id)}
              >
                <span>
                  <strong>{row.entry.headword}</strong>
                  <small>{row.entry.partOfSpeech || 'Chưa có từ loại'}</small>
                  <span>{row.entry.meaningVi || 'Chưa có nghĩa'}</span>
                </span>
                <span className="cloud-word-meta">
                  <span>CEFR: {row.entry.cefr.level || 'Chưa có'}</span>
                  <span>
                    {row.progress
                      ? `Level ${row.progress.level}`
                      : 'Chưa có level'}
                  </span>
                  <span>
                    {row.known
                      ? 'Đã biết · không ôn tập'
                      : row.entry.contentStatus === 'draft'
                        ? 'Chờ bổ sung'
                        : row.progress
                          ? 'Đã học'
                          : 'Chưa học'}
                  </span>
                </span>
              </button>
              <div className="cloud-row-actions">
                {row.entry.contentStatus === 'ready' && !row.known && (
                  <label className="cloud-check">
                    <input
                      type="checkbox"
                      checked={row.reviewEnabled}
                      disabled={props.busy}
                      onChange={(e) => props.onReview(row, e.target.checked)}
                    />
                    Ôn tập
                  </label>
                )}
                {row.entry.collectionId === 'personal' && (
                  <>
                    {!row.progress &&
                      !row.known &&
                      row.entry.contentStatus === 'ready' && (
                        <Button
                          variant="secondary"
                          disabled={!props.canLearn || props.busy}
                          onClick={() => props.onLearn(row)}
                        >
                          Học từ
                        </Button>
                      )}
                    <Button
                      className="cloud-danger"
                      variant="secondary"
                      disabled={props.busy}
                      aria-label={`Xoá ${row.entry.headword}`}
                      onClick={() => props.onDelete(row)}
                    >
                      🗑
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div id={`entry-${row.entry.id}`} hidden={!selected}>
              {selected && (
                <EntryDetails
                  row={row}
                  voiceURI={props.voiceURI}
                  onClose={() => props.onSelect(null)}
                  onEdit={() => props.onEdit(row)}
                />
              )}
            </div>
          </Fragment>
        );
      })}
    </section>
  );
}
