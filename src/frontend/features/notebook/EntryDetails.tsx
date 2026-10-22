import EntryExamples from './EntryExamples';
import EntrySources from './EntrySources';
import { formatTime } from '../../components/format';
import { backend } from '../../backend';
import PersonalEntryEditor from './PersonalEntryEditor';
import type { EntryDetailsProps } from './types';
import { useEntryDetails } from './useEntryDetails';

export default function EntryDetails(props: EntryDetailsProps) {
  const { onClose, onSaved } = props;
  const model = useEntryDetails(props);
  const {
    editing,
    data,
    setEditing,
    error,
    setReloadKey,
    working,
    audioTurn,
    startLearning,
  } = model;
  if (editing && data) {
    return (
      <PersonalEntryEditor
        initial={{
          entry: data.entry,
          note: data.note,
          hasProgress: data.progress !== null,
        }}
        onCancel={() => setEditing(false)}
        onSaved={onSaved}
      />
    );
  }
  return (
    <section className="entry-details" aria-labelledby="entry-details-title">
      <div className="entry-details-header">
        <h2 id="entry-details-title">Chi tiết từ</h2>

        <button
          className="close-selection"
          type="button"
          aria-label="Đóng chi tiết từ"
          onClick={onClose}
        >
          ×
        </button>
      </div>

      {error && (
        <div className="load-error" role="alert">
          <p>{error}</p>

          <button
            className="secondary-button"
            type="button"
            onClick={() => setReloadKey((value) => value + 1)}
          >
            Thử lại
          </button>
        </div>
      )}

      {!data && !error && <p role="status">Đang tải chi tiết…</p>}

      {data && (
        <>
          {data.entry.collectionId === 'personal' && (
            <div className="study-answer-actions">
              <button
                className="secondary-button"
                type="button"
                disabled={working}
                onClick={() => {
                  audioTurn.current++;
                  backend.audio.stop();
                  setEditing(true);
                }}
              >
                Chỉnh sửa
              </button>
              {data.entry.contentStatus === 'ready' && !data.progress && (
                <button
                  className="primary-button"
                  type="button"
                  disabled={working}
                  onClick={() => void startLearning()}
                >
                  {working ? 'Đang mở…' : 'Học từ này / tiếp tục phiên dở'}
                </button>
              )}
            </div>
          )}
          {data.note && (
            <div className="detail-section">
              <h3>Ghi chú cá nhân</h3>
              <p className="personal-note">{data.note}</p>
            </div>
          )}
          <p className="word-type">
            {data.entry.partOfSpeech || 'Chưa có từ loại'}
          </p>

          <h3 className="study-word">{data.entry.headword}</h3>

          <p className="study-meaning">
            {data.entry.meaningVi || 'Chưa bổ sung nghĩa tiếng Việt'}
          </p>

          <p className="study-ipa">
            IPA: {data.entry.pronunciation.ipa ?? 'Chưa có'}
          </p>

          <p>
            CEFR: <strong>{data.entry.cefr.level ?? 'Chưa có'}</strong>
            {data.entry.cefr.status === 'estimated' ? ' · tham khảo' : ''}
          </p>

          {data.progress ? (
            <div className="review-result">
              <p>
                Level ghi nhớ: <strong>{data.progress.level}</strong>
              </p>

              <p>
                Lần ôn tiếp theo:{' '}
                <strong>{formatTime(data.progress.nextReviewAt)}</strong>
              </p>

              <p>
                Số lần đúng: {data.progress.correctCount}
                {' · '}
                Số lần sai: {data.progress.wrongCount}
              </p>
            </div>
          ) : (
            <p className="topic-message">
              Từ này chưa được học nên chưa có level ghi nhớ.
            </p>
          )}

          {data.entry.contentStatus === 'draft' && (
            <p className="study-notice is-hint">
              Từ đang chờ bổ sung thông tin trước khi đưa vào bài học.
            </p>
          )}

          <EntryExamples model={model} />
          <EntrySources model={model} />
        </>
      )}
    </section>
  );
}
