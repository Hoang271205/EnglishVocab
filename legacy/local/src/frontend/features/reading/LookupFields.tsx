import type { useLookupPopup } from './useLookupPopup';

export default function LookupFields({
  model,
}: {
  model: ReturnType<typeof useLookupPopup>;
}) {
  const {
    result,
    senseIndex,
    saving,
    saved,
    chooseSense,
    sense,
    selectedLocal,
    localError,
    ipa,
    partOfSpeech,
    loading,
    setPartOfSpeech,
    meaningVi,
    setMeaningVi,
  } = model;
  return (
    <>
      {result && (
        <p className="draft-status">
          Nguồn tra:{' '}
          {result.source === 'local'
            ? 'Thư viện trên thiết bị'
            : result.source === 'cache'
              ? 'Bộ nhớ tra cứu'
              : (result.provider?.name ?? 'Từ điển trực tuyến')}
        </p>
      )}

      {result && result.senses.length > 0 && (
        <label className="lookup-label">
          Chọn nghĩa
          <select
            value={senseIndex}
            disabled={saving || Boolean(saved)}
            onChange={(event) => chooseSense(Number(event.target.value))}
          >
            {result.senses.map((item, index) => (
              <option key={index} value={index}>
                {item.partOfSpeech} — {item.definition.slice(0, 110)}
              </option>
            ))}
          </select>
        </label>
      )}

      {sense && (
        <div className="lookup-definition">
          <strong>
            {sense.entryId ? 'Nghĩa đã lưu' : 'Định nghĩa tiếng Anh'}
          </strong>
          <p>{sense.definition}</p>
        </div>
      )}

      {sense?.entryId && !selectedLocal && !localError && (
        <p role="status">Đang đọc thông tin từ đã lưu…</p>
      )}

      {localError && (
        <p className="load-error" role="alert">
          {localError}
        </p>
      )}

      <p>IPA Mỹ: {ipa ?? 'Chưa có phiên âm Mỹ rõ nguồn'}</p>

      <p>
        CEFR: {selectedLocal?.entry.cefr.level ?? 'Chưa có'}
        {selectedLocal?.entry.cefr.status === 'estimated' ? ' · tham khảo' : ''}
      </p>

      <label className="lookup-label">
        Từ loại
        <input
          value={
            selectedLocal ? selectedLocal.entry.partOfSpeech : partOfSpeech
          }
          readOnly={Boolean(sense?.entryId)}
          disabled={loading || saving || Boolean(saved)}
          onChange={(event) => setPartOfSpeech(event.target.value)}
          maxLength={100}
        />
      </label>

      <label className="lookup-label">
        Nghĩa tiếng Việt
        <textarea
          value={selectedLocal ? selectedLocal.entry.meaningVi : meaningVi}
          readOnly={Boolean(sense?.entryId)}
          disabled={loading || saving || Boolean(saved)}
          placeholder="Có thể để trống và bổ sung trong Sổ tay."
          maxLength={10000}
          onChange={(event) => setMeaningVi(event.target.value)}
        />
      </label>

      {sense?.example && (
        <div className="study-example">
          <strong>Ví dụ từ điển</strong>
          <p>{sense.example}</p>
        </div>
      )}
    </>
  );
}
