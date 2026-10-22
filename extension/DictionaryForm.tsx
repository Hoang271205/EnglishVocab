import type { SelectedWord } from './SelectionPopup';
import { useCaptureLookup } from './useCaptureLookup';
import QueueExportButton from './QueueExportButton';

type DictionaryFormProps = {
  selection: SelectedWord;
};

export default function DictionaryForm({
  selection,
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
      {model.loading && <p role="status">Đang tra từ…</p>}

      {model.lookupError && (
        <p className="message" role="status">
          {model.lookupError} Bạn vẫn có thể nhập và lưu bản nháp.
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
            placeholder="Có thể để trống và bổ sung sau."
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

        {model.sense?.example && (
          <div>
            <strong>Ví dụ từ điển</strong>
            <p className="context">{model.sense.example}</p>
          </div>
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
          Thiếu nghĩa tiếng Việt, từ loại hoặc ví dụ phù hợp thì lưu thành bản
          nháp. IPA và CEFR có thể để trống.
        </p>
      )}

      {model.saveError && (
        <p className="message" role="alert">
          {model.saveError}{' '}
          {model.locked
            ? 'Bấm Thử lưu lại để gửi lại cùng lượt lưu.'
            : ''}
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
              : 'Lưu từ'}
        </button>
      )}

      <QueueExportButton disabled={model.saving} />
    </form>
  );
}