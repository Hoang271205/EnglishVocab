import { formatTime } from '../../components/format';
import type { useEntryDetails } from './useEntryDetails';

export default function EntrySources({
  model,
}: {
  model: ReturnType<typeof useEntryDetails>;
}) {
  const { data } = model;
  if (!data) return null;
  return (
    <>
      {data.topics.length > 0 && (
        <div className="detail-section">
          <h3>Chủ đề</h3>

          <ul>
            {data.topics.map((topic) => (
              <li key={topic.id}>
                {topic.nameEn} — {topic.nameVi}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.entry.cefr.note && (
        <div className="detail-section">
          <h3>Ghi chú CEFR</h3>
          <p>{data.entry.cefr.note}</p>
        </div>
      )}

      <details className="detail-section">
        <summary>Nguồn dữ liệu</summary>

        {data.entry.provenance.length === 0 ? (
          <p>Chưa có thông tin nguồn.</p>
        ) : (
          data.entry.provenance.map((source, index) => (
            <p key={`${source.field}-${index}`}>
              {source.attribution} · {source.license}
              {source.url && (
                <>
                  {' · '}
                  <a href={source.url} target="_blank" rel="noreferrer">
                    Xem nguồn
                  </a>
                </>
              )}
            </p>
          ))
        )}
      </details>

      <details className="detail-section">
        <summary>Nguồn bài đọc đã lưu ({data.captures.length})</summary>

        {data.captures.length === 0 ? (
          <p>Chưa có ngữ cảnh được lưu cho từ này.</p>
        ) : (
          data.captures.map((capture) => (
            <div className="capture-context" key={capture.id}>
              <p>
                <strong>{capture.selectedText}</strong>
              </p>

              <a href={capture.sourceUrl} target="_blank" rel="noreferrer">
                Mở trang nguồn
              </a>

              <p className="draft-status">
                Đã lưu: {formatTime(capture.capturedAt)}
              </p>
            </div>
          ))
        )}
      </details>
    </>
  );
}
