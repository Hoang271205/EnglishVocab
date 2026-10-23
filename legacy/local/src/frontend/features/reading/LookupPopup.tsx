import LookupFields from './LookupFields';
import type { LookupPopupProps } from './types';
import { useLookupPopup } from './useLookupPopup';

export default function LookupPopup(props: LookupPopupProps) {
  const { selection, onClose } = props;
  const model = useLookupPopup(props);
  const {
    panel,
    position,
    saving,
    loading,
    lookupError,
    saved,
    sense,
    selectedLocal,
    saveError,
    saveWord,
  } = model;
  return (
    <div
      ref={panel}
      className="lookup-popup"
      role="dialog"
      aria-modal="false"
      aria-label={'Tra từ ' + selection.word}
      style={position}
    >
      <div className="entry-details-header">
        <strong>{selection.word}</strong>

        <button
          className="close-selection"
          type="button"
          disabled={saving}
          aria-label="Đóng popup tra từ"
          onClick={onClose}
        >
          ×
        </button>
      </div>

      {loading && <p role="status">Đang tra từ…</p>}

      {lookupError && (
        <p className="study-notice is-hint" role="status">
          {lookupError} Bạn vẫn có thể lưu từ dưới dạng nháp.
        </p>
      )}

      <LookupFields model={model} />
      {sense && (
        <details className="detail-section">
          <summary>Nguồn và giấy phép</summary>

          {sense.sourceUrls.map((url) => (
            <p key={url}>
              <a href={url} target="_blank" rel="noreferrer">
                {url}
              </a>
            </p>
          ))}

          {sense.licenses.map((license, index) => (
            <p key={index}>{license.name}</p>
          ))}
        </details>
      )}

      {!sense?.entryId && (
        <p className="draft-status">
          Thiếu nghĩa Việt, từ loại hoặc ví dụ phù hợp sẽ được lưu vào Chờ bổ
          sung. IPA và CEFR không bắt buộc.
        </p>
      )}

      {saveError && (
        <p className="load-error" role="alert">
          {saveError}
        </p>
      )}

      {saved ? (
        <p className="study-notice is-success" role="status">
          {saved}
        </p>
      ) : (
        <button
          className="primary-button study-next"
          type="button"
          disabled={
            loading || saving || Boolean(sense?.entryId && !selectedLocal)
          }
          onClick={() => void saveWord()}
        >
          {saving ? 'Đang lưu…' : 'Lưu từ'}
        </button>
      )}
    </div>
  );
}
