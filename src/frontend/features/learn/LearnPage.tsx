import { useEffect, useRef, useState } from 'react';
import type { SessionView } from '../../../domain/types';
import { backend, initializeBackend } from '../../backend';
import DailyGoal from './DailyGoal';

type Collection = 'ielts' | 'daily';

type TopicSummary = Awaited<ReturnType<typeof backend.queries.topics>>[number];

type TopicGroups = Record<Collection, TopicSummary[]>;

type LearnPageProps = {
  onNotebook: () => void;
  onOpenSession: (session: SessionView) => void;
};

export default function LearnPage({
  onNotebook,
  onOpenSession,
}: LearnPageProps) {
  const [collection, setCollection] = useState<Collection>('ielts');
  const [search, setSearch] = useState('');
  const [groups, setGroups] = useState<TopicGroups | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);

  const [pendingSession, setPendingSession] = useState<SessionView | null>(
    null,
  );

  const [batchSize, setBatchSize] = useState<5 | 10>(10);
  const [working, setWorking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const actionLock = useRef(false);
  useEffect(() => {
    let cancelled = false;

    async function loadTopics() {
      setError(null);
      setActionError(null);
      setGroups(null);

      try {
        await initializeBackend();

        const [ielts, daily, pending, settings] = await Promise.all([
          backend.queries.topics('ielts'),
          backend.queries.topics('daily'),
          backend.study.active(),
          backend.settings.get(),
        ]);

        if (!cancelled) {
          setGroups({ ielts, daily });
          setPendingSession(pending);
          setBatchSize(settings.learnBatchSize);
        }
      } catch (cause: unknown) {
        if (!cancelled) {
          setError(
            cause instanceof Error
              ? cause.message
              : 'Không tải được danh sách chủ đề.',
          );
        }
      }
    }

    void loadTopics();

    return () => {
      cancelled = true;
    };
  }, [retryKey]);

  const allTopics = groups?.[collection] ?? [];

  const normalizedSearch = search.normalize('NFKC').toLowerCase().trim();

  const visibleTopics = allTopics.filter((topic) =>
    `${topic.nameEn} ${topic.nameVi}`
      .normalize('NFKC')
      .toLowerCase()
      .includes(normalizedSearch),
  );

  const populatedCount = allTopics.filter((topic) => topic.total > 0).length;

  const selectedTopic =
    allTopics.find((topic) => topic.id === selectedTopicId) ?? null;

  function chooseCollection(nextCollection: Collection) {
    setCollection(nextCollection);
    setSearch('');
    setSelectedTopicId(null);
    setActionError(null);
  }

  function chooseTopic(topic: TopicSummary) {
    if (topic.total === 0) {
      return;
    }

    if (topic.learned >= topic.total) {
      onNotebook();
      return;
    }

    setSelectedTopicId(topic.id);
    setActionError(null);
  }

  async function runAction(action: () => Promise<void>) {
    if (actionLock.current) {
      return;
    }

    actionLock.current = true;
    setWorking(true);
    setActionError(null);

    try {
      await action();
    } catch (cause: unknown) {
      setActionError(
        cause instanceof Error
          ? cause.message
          : 'Không thực hiện được thao tác.',
      );
    } finally {
      actionLock.current = false;
      setWorking(false);
    }
  }

  function startSelectedTopic() {
    const topic = selectedTopic;

    if (!topic) {
      return;
    }

    void runAction(async () => {
      const pending = await backend.study.active();

      if (pending) {
        setPendingSession(pending);
        setActionError(
          'Bạn có một phiên đang dở. Hãy tiếp tục phiên đó trước.',
        );
        return;
      }

      const session = await backend.study.create(
        'learn',
        batchSize,
        topic.entryIds,
      );

      onOpenSession(session);
    });
  }

  function resumePendingSession() {
    const pending = pendingSession;

    if (!pending) {
      return;
    }

    void runAction(async () => {
      const current = await backend.study.session(pending.id);

      if (current.phase === 'complete') {
        setPendingSession(null);
        setRetryKey((value) => value + 1);
        return;
      }

      const session = current.paused
        ? await backend.study.transition(current.id, current.version, 'resume')
        : current;

      onOpenSession(session);
    });
  }

  return (
    <section className="learn-page" aria-labelledby="learn-title">
      <p className="eyebrow">MỖI NGÀY MỘT CHÚT</p>
      <h1 id="learn-title">Học từ mới</h1>
      <DailyGoal />

      <div className="collection-picker" aria-label="Chọn bộ từ">
        <button
          className={`collection-chip${
            collection === 'ielts' ? ' is-selected' : ''
          }`}
          type="button"
          aria-pressed={collection === 'ielts'}
          onClick={() => chooseCollection('ielts')}
        >
          IELTS Vocabulary
        </button>

        <button
          className={`collection-chip${
            collection === 'daily' ? ' is-selected' : ''
          }`}
          type="button"
          aria-pressed={collection === 'daily'}
          onClick={() => chooseCollection('daily')}
        >
          Giao tiếp hằng ngày
        </button>
      </div>

      <div className="collection-banner">
        {collection === 'ielts'
          ? 'IELTS VOCABULARY · B1–C2'
          : 'GIAO TIẾP HẰNG NGÀY · A1–B2'}
      </div>

      {!groups && !error && (
        <p className="topic-message" role="status">
          Đang tải thư viện từ vựng…
        </p>
      )}

      {error && (
        <div className="load-error" role="alert">
          <p>Không tải được thư viện.</p>
          <p className="error-detail">{error}</p>

          <button
            className="primary-button"
            type="button"
            onClick={() => setRetryKey((value) => value + 1)}
          >
            Thử lại
          </button>
        </div>
      )}

      {groups && (
        <>
          {pendingSession && (
            <div className="pending-session">
              <div>
                <strong>
                  Bạn có một phiên{' '}
                  {pendingSession.mode === 'learn' ? 'học' : 'ôn'} đang dở
                </strong>

                <p>
                  Đã hoàn thành {pendingSession.index}/
                  {pendingSession.items.length} từ.
                </p>
              </div>

              <button
                className="primary-button"
                type="button"
                disabled={working}
                onClick={resumePendingSession}
              >
                {working ? 'Đang mở…' : 'Tiếp tục'}
              </button>
            </div>
          )}

          {actionError && (
            <div className="load-error" role="alert">
              <p className="error-detail">{actionError}</p>

              <button
                className="secondary-button"
                type="button"
                disabled={working}
                onClick={() => setRetryKey((value) => value + 1)}
              >
                Tải lại danh sách
              </button>
            </div>
          )}

          <p className="topic-message">
            {allTopics.length} chủ đề · {populatedCount} chủ đề đã có nội dung
          </p>

          <label className="search-label" htmlFor="topic-search">
            Tìm chủ đề
          </label>

          <input
            id="topic-search"
            className="topic-search"
            type="search"
            placeholder="Nhập tên tiếng Anh hoặc tiếng Việt…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setSelectedTopicId(null);
            }}
          />

          {selectedTopic && (
            <div className="selected-topic">
              <div>
                <strong>{selectedTopic.nameEn}</strong>
                <p>{selectedTopic.nameVi}</p>

                <p>
                  Đã học {selectedTopic.learned}/{selectedTopic.total} từ. Mỗi
                  lượt tối đa {batchSize} từ chưa học.
                </p>

                <button
                  className="primary-button start-topic-button"
                  type="button"
                  disabled={working || pendingSession !== null}
                  onClick={startSelectedTopic}
                >
                  {working ? 'Đang mở…' : 'Bắt đầu học'}
                </button>
              </div>

              <button
                className="close-selection"
                type="button"
                aria-label="Đóng thông tin chủ đề"
                onClick={() => setSelectedTopicId(null)}
              >
                ×
              </button>
            </div>
          )}

          {visibleTopics.length === 0 ? (
            <p className="topic-message" role="status">
              Không tìm thấy chủ đề phù hợp.
            </p>
          ) : (
            <ul className="topic-list">
              {visibleTopics.map((topic) => {
                const hasContent = topic.total > 0;

                const completed = hasContent && topic.learned >= topic.total;

                return (
                  <li key={topic.id}>
                    <button
                      className={`topic-row${
                        selectedTopicId === topic.id ? ' is-selected' : ''
                      }`}
                      type="button"
                      disabled={!hasContent || working}
                      onClick={() => chooseTopic(topic)}
                    >
                      <span className="topic-number" aria-hidden="true">
                        {String(topic.order).padStart(2, '0')}
                      </span>

                      <span className="topic-info">
                        <strong>{topic.nameEn}</strong>

                        <span className="topic-translation">
                          {topic.nameVi}
                        </span>

                        {hasContent ? (
                          <>
                            <span className="topic-progress-text">
                              {topic.learned}/{topic.total} từ đã học
                            </span>

                            <progress
                              className="topic-progress"
                              max={topic.total}
                              value={Math.min(topic.learned, topic.total)}
                              aria-label={`Tiến độ ${topic.nameVi}`}
                            />
                          </>
                        ) : (
                          <span className="topic-progress-text">
                            Chưa có nội dung
                          </span>
                        )}
                      </span>

                      <span className="topic-action">
                        {!hasContent
                          ? 'Chưa có từ'
                          : completed
                            ? 'Xem Sổ tay'
                            : 'Chọn chủ đề'}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
