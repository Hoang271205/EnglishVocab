import { useRef, useState } from 'react';
import { backend } from '../../backend';

type ReviewToggleProps = {
  entryId: string;
  headword: string;
  enabled: boolean;
  disabled: boolean;
  onChanged: (enabled: boolean) => void;
};

export default function ReviewToggle({
  entryId,
  headword,
  enabled,
  disabled,
  onChanged,
}: ReviewToggleProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);

  async function change(nextEnabled: boolean) {
    if (lock.current) return;

    lock.current = true;
    setSaving(true);
    setError(null);

    try {
      await backend.queries.setReviewEnabled(entryId, nextEnabled);
      onChanged(nextEnabled);
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Không lưu được lựa chọn ôn tập.',
      );
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }

  return (
    <div className="review-toggle">
      <label>
        <input
          type="checkbox"
          checked={enabled}
          disabled={disabled || saving}
          aria-label={`Ôn tập từ ${headword}`}
          onChange={(event) => void change(event.target.checked)}
        />
        <span>{saving ? 'Đang lưu…' : 'Ôn tập'}</span>
      </label>

      {error && (
        <p className="review-toggle-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}