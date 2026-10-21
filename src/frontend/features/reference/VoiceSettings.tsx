import { useVoiceSettings } from './useVoiceSettings';

export default function VoiceSettings() {
  const model = useVoiceSettings();

  const savedVoiceMissing =
    Boolean(model.voiceURI) &&
    !model.voices.some((voice) => voice.id === model.voiceURI);

  const cannotPlay =
    model.loading ||
    model.working ||
    !model.sample ||
    model.voices.length === 0;

  return (
    <section
      className="voice-settings"
      aria-labelledby="voice-settings-title"
    >
      <h3 id="voice-settings-title">Giọng đọc Anh-Mỹ</h3>

      <p className="topic-message">
        Lựa chọn này áp dụng cho nút nghe từ và câu trong web.
        Từ chưa có IPA vẫn nghe được bằng chữ tiếng Anh đã lưu.
      </p>

      {model.loading && (
        <p role="status">Đang tải giọng đọc…</p>
      )}

      <label className="voice-picker">
        Chọn giọng en-US

        <select
          value={model.voiceURI}
          disabled={model.loading || model.working}
          onChange={(event) =>
            void model.saveVoice(event.target.value)
          }
        >
          <option value="">Tự chọn giọng Mỹ có sẵn</option>

          {savedVoiceMissing && (
            <option value={model.voiceURI} disabled>
              Giọng đã lưu hiện không khả dụng
            </option>
          )}

          {model.voices.map((voice) => (
            <option key={voice.id} value={voice.id}>
              {voice.name}
              {voice.local ? ' · trên máy' : ' · dịch vụ'}
            </option>
          ))}
        </select>
      </label>

      {savedVoiceMissing && !model.loading && (
        <p className="study-notice is-hint">
          Giọng đã lưu không có trên máy hiện tại. Bạn có thể
          chọn giọng khác; khi đọc, hệ thống sẽ dùng một giọng Mỹ
          còn khả dụng.
        </p>
      )}

      {!model.loading && model.voices.length === 0 && (
        <p className="study-notice is-hint" role="status">
          Chưa tìm thấy giọng Anh-Mỹ. Hãy kiểm tra giọng
          English (United States) trên thiết bị rồi tải lại danh sách.
        </p>
      )}

      {model.sample && (
        <div className="voice-preview">
          <p>
            Từ nghe thử: <strong>{model.sample.headword}</strong>
          </p>

          {model.example && (
            <p>
              Câu nghe thử: {model.example.prefix}
              <strong>{model.example.targetSurface}</strong>
              {model.example.suffix}
            </p>
          )}
        </div>
      )}

      <div className="study-answer-actions">
        <button
          className="secondary-button"
          type="button"
          disabled={cannotPlay}
          onClick={() => void model.play()}
        >
          Nghe thử từ
        </button>

        <button
          className="secondary-button"
          type="button"
          disabled={cannotPlay}
          onClick={() => void model.play({ slow: true })}
        >
          Nghe chậm
        </button>

        <button
          className="secondary-button"
          type="button"
          disabled={cannotPlay || !model.example}
          onClick={() => {
            if (model.example) {
              void model.play({
                exampleId: model.example.id,
              });
            }
          }}
        >
          Nghe câu
        </button>

        <button
          className="secondary-button"
          type="button"
          onClick={model.stop}
        >
          Dừng đọc
        </button>

        <button
          className="secondary-button"
          type="button"
          disabled={model.loading || model.working}
          onClick={model.reload}
        >
          Tải lại danh sách
        </button>
      </div>

      {model.notice && (
        <p className="study-notice is-success" role="status">
          {model.notice}
        </p>
      )}

      {model.error && (
        <p className="load-error" role="alert">
          {model.error}
        </p>
      )}

      <p className="draft-status">
        Danh sách phụ thuộc thiết bị và trình duyệt. Nếu máy có
        giọng Google Mỹ thì giọng đó sẽ xuất hiện để chọn.
      </p>
    </section>
  );
}