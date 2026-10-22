import type { CefrLevel, CollectionId } from '../../../domain/types';
import { cefrLevels, personalStatuses } from './constants';
import type { useNotebookPage } from './useNotebookPage';

export default function NotebookFilters({
  model,
}: {
  model: ReturnType<typeof useNotebookPage>;
}) {
  const {
    scope,
    chooseScope,
    search,
    setSearch,
    collection,
    setCollection,
    cefr,
    setCefr,
    level,
    setLevel,
    dueOnly,
    setDueOnly,
    status,
    setStatus,
  } = model;
  return (
    <>
      <div className="collection-picker" aria-label="Nhóm từ">
        <button
          className={`collection-chip${scope === 'learned' ? ' is-selected' : ''}`}
          type="button"
          aria-pressed={scope === 'learned'}
          onClick={() => chooseScope('learned')}
        >
          Đã học
        </button>

        <button
          className={`collection-chip${scope === 'personal' ? ' is-selected' : ''}`}
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
                setCollection(event.target.value as CollectionId | 'all')
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
            onChange={(event) => setCefr(event.target.value as CefrLevel | '')}
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
        <div className="collection-picker" aria-label="Trạng thái từ cá nhân">
          {personalStatuses.map((item) => (
            <button
              key={item.id}
              className={`collection-chip${status === item.id ? ' is-selected' : ''}`}
              type="button"
              aria-pressed={status === item.id}
              onClick={() => setStatus(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
