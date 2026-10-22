import type { CefrLevel } from '../../../domain/types';
import type { PersonalEntryEditorProps } from './types';
import { usePersonalEntryEditor } from './usePersonalEntryEditor';

export default function PersonalEntryEditor(props: PersonalEntryEditorProps) {
  const { initial, onCancel } = props;
  const {
    old,
    save,
    busy,
    headword,
    setHeadword,
    partOfSpeech,
    setPartOfSpeech,
    meaningVi,
    setMeaningVi,
    ipa,
    setIpa,
    cefr,
    setCefr,
    sentence,
    setSentence,
    target,
    setTarget,
    note,
    setNote,
    newSense,
    setNewSense,
    error,
  } = usePersonalEntryEditor(props);
  return (
    <section className="entry-details" aria-labelledby="personal-editor-title">
      <h2 id="personal-editor-title">
        {old ? 'Chỉnh từ cá nhân' : 'Thêm từ cá nhân'}
      </h2>
      <p className="topic-message">
        IPA và CEFR có thể để trống. Để đưa vào bài học, cần nghĩa, từ loại và
        câu ví dụ.
      </p>
      <form
        className="personal-editor"
        onSubmit={(event) => {
          event.preventDefault();
          void save(true);
        }}
      >
        <fieldset disabled={busy}>
          <label>
            Từ hoặc cụm từ tiếng Anh
            <input
              required
              maxLength={500}
              value={headword}
              onChange={(e) => setHeadword(e.target.value)}
            />
          </label>
          <label>
            Từ loại
            <input
              maxLength={100}
              placeholder="Ví dụ: n., v., adj., phrase"
              value={partOfSpeech}
              onChange={(e) => setPartOfSpeech(e.target.value)}
            />
          </label>
          <label>
            Nghĩa tiếng Việt
            <textarea
              maxLength={10000}
              value={meaningVi}
              onChange={(e) => setMeaningVi(e.target.value)}
            />
          </label>
          <label>
            IPA Mỹ, nếu biết
            <input
              maxLength={500}
              value={ipa}
              onChange={(e) => setIpa(e.target.value)}
            />
          </label>
          <label>
            CEFR tham khảo
            <select
              value={cefr}
              onChange={(e) => setCefr(e.target.value as CefrLevel | '')}
            >
              <option value="">Chưa rõ</option>
              {(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const).map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            Câu ví dụ tiếng Anh
            <textarea
              maxLength={10000}
              placeholder="My favorite hobby is reading."
              value={sentence}
              onChange={(e) => setSentence(e.target.value)}
            />
          </label>
          <label>
            Từ/cụm từ xuất hiện trong câu
            <input
              maxLength={500}
              placeholder="hobby"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
          </label>
          <p className="draft-status">
            Nhập đúng phần cần khuyết trong câu, kể cả chữ hoa/thường. Nếu có
            nhiều lần xuất hiện, lần đầu được dùng.
          </p>
          <label>
            Ghi chú cá nhân
            <textarea
              maxLength={10000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          {old && (
            <label className="due-filter">
              <input
                type="checkbox"
                checked={newSense}
                onChange={(e) => setNewSense(e.target.checked)}
              />{' '}
              Lưu thành một nghĩa mới
            </label>
          )}
          {old && (
            <p className="draft-status">
              Đổi từ, từ loại đã có hoặc nghĩa đã có sẽ tạo mục mới; lịch học
              của mục cũ được giữ nguyên.
            </p>
          )}
          {error && (
            <p className="load-error" role="alert">
              {error}
            </p>
          )}
          <div className="study-answer-actions">
            <button className="primary-button" type="submit">
              {busy ? 'Đang lưu…' : 'Lưu để học'}
            </button>
            {(!initial?.hasProgress || newSense) && (
              <button
                className="secondary-button"
                type="button"
                onClick={() => void save(false)}
              >
                Lưu bản nháp
              </button>
            )}
            <button
              className="secondary-button"
              type="button"
              onClick={onCancel}
            >
              Hủy
            </button>
          </div>
        </fieldset>
      </form>
    </section>
  );
}
