import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Entry } from '../../../domain/types';
import Button from '../../components/ui/Button';
import FormField from '../../components/ui/FormField';
import StatusMessage from '../../components/ui/StatusMessage';
import { editorValues, buildEditorEntry } from './entryEditor';
import type { EditorValues } from './entryEditor';
interface Props {
  entry?: Entry;
  learned?: boolean;
  busy: boolean;
  onSave: (entry: Entry) => Promise<void>;
  onCancel: () => void;
}
export default function PersonalEntryEditor({
  entry,
  learned,
  busy,
  onSave,
  onCancel,
}: Props) {
  const [value, setValue] = useState(() => editorValues(entry));
  const [error, setError] = useState<string | null>(null);
  function update<K extends keyof EditorValues>(key: K, next: EditorValues[K]) {
    setValue((current) => ({ ...current, [key]: next }));
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await onSave(buildEditorEntry(value, entry));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không lưu được từ.');
    }
  }
  return (
    <section className="cloud-panel">
      <h2>{entry ? 'Chỉnh sửa từ cá nhân' : 'Thêm từ cá nhân'}</h2>
      <p>
        {entry
          ? 'Chỉnh sửa trực tiếp từ này; level ghi nhớ và lịch ôn được giữ nguyên.'
          : 'Nhập thông tin cho từ cá nhân mới.'}
      </p>
      <form onSubmit={(event) => void submit(event)}>
        <fieldset disabled={busy} className="cloud-form">
          <FormField
            label="Từ tiếng Anh"
            value={value.headword}
            required
            maxLength={500}
            onChange={(e) => update('headword', e.target.value)}
          />
          <FormField
            label="Từ loại"
            value={value.partOfSpeech}
            maxLength={100}
            placeholder="noun, verb, adjective…"
            onChange={(e) => update('partOfSpeech', e.target.value)}
          />
          <label>
            Nghĩa tiếng Việt
            <textarea
              value={value.meaningVi}
              maxLength={10000}
              onChange={(e) => update('meaningVi', e.target.value)}
            />
          </label>
          <div className="cloud-filter-grid">
            <FormField
              label="IPA Mỹ (tuỳ chọn)"
              value={value.ipa}
              maxLength={500}
              onChange={(e) => update('ipa', e.target.value)}
            />
            <label>
              CEFR tham khảo
              <select
                value={value.cefr}
                onChange={(e) => update('cefr', e.target.value)}
              >
                <option value="">Chưa xác định</option>
                {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((level) => (
                  <option key={level}>{level}</option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Câu ví dụ
            <textarea
              value={value.example}
              maxLength={10000}
              onChange={(e) => update('example', e.target.value)}
            />
          </label>
          <FormField
            label="Dạng từ trong câu (để trống nếu giống từ tiếng Anh)"
            value={value.target}
            onChange={(e) => update('target', e.target.value)}
          />
          <label>
            Đáp án viết lại được chấp nhận thêm (mỗi dòng một đáp án)
            <textarea
              value={value.answers}
              onChange={(e) => update('answers', e.target.value)}
            />
          </label>
          <label className="cloud-check">
            <input
              type="checkbox"
              checked={value.ready}
              disabled={learned}
              onChange={(e) => update('ready', e.target.checked)}
            />
            Sẵn sàng học
          </label>
          <p>
            Bỏ chọn để lưu nháp. Từ đã học cần tiếp tục ở trạng thái sẵn sàng.
          </p>
          {error && <StatusMessage tone="error">{error}</StatusMessage>}
          <div className="cloud-actions">
            <Button type="submit" loading={busy}>
              Lưu từ
            </Button>
            <Button variant="secondary" onClick={onCancel}>
              Huỷ
            </Button>
          </div>
        </fieldset>
      </form>
    </section>
  );
}
