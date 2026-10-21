import { useRef, useState } from 'react';
import type { CefrLevel, Entry } from '../../../domain/types';
import { backend } from '../../backend';

type Initial = { entry: Entry; note: string; hasProgress: boolean };
type PersonalEntryEditorProps = {
  initial: Initial | null;
  onSaved: (id: string, copied: boolean) => void;
  onCancel: () => void;
};

export default function PersonalEntryEditor({
  initial,
  onSaved,
  onCancel,
}: PersonalEntryEditorProps) {
  const old = initial?.entry;
  const example = old?.examples[0];
  const newId = useRef(crypto.randomUUID());
  const lock = useRef(false);
  const [headword, setHeadword] = useState(old?.headword ?? '');
  const [partOfSpeech, setPartOfSpeech] = useState(old?.partOfSpeech ?? '');
  const [meaningVi, setMeaningVi] = useState(old?.meaningVi ?? '');
  const [ipa, setIpa] = useState(old?.pronunciation.ipa ?? '');
  const [cefr, setCefr] = useState<CefrLevel | ''>(old?.cefr.level ?? '');
  const [sentence, setSentence] = useState(
    example ? example.prefix + example.targetSurface + example.suffix : '',
  );
  const [target, setTarget] = useState(example?.targetSurface ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [newSense, setNewSense] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(ready: boolean) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await backend.personal.saveManual({
        ...(old ? { entryId: old.id, revision: old.revision } : {}),
        newId: newId.current,
        headword,
        partOfSpeech,
        meaningVi,
        ipa,
        cefr: cefr || null,
        exampleSentence: sentence,
        targetSurface: target,
        note,
        ready,
        newSense,
      });
      onSaved(result.entry.id, result.copied);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Không lưu được từ.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

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
