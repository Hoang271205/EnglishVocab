import LookupPopup from './LookupPopup';
import type { ReadingPanelProps } from './types';
import { useReadingPanel } from './useReadingPanel';

export default function ReadingPanel(props: ReadingPanelProps) {
  const { onClose, onSaved } = props;
  const {
    sourceInput,
    setSourceInput,
    draft,
    setDraft,
    openReading,
    error,
    text,
    article,
    captureSelection,
    selection,
    popupOpen,
    iconPosition,
    setPopupOpen,
    closePopup,
  } = useReadingPanel();
  return (
    <section className="reading-panel" aria-labelledby="reading-title">
      <div className="entry-details-header">
        <h2 id="reading-title">Reading</h2>

        <button className="secondary-button" type="button" onClick={onClose}>
          Đóng Reading
        </button>
      </div>

      <p className="topic-message">
        Dán bài đọc, bấm Mở bài đọc rồi bôi đen từ cần tra.
      </p>

      <label className="lookup-label">
        Nguồn bài đọc, nếu có
        <input
          type="url"
          value={sourceInput}
          placeholder="https://..."
          onChange={(event) => setSourceInput(event.target.value)}
        />
      </label>

      <label className="lookup-label">
        Nội dung tiếng Anh
        <textarea
          className="reading-editor"
          value={draft}
          maxLength={20000}
          onChange={(event) => setDraft(event.target.value)}
        />
      </label>

      <button
        className="primary-button"
        type="button"
        disabled={!draft.trim()}
        onClick={openReading}
      >
        Mở bài đọc
      </button>

      {error && (
        <p className="load-error" role="alert">
          {error}
        </p>
      )}

      {text && (
        <div
          ref={article}
          className="reading-article"
          tabIndex={0}
          aria-label="Bài đọc tiếng Anh"
          onPointerUp={() => {
            window.setTimeout(captureSelection, 0);
          }}
          onKeyUp={(event) => {
            if (
              [
                'Shift',
                'ArrowLeft',
                'ArrowRight',
                'ArrowUp',
                'ArrowDown',
              ].includes(event.key)
            ) {
              captureSelection();
            }
          }}
        >
          {text}
        </div>
      )}

      {selection && !popupOpen && (
        <button
          className="reading-lookup-trigger"
          type="button"
          style={{
            left: iconPosition.left,
            top: iconPosition.top,
          }}
          aria-label={`Tra từ ${selection.word}`}
          title={`Tra từ ${selection.word}`}
          onPointerDown={(event) => {
            // Giữ vùng bôi đen khi bấm icon bằng chuột.
            if (event.pointerType === 'mouse') {
              event.preventDefault();
            }
          }}
          onClick={() => setPopupOpen(true)}
        >
          <span aria-hidden="true">🔍</span>
        </button>
      )}

      {selection && popupOpen && (
        <LookupPopup
          key={selection.id}
          selection={selection}
          onClose={closePopup}
          onSaved={onSaved}
        />
      )}
    </section>
  );
}
