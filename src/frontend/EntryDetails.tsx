import { useEffect, useRef, useState } from 'react';
import { backend } from './backend';
import PersonalEntryEditor from './PersonalEntryEditor';
import type { SessionView } from '../domain/types';

type Details = Awaited<
  ReturnType<typeof backend.queries.details>
>;

type EntryDetailsProps = {
  entryId: string;
  onClose: () => void;
  onSaved: (id: string, copied: boolean) => void;
  onOpenSession: (session: SessionView) => void;
};

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('vi-VN');
}

export default function EntryDetails({
  entryId,
  onClose,
  onSaved,
  onOpenSession,
}: EntryDetailsProps) {
  const [data, setData] = useState<Details | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [editing, setEditing] = useState(false);
  const [working, setWorking] = useState(false);
  const actionLock = useRef(false);
  const audioTurn = useRef(0);
  const alive = useRef(true);

  useEffect(() => {
    let cancelled = false;
    alive.current = true;

    setData(null);
    setError(null);
    setAudioError(null);

    async function loadDetails() {
      try {
        const result = await backend.queries.details(entryId);

        if (!cancelled) {
          setData(result);
        }
      } catch (cause: unknown) {
        if (!cancelled) {
          setError(
            cause instanceof Error
              ? cause.message
              : 'Không tải được chi tiết từ.',
          );
        }
      }
    }

    void loadDetails();

    return () => {
      cancelled = true;
      alive.current = false;
      audioTurn.current++;
      backend.audio.stop();
    };
  }, [entryId, reloadKey]);

  async function playAudio(
    options: { slow?: boolean; exampleId?: string } = {},
  ) {
    if (!data) {
      return;
    }

    const turn = ++audioTurn.current;
    setAudioError(null);

    try {
      await backend.audio.speakEntry(data.entry.id, options);
    } catch (cause: unknown) {
      if (alive.current && turn === audioTurn.current) {
        setAudioError(
          cause instanceof Error
            ? cause.message
            : 'Không phát được giọng đọc.',
        );
      }
    }
  }

  async function startLearning() {
    if (!data || actionLock.current) return;
    actionLock.current = true;
    setWorking(true);
    setError(null);
    audioTurn.current++;
    backend.audio.stop();
    try {
      const active = await backend.study.active();
      if (active) {
        const next = active.paused
          ? await backend.study.transition(active.id, active.version, 'resume')
          : active;
        onOpenSession(next);
        return;
      }
      const latest = await backend.queries.details(entryId);
      if (latest.progress || latest.entry.contentStatus !== 'ready') {
        throw new Error('Từ chưa sẵn sàng hoặc đã được học. Hãy mở lại chi tiết.');
      }
      const settings = await backend.settings.get();
      onOpenSession(await backend.study.create('learn', settings.learnBatchSize, [entryId]));
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Không mở được phiên học.');
    } finally {
      actionLock.current = false;
      setWorking(false);
    }
  }

  if (editing && data) {
    return <PersonalEntryEditor
      initial={{entry: data.entry, note: data.note, hasProgress: data.progress !== null}}
      onCancel={() => setEditing(false)}
      onSaved={onSaved}
    />;
  }

  return (
    <section
      className="entry-details"
      aria-labelledby="entry-details-title"
    >
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

      {!data && !error && (
        <p role="status">Đang tải chi tiết…</p>
      )}

      {data && (
        <>
          {data.entry.collectionId === 'personal' && (
            <div className="study-answer-actions">
              <button className="secondary-button" type="button" disabled={working} onClick={() => {
                audioTurn.current++;
                backend.audio.stop();
                setEditing(true);
              }}>Chỉnh sửa</button>
              {data.entry.contentStatus === 'ready' && !data.progress && (
                <button className="primary-button" type="button" disabled={working} onClick={() => void startLearning()}>
                  {working ? 'Đang mở…' : 'Học từ này / tiếp tục phiên dở'}
                </button>
              )}
            </div>
          )}
          {data.note && <div className="detail-section"><h3>Ghi chú cá nhân</h3><p className="personal-note">{data.note}</p></div>}
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
            {data.entry.cefr.status === 'estimated'
              ? ' · tham khảo'
              : ''}
          </p>

          {data.progress ? (
            <div className="review-result">
              <p>
                Level ghi nhớ:{' '}
                <strong>{data.progress.level}</strong>
              </p>

              <p>
                Lần ôn tiếp theo:{' '}
                <strong>
                  {formatTime(data.progress.nextReviewAt)}
                </strong>
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

          <div className="audio-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={() => void playAudio()}
            >
              Nghe từ · Mỹ
            </button>

            <button
              className="secondary-button"
              type="button"
              onClick={() => void playAudio({ slow: true })}
            >
              Nghe chậm
            </button>
          </div>

          {audioError && (
            <p className="audio-message" role="status">
              {audioError}
            </p>
          )}

          {data.entry.examples.map((example) => (
            <div className="study-example" key={example.id}>
              <p>
                {example.prefix}
                <strong>{example.targetSurface}</strong>
                {example.suffix}
              </p>

              <button
                className="secondary-button"
                type="button"
                onClick={() =>
                  void playAudio({ exampleId: example.id })
                }
              >
                Nghe câu ví dụ
              </button>
            </div>
          ))}

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
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Xem nguồn
                      </a>
                    </>
                  )}
                </p>
              ))
            )}
          </details>

          <details className="detail-section">
            <summary>
              Ngữ cảnh đã lưu ({data.captures.length})
            </summary>

            {data.captures.length === 0 ? (
              <p>Chưa có ngữ cảnh được lưu cho từ này.</p>
            ) : (
              data.captures.map((capture) => (
                <div className="capture-context" key={capture.id}>
                  <p>
                    <strong>{capture.selectedText}</strong>
                  </p>

                  <p>
                    {capture.originalSentence ||
                      'Không có câu ngữ cảnh.'}
                  </p>

                  <a
                    href={capture.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
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
      )}
    </section>
  );
}