import Icon from '../../components/ui/Icon';
import { Fragment, lazy } from 'react';
import Button from '../../components/ui/Button';
import NotebookEntry from './NotebookEntry';
import type { Entry } from '../../../domain/types';
import type { NotebookRow, NotebookListRow } from './notebook.types';

const PersonalEntryEditor = lazy(() => import('./PersonalEntryEditor'));
interface Props {
  title: string;
  rows: NotebookListRow[];
  total: number;
  selectedId: string | null;
  busy: boolean;
  voiceURI: string | null;
  onSelect: (id: string | null) => void;
  editor: NotebookRow | null;
  onEdit: (row: NotebookRow) => void;
  onSave: (entry: Entry) => Promise<void>;
  onCancelEdit: () => void;
  onDelete: (row: NotebookListRow) => void;
  onReview: (row: NotebookListRow, enabled: boolean) => void;
  onLearn: (row: NotebookListRow) => void;
  canLearn: boolean;
}
export default function NotebookStack(props: Props) {
  return (
    <section className="cloud-stack">
      <h2>
        {props.title} <small>({props.total})</small>
      </h2>
      {!props.rows.length && (
        <p className="page-description">
          {props.total > 0
            ? 'Các từ trong nhóm này nằm ở trang khác.'
            : 'Chưa có từ trong nhóm này.'}
        </p>
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
                    {row.entry.contentStatus === 'draft'
                      ? 'Chờ bổ sung'
                      : row.progress
                        ? 'Đã học'
                        : 'Chưa học'}
                  </span>
                </span>
              </button>
              <div className="cloud-row-actions">
                {row.entry.contentStatus === 'ready' && (
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
                    {!row.progress && row.entry.contentStatus === 'ready' && (
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
                      <Icon name="trash" />
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div id={`entry-${row.entry.id}`} hidden={!selected}>
              {selected &&
                (props.editor?.entry.id === row.entry.id ? (
                  <PersonalEntryEditor
                    key={props.editor.entry.id}
                    entry={props.editor.entry}
                    learned={Boolean(props.editor.progress)}
                    busy={props.busy}
                    onSave={props.onSave}
                    onCancel={props.onCancelEdit}
                  />
                ) : (
                  <NotebookEntry
                    id={row.entry.id}
                    voiceURI={props.voiceURI}
                    onClose={() => props.onSelect(null)}
                    onEdit={props.onEdit}
                  />
                ))}
            </div>
          </Fragment>
        );
      })}
    </section>
  );
}
