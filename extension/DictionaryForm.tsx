import MascotImage from './MascotImage';
import type { SelectedWord } from './SelectionPopup';
import { useCaptureLookup } from './useCaptureLookup';

type DictionaryFormProps = {
  selection: SelectedWord;
  onClose: () => void;
};

export default function DictionaryForm({
  selection,
  onClose,
}: DictionaryFormProps) {
  const model = useCaptureLookup(selection);

  return (
    <form
      className="dictionary-form"
      onSubmit={(event) => {
        event.preventDefault();
        void model.save();
      }}
    >
      <div className="dictionary-body">
        <p className="extension-tip">
          <MascotImage />
          <span>
            {model.saved
              ? 'Đã lưu rồi! Mình cùng ôn lại từ này sau nhé.'
              : model.saving
                ? 'Mình đang lưu từ vào sổ tay của bạn…'
                : model.saveError
                  ? 'Chưa lưu được. Xem thông báo bên dưới rồi thử lại nhé!'
                  : model.loading
                    ? 'Mình đang tra nghĩa của từ này…'
                    : 'Kiểm tra nghĩa và ví dụ rồi lưu nhé!'}
          </span>
        </p>
        {model.loading && <p role="status">Đang tra từ…</p>}

        {model.lookupError && (
          <p className="message" role="status">
            {model.lookupError} Bạn cần bổ sung đủ thông tin bên dưới trước khi
            lưu.
          </p>
        )}

        {model.result && (
          <p className="label">
            Nguồn tra:{' '}
            {model.result.source === 'local'
              ? 'Thư viện đã đồng bộ'
              : model.result.source === 'cache'
                ? 'Bộ nhớ tra cứu'
                : (model.result.provider?.name ?? 'Từ điển trực tuyến')}
          </p>
        )}

        <fieldset disabled={model.locked}>
          {Boolean(model.result?.senses.length) && (
            <label>
              Chọn nghĩa
              <select
                value={model.senseIndex}
                onChange={(event) =>
                  model.chooseSense(Number(event.target.value))
                }
              >
                {model.result?.senses.map((sense, index) => (
                  <option key={index} value={index}>
                    {sense.partOfSpeech} — {sense.definition.slice(0, 110)}
                  </option>
                ))}
              </select>
            </label>
          )}

          {model.sense && (
            <div>
              <strong>
                {model.localEntry ? 'Nghĩa đã lưu' : 'Định nghĩa tiếng Anh'}
              </strong>
              <p>{model.sense.definition}</p>
            </div>
          )}

          <p>IPA Mỹ: {model.ipa ?? 'Chưa có phiên âm Mỹ rõ nguồn'}</p>

          <p>
            CEFR: {model.localEntry?.cefr.level ?? 'Chưa có'}
            {model.localEntry?.cefr.status === 'estimated'
              ? ' · tham khảo'
              : ''}
          </p>

          <label>
            Từ loại
            <input
              value={model.localEntry?.partOfSpeech ?? model.partOfSpeech}
              readOnly={Boolean(model.sense?.entryId)}
              maxLength={100}
              onChange={(event) => model.setPartOfSpeech(event.target.value)}
            />
          </label>

          <label>
            Nghĩa tiếng Việt
            <textarea
              value={model.localEntry?.meaningVi ?? model.meaningVi}
              readOnly={Boolean(model.sense?.entryId)}
              maxLength={10_000}
              placeholder="Nhập nghĩa tiếng Việt phù hợp với nghĩa đang chọn."
              onChange={(event) => model.setMeaningVi(event.target.value)}
            />
          </label>

          {model.translating && (
            <p className="label" role="status">
              Đang dịch nghĩa đang chọn…
            </p>
          )}

          {model.translationSuggested && (
            <p className="label">
              Dịch tham khảo — MyMemory. Bạn có thể sửa trước khi lưu.
            </p>
          )}

          {model.translationError && (
            <p className="message" role="status">
              {model.translationError}
            </p>
          )}

          {model.localEntry?.examples.map((example) => (
            <p key={example.id}>
              {example.prefix}
              {example.targetSurface}
              {example.suffix}
            </p>
          ))}
          {!model.localEntry && (
            <label>
              Câu ví dụ
              <textarea
                value={model.exampleText}
                maxLength={10_000}
                placeholder="Nhập câu ví dụ chứa đúng một lần từ đang tra."
                onChange={(event) => model.setExampleText(event.target.value)}
              />
            </label>
          )}
        </fieldset>

        {model.sense && (
          <details>
            <summary>Nguồn và giấy phép</summary>

            {model.sense.sourceUrls.map((url) => (
              <p key={url}>
                <a href={url} target="_blank" rel="noreferrer">
                  {url}
                </a>
              </p>
            ))}

            {model.sense.licenses.map((license, index) => (
              <p key={index}>{license.name}</p>
            ))}
          </details>
        )}

        {!model.localEntry && (
          <p className="label">
            Cần nghĩa tiếng Việt, từ loại và câu ví dụ chứa đúng một lần từ đang
            tra. Lưu thành công sẽ thêm vào Từ đã học ở level 1. IPA và CEFR có
            thể để trống.
          </p>
        )}
      </div>
      <footer className="dictionary-footer">
        {model.saveError && (
          <p className="message" role="alert">
            {model.saveError}{' '}
            {model.locked ? 'Bấm Thử lưu lại để gửi lại cùng lượt lưu.' : ''}
          </p>
        )}

        {model.saved ? (
          <p className="message" role="status">
            {model.saved}
          </p>
        ) : (
          <button
            className="save-word"
            type="submit"
            disabled={
              (!model.complete && !model.locked) ||
              model.loading ||
              model.translating ||
              model.saving ||
              Boolean(model.sense?.entryId && !model.localEntry)
            }
          >
            {model.saving
              ? 'Đang lưu…'
              : model.saveError
                ? 'Thử lưu lại'
                : 'Lưu vào sổ tay'}
          </button>
        )}

        <button className="cancel-word" type="button" onClick={onClose}>
          {model.saved ? 'Đóng' : 'Hủy'}
        </button>
      </footer>
      <p className="label connection-note">
        Lưu trực tiếp lên tài khoản trên server. Cần có mạng và đã kết nối
        extension; không tạo hàng đợi offline.
      </p>
    </form>
  );
}
