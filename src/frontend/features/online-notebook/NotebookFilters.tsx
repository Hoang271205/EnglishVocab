import { useId, useRef } from 'react';
import Icon from '../../components/ui/Icon';
import NotebookSelect from './NotebookSelect';
import type { NotebookFilters as Filters } from './notebook.types';
interface Props {
  value: Filters;
  onChange: (next: Filters) => void;
}
const cefrOptions = [
  { value: '', label: 'Mọi trình độ' },
  ...['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((level) => ({
    value: level,
    label: level,
  })),
];
const levelOptions = [
  { value: '', label: 'Mọi mức ghi nhớ' },
  ...[1, 2, 3, 4, 5].map((level) => ({
    value: String(level),
    label: `Level ${level}`,
  })),
];
const statusOptions = [
  { value: 'all', label: 'Mọi trạng thái' },
  { value: 'draft', label: 'Chờ bổ sung' },
  { value: 'unlearned', label: 'Chưa học' },
  { value: 'reviewing', label: 'Đang ôn' },
  { value: 'mastered', label: 'Thành thạo' },
];
export default function NotebookFilters({ value, onChange }: Props) {
  const id = useId();
  const search = useRef<HTMLInputElement>(null);
  function update<K extends keyof Filters>(key: K, next: Filters[K]) {
    onChange({ ...value, [key]: next });
  }
  return (
    <div className="cloud-filters notebook-controls">
      <div
        className="collection-picker notebook-scope-picker"
        role="group"
        aria-label="Phạm vi sổ tay"
      >
        {(['learned', 'personal'] as const).map((scope) => (
          <button
            key={scope}
            type="button"
            className={`collection-chip${value.scope === scope ? ' is-selected' : ''}`}
            aria-pressed={value.scope === scope}
            onClick={() => update('scope', scope)}
          >
            <Icon name={scope === 'learned' ? 'notebook' : 'user'} />
            {scope === 'learned' ? 'Từ đã học' : 'Từ của tôi'}
          </button>
        ))}
      </div>
      <div className="notebook-search">
        <label className="notebook-control-label" htmlFor={`${id}-search`}>
          Tìm trong sổ tay
        </label>
        <div className="notebook-search-control">
          <Icon name="search" />
          <input
            id={`${id}-search`}
            ref={search}
            type="search"
            value={value.search}
            onChange={(event) => update('search', event.target.value)}
            placeholder="Từ tiếng Anh hoặc nghĩa tiếng Việt…"
            autoComplete="off"
          />
          {value.search && (
            <button
              type="button"
              className="notebook-search-clear"
              aria-label="Xoá từ khoá tìm kiếm"
              onClick={() => {
                update('search', '');
                search.current?.focus();
              }}
            >
              <Icon name="close" />
            </button>
          )}
        </div>
      </div>
      <div className="cloud-filter-grid notebook-filter-grid">
        <NotebookSelect
          label="Trình độ CEFR"
          value={value.cefr}
          options={cefrOptions}
          onChange={(next) => update('cefr', next)}
        />
        <NotebookSelect
          label="Level ghi nhớ"
          value={value.level}
          options={levelOptions}
          onChange={(next) => update('level', next)}
        />
        <NotebookSelect
          label="Trạng thái"
          value={value.status}
          options={statusOptions}
          onChange={(next) => update('status', next as Filters['status'])}
        />
        <label
          className={`notebook-due-toggle${value.dueOnly ? ' is-active' : ''}`}
        >
          <Icon name="clock" />
          <span>Chỉ từ đến hạn</span>
          <input
            type="checkbox"
            role="switch"
            checked={value.dueOnly}
            onChange={(event) => update('dueOnly', event.target.checked)}
          />
        </label>
      </div>
    </div>
  );
}
