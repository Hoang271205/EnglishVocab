import { useId } from 'react';
import FormField from '../../components/ui/FormField';
import type { NotebookFilters as Filters } from './notebook.types';
interface Props {
  value: Filters;
  onChange: (next: Filters) => void;
}
export default function NotebookFilters({ value, onChange }: Props) {
  const id = useId();
  function update<K extends keyof Filters>(key: K, next: Filters[K]) {
    onChange({ ...value, [key]: next });
  }
  return (
    <div className="cloud-filters">
      <div className="collection-picker" aria-label="Phạm vi sổ tay">
        {(['learned', 'personal'] as const).map((scope) => (
          <button
            key={scope}
            type="button"
            className={`collection-chip${value.scope === scope ? ' is-selected' : ''}`}
            aria-pressed={value.scope === scope}
            onClick={() => update('scope', scope)}
          >
            {scope === 'learned' ? 'Từ đã học' : 'Từ của tôi'}
          </button>
        ))}
      </div>
      <FormField
        label="Tìm từ"
        value={value.search}
        onChange={(e) => update('search', e.target.value)}
        placeholder="Từ tiếng Anh hoặc nghĩa tiếng Việt…"
      />
      <div className="cloud-filter-grid">
        <label htmlFor={`${id}-cefr`}>
          CEFR
          <select
            id={`${id}-cefr`}
            value={value.cefr}
            onChange={(e) => update('cefr', e.target.value)}
          >
            <option value="">Tất cả</option>
            {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((level) => (
              <option key={level}>{level}</option>
            ))}
          </select>
        </label>
        <label htmlFor={`${id}-level`}>
          Level ghi nhớ
          <select
            id={`${id}-level`}
            value={value.level}
            onChange={(e) => update('level', e.target.value)}
          >
            <option value="">Tất cả</option>
            {[1, 2, 3, 4, 5].map((level) => (
              <option key={level} value={level}>
                Level {level}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor={`${id}-status`}>
          Trạng thái
          <select
            id={`${id}-status`}
            value={value.status}
            onChange={(e) =>
              update('status', e.target.value as Filters['status'])
            }
          >
            <option value="all">Tất cả</option>
            <option value="draft">Chờ bổ sung</option>
            <option value="unlearned">Chưa học</option>
            <option value="reviewing">Đang ôn</option>
            <option value="mastered">Thành thạo</option>
          </select>
        </label>
        <label className="cloud-check">
          <input
            type="checkbox"
            checked={value.dueOnly}
            onChange={(e) => update('dueOnly', e.target.checked)}
          />
          Chỉ từ đến hạn
        </label>
      </div>
    </div>
  );
}
