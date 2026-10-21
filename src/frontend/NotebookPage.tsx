import { useEffect, useState } from 'react';
import type { CefrLevel, CollectionId, SessionView } from '../domain/types';
import { backend, initializeBackend } from './backend';
import EntryDetails from './EntryDetails';
import PersonalEntryEditor from './PersonalEntryEditor';
import ReadingPanel from './ReadingPanel';

type NotebookRow = Awaited<
  ReturnType<typeof backend.queries.notebook>
>[number];

type Scope = 'learned' | 'personal';

type PersonalStatus =
  | 'all'
  | 'draft'
  | 'unlearned'
  | 'reviewing'
  | 'mastered';

type NotebookPageProps = {
  onLearn: () => void;
  onOpenSession: (session: SessionView) => void;
};

const cefrLevels: CefrLevel[] = [
  'A1',
  'A2',
  'B1',
  'B2',
  'C1',
  'C2',
];

const personalStatuses: {
  id: PersonalStatus;
  label: string;
}[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'draft', label: 'Chờ bổ sung' },
  { id: 'unlearned', label: 'Chưa học' },
  { id: 'reviewing', label: 'Đang ôn' },
  { id: 'mastered', label: 'Thành thạo' },
];

const statusLabels: Record<string, string> = {
  draft: 'Chờ bổ sung',
  unlearned: 'Chưa học',
  reviewing: 'Đang ôn',
  mastered: 'Thành thạo',
};

