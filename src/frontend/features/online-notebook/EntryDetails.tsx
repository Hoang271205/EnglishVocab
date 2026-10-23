import Icon from '../../components/ui/Icon';
import { useCallback } from 'react';
import Button from '../../components/ui/Button';
import StatusMessage from '../../components/ui/StatusMessage';
import { apiRequest } from '../../api/client';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { useAmericanSpeech } from '../../hooks/useAmericanSpeech';
import type { NotebookRow } from './notebook.types';
interface SourceLink {
  captureId: string;
  sourceUrl: string;
  capturedAt: number;
}
interface Props {
  row: NotebookRow;
  voiceURI: string | null;
  onEdit: () => void;
  onClose: () => void;
}
function safeLink(value: string) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}
export default function EntryDetails({
  row,
  voiceURI,
  onEdit,
  onClose,
}: Props) {
  const { entry, progress } = row;
  const speech = useAmericanSpeech(voiceURI);
  const load = useCallback(
    async (signal: AbortSignal) =>
      (
        await apiRequest<{ sources: SourceLink[] }>(
          `/api/transfers/sources/${encodeURIComponent(entry.id)}`,
          { signal },
        )
      ).sources,
    [entry.id],
  );
  const sources = useAsyncResource(load);
  return (
    <section
      className="cloud-entry-details"
      aria-label={`Chi tiết ${entry.headword}`}
    >
      <div className="cloud-toolbar">
        <h3>Chi tiết từ</h3>
        <Button
          variant="secondary"
          onClick={onClose}
          aria-label="Đóng chi tiết"
        >
          <Icon name="close" />
        </Button>
      </div>
      <p>{entry.partOfSpeech || 'Chưa có từ loại'}</p>
      <h2>{entry.headword}</h2>
      <p>
        <strong>{entry.meaningVi || 'Chưa có nghĩa tiếng Việt'}</strong>
      </p>
      <p>
        IPA Mỹ: {entry.pronunciation.ipa || 'Chưa có'} · CEFR:{' '}
        {entry.cefr.level || 'Chưa có'}{' '}
        {entry.cefr.status === 'estimated' ? '(ước lượng)' : ''}
      </p>
      {progress ? (
        <div className="cloud-inset">
          <p>
            Level ghi nhớ: <strong>{progress.level}</strong>
          </p>
          <p>
            Lần ôn tiếp theo:{' '}
            {new Date(progress.nextReviewAt).toLocaleString('vi-VN')}
          </p>
          <p>
            Đúng: {progress.correctCount} · Sai: {progress.wrongCount} ·{' '}
            {row.reviewEnabled ? 'Đang bật ôn tập' : 'Đã tắt ôn tập'}
          </p>
        </div>
      ) : (
        <p>
          {row.known
            ? 'Đã đánh dấu biết từ này. Không tạo level hoặc lịch ôn.'
            : 'Từ này chưa được học nên chưa có level ghi nhớ.'}
        </p>
      )}
      {!progress && !row.known && entry.collectionId !== 'personal' && (
        <StatusMessage>
          Từ đã được lưu từ thư viện chung. Bạn có thể học từ này trong mục Học
          từ mới.
        </StatusMessage>
      )}
      {entry.contentStatus === 'draft' && (
        <StatusMessage>
          Từ đang chờ bổ sung nghĩa, từ loại hoặc ví dụ trước khi học.
        </StatusMessage>
      )}
      <div className="cloud-actions">
        <Button
          icon="volume"
          variant="secondary"
          onClick={() => speech.speak(entry.headword)}
        >
          Nghe từ · Mỹ
        </Button>
        <Button
          icon="slow"
          variant="secondary"
          onClick={() => speech.speak(entry.headword, true)}
        >
          Nghe chậm
        </Button>
        {entry.collectionId === 'personal' && (
          <Button variant="secondary" onClick={onEdit}>
            Chỉnh sửa
          </Button>
        )}
      </div>
      {speech.error && (
        <StatusMessage tone="error">{speech.error}</StatusMessage>
      )}
      {entry.examples.map((example) => (
        <blockquote className="cloud-inset" key={example.id}>
          <p>
            {example.prefix}
            <strong>{example.targetSurface}</strong>
            {example.suffix}
          </p>
          <Button
            icon="volume"
            variant="secondary"
            onClick={() =>
              speech.speak(
                example.prefix + example.targetSurface + example.suffix,
              )
            }
          >
            Nghe câu ví dụ
          </Button>
        </blockquote>
      ))}
      <details>
        <summary>Nguồn dữ liệu</summary>
        {entry.provenance.map((source, index) => (
          <p key={index}>
            {source.field}: {source.attribution} · {source.license}{' '}
            {source.url && safeLink(source.url) && (
              <a href={safeLink(source.url)} target="_blank" rel="noreferrer">
                Xem nguồn
              </a>
            )}
          </p>
        ))}
      </details>
      <details>
        <summary>Nguồn bài đọc đã lưu ({sources.data?.length ?? 0})</summary>
        {sources.loading && <p>Đang tải nguồn…</p>}
        {sources.error && (
          <StatusMessage tone="error">{sources.error}</StatusMessage>
        )}
        {sources.data?.map((source) => (
          <p key={source.captureId}>
            <a
              href={safeLink(source.sourceUrl)}
              target="_blank"
              rel="noreferrer"
            >
              {source.sourceUrl}
            </a>{' '}
            · {new Date(source.capturedAt).toLocaleDateString('vi-VN')}
          </p>
        ))}
      </details>
    </section>
  );
}