export default function NotebookPage({
    
  onLearn,
  onOpenSession,
}: NotebookPageProps) {
  const [creating, setCreating] = useState(false);
  const [readingOpen, setReadingOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [scope, setScope] = useState<Scope>('learned');
  const [collection, setCollection] =
    useState<CollectionId | 'all'>('all');

  const [search, setSearch] = useState('');
  const [cefr, setCefr] = useState<CefrLevel | ''>('');
  const [level, setLevel] = useState('');
  const [dueOnly, setDueOnly] = useState(false);
  const [status, setStatus] = useState<PersonalStatus>('all');

  const [rows, setRows] = useState<NotebookRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [selectedId, setSelectedId] =
    useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadRows() {
      setLoading(true);
      setError(null);

      try {
        await initializeBackend();

        const query: Parameters<
          typeof backend.queries.notebook
        >[0] = {
          search,
        };

        if (scope === 'personal') {
          query.collection = 'personal';
        } else if (collection !== 'all') {
          query.collection = collection;
        }

        if (cefr) {
          query.cefr = cefr;
        }

        if (level) {
          query.level = Number(level);
        }

        if (dueOnly) {
          query.due = true;
        }

        const result = await backend.queries.notebook(query);

        const visible =
          scope === 'learned'
            ? result.filter((row) => row.progress !== null)
            : result.filter(
                (row) =>
                  status === 'all' || row.status === status,
              );

        if (!cancelled) {
          setRows(visible);
        }
      } catch (cause: unknown) {
        if (!cancelled) {
          setError(
            cause instanceof Error
              ? cause.message
              : 'Không tải được Sổ tay.',
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadRows();

    return () => {
      cancelled = true;
    };
  }, [
    scope,
    collection,
    search,
    cefr,
    level,
    dueOnly,
    status,
    reloadKey,
  ]);

  useEffect(() => {
    function refresh() {
      if (
  document.visibilityState === 'visible' &&
  !selectedId &&
  !creating &&
  !readingOpen
) {
  setReloadKey((value) => value + 1);
}
    }

    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);

    const timer = window.setInterval(refresh, 60_000);

    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      window.clearInterval(timer);
    };
  }, [selectedId, creating, readingOpen]);

  function saved(id: string, copied: boolean) {
    setCreating(false);
    setScope('personal');
    setStatus('all');
    setSearch('');
    setCefr('');
    setLevel('');
    setDueOnly(false);
    setSelectedId(id);
    setReloadKey(value => value + 1);
    setNotice(copied ? 'Đã tạo mục mới. Tiến độ của mục cũ được giữ nguyên.' : 'Đã lưu từ.');
  }

  function chooseScope(nextScope: Scope) {
    setScope(nextScope);
    setStatus('all');
    setSelectedId(null);
  }

  return (
    <section aria-labelledby="notebook-title">
      <p className="eyebrow">TỪ VỰNG CỦA BẠN</p>
      <h1 id="notebook-title">Sổ tay</h1>
      <button className="primary-button" type="button" onClick={() => {setCreating(true);setSelectedId(null);setNotice(null);}}>Thêm từ cá nhân</button>
      <button
  className="secondary-button reading-open-button"
  type="button"
  onClick={() => {
    setCreating(false);
    setSelectedId(null);
    setReadingOpen(true);
  }}
>
  Reading — Đọc và lưu từ
</button>

{readingOpen && (
  <ReadingPanel
    onClose={() => setReadingOpen(false)}
    onSaved={() => {
      setNotice('Đã lưu từ/ngữ cảnh từ Reading.');
      setReloadKey((value) => value + 1);
    }}
  />
)}
      {notice && <p className="study-notice is-success" role="status">{notice}</p>}
      {creating && <PersonalEntryEditor initial={null} onSaved={saved} onCancel={() => setCreating(false)}/>}

      <div className="collection-picker" aria-label="Nhóm từ">
        <button
          className={`collection-chip${
            scope === 'learned' ? ' is-selected' : ''
          }`}
          type="button"
          aria-pressed={scope === 'learned'}
          onClick={() => chooseScope('learned')}
        >
          Đã học
        </button>

        <button
          className={`collection-chip${
            scope === 'personal' ? ' is-selected' : ''
          }`}
          type="button"
          aria-pressed={scope === 'personal'}
          onClick={() => chooseScope('personal')}
        >
          Từ của tôi
        </button>
      </div>

      <label className="search-label" htmlFor="notebook-search">
        Tìm từ
      </label>

      <input
        id="notebook-search"
        className="topic-search"
        type="search"
        placeholder="Nhập từ tiếng Anh hoặc nghĩa tiếng Việt…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      <div className="notebook-filters">
        {scope === 'learned' && (
          <label>
            Bộ từ
            <select
              value={collection}
              onChange={(event) =>
                setCollection(
                  event.target.value as CollectionId | 'all',
                )
              }
            >
              <option value="all">Tất cả</option>
              <option value="ielts">IELTS</option>
              <option value="daily">Giao tiếp</option>
              <option value="personal">Từ cá nhân</option>
            </select>
          </label>
        )}

        <label>
          CEFR
          <select
            value={cefr}
            onChange={(event) =>
              setCefr(event.target.value as CefrLevel | '')
            }
          >
            <option value="">Tất cả</option>

            {cefrLevels.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label>
          Level ghi nhớ
          <select
            value={level}
            onChange={(event) => setLevel(event.target.value)}
          >
            <option value="">Tất cả</option>

            {[1, 2, 3, 4, 5].map((value) => (
              <option key={value} value={value}>
                Level {value}
              </option>
            ))}
          </select>
        </label>

        <label className="due-filter">
          <input
            type="checkbox"
            checked={dueOnly}
            onChange={(event) => setDueOnly(event.target.checked)}
          />
          Chỉ từ đến hạn
        </label>
      </div>

      {scope === 'personal' && (
        <div
          className="collection-picker"
          aria-label="Trạng thái từ cá nhân"
        >
          {personalStatuses.map((item) => (
            <button
              key={item.id}
              className={`collection-chip${
                status === item.id ? ' is-selected' : ''
              }`}
              type="button"
              aria-pressed={status === item.id}
              onClick={() => setStatus(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      <div className="notebook-toolbar">
        <p className="topic-message" role="status">
          {loading ? 'Đang tải…' : `${rows.length} từ phù hợp`}
        </p>

        <button
          className="secondary-button"
          type="button"
          disabled={creating || selectedId !== null}
          onClick={() => setReloadKey((value) => value + 1)}
        >
          Làm mới
        </button>
      </div>

      {error && (
        <div className="load-error" role="alert">
          {error}
        </div>
      )}

      {selectedId && (
        <EntryDetails
          key={`${selectedId}-${reloadKey}`}
          entryId={selectedId}
          onClose={() => setSelectedId(null)}
          onSaved={saved}
          onOpenSession={onOpenSession}
        />
      )}

      {!loading && !error && rows.length === 0 && (
        <div className="review-state">
          <h2>Chưa có từ phù hợp</h2>

          <p>
            Bạn có thể đổi bộ lọc hoặc học thêm từ mới.
          </p>

          <button
            className="primary-button"
            type="button"
            onClick={onLearn}
          >
            Học từ mới
          </button>
        </div>
      )}

      {!loading && !error && rows.length > 0 && (
        <ul className="notebook-list">
          {rows.map((row) => (
            <li key={row.entry.id}>
              <button
                className={`notebook-row${
                  selectedId === row.entry.id ? ' is-selected' : ''
                }`}
                type="button"
                onClick={() => setSelectedId(row.entry.id)}
              >
                <span className="notebook-word">
                  <strong>{row.entry.headword}</strong>
                  <span>{row.entry.partOfSpeech}</span>
                  <span>{row.entry.meaningVi || 'Chưa có nghĩa'}</span>
                </span>

                <span className="notebook-meta">
                  <span>
                    CEFR: {row.entry.cefr.level ?? 'Chưa có'}
                    {row.entry.cefr.status === 'estimated'
                      ? ' · tham khảo'
                      : ''}
                  </span>

                  <span>
                    {row.progress
                      ? `Level ${row.progress.level}`
                      : 'Chưa có level'}
                  </span>

                  <span>
                    {statusLabels[row.status] ?? row.status}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}