import NotebookTools from './NotebookTools';
import NotebookFilters from './NotebookFilters';
import NotebookStacks from './NotebookStacks';
import ExtensionSyncPanel from './ExtensionSyncPanel';
import PersonalEntryEditor from './PersonalEntryEditor';
import ReadingPanel from '../reading/ReadingPanel';
import type { NotebookPageProps } from './types';
import { useNotebookPage } from './useNotebookPage';

export default function NotebookPage(props: NotebookPageProps) {
  const { onLearn, onOpenSession } = props;
  const model = useNotebookPage();
  const {
    setCreating,
    setSelectedId,
    setNotice,
    setReadingOpen,
    deletingId,
    creating,
    readingOpen,
    selectedId,
    setScope,
    setCollection,
    setStatus,
    setSearch,
    setCefr,
    setLevel,
    setDueOnly,
    setReloadKey,
    notice,
    saved,
    loading,
    rows,
    error,
  } = model;
  return (
    <section aria-labelledby="notebook-title">
      <p className="eyebrow">TỪ VỰNG CỦA BẠN</p>
      <h1 id="notebook-title">Sổ tay</h1>
      <button
        className="primary-button"
        type="button"
        onClick={() => {
          setCreating(true);
          setSelectedId(null);
          setNotice(null);
        }}
      >
        Thêm từ cá nhân
      </button>
      <button
        className="secondary-button reading-open-button"
        type="button"
        onClick={() => {
          setCreating(false);
          setSelectedId(null);
          setReadingOpen(true);
        }}
      >
        Reading — Đọc và lưu từ
      </button>
      <ExtensionSyncPanel
        disabled={
          deletingId !== null || creating || readingOpen || selectedId !== null
        }
        onReceived={() => {
          setScope('personal');
          setCollection('all');
          setStatus('all');
          setSearch('');
          setCefr('');
          setLevel('');
          setDueOnly(false);
          setSelectedId(null);
          setReloadKey((value) => value + 1);
        }}
      />
      {readingOpen && (
        <ReadingPanel
          onClose={() => setReadingOpen(false)}
          onSaved={() => {
            setNotice('Đã lưu từ/ngữ cảnh từ Reading.');
            setReloadKey((value) => value + 1);
          }}
        />
      )}
      {notice && (
        <p className="study-notice is-success" role="status">
          {notice}
        </p>
      )}
      {creating && (
        <PersonalEntryEditor
          initial={null}
          onSaved={saved}
          onCancel={() => setCreating(false)}
        />
      )}

      <NotebookFilters model={model} />
      <div className="notebook-toolbar">
        <p className="topic-message" role="status">
          {loading ? 'Đang tải…' : `${rows.length} từ phù hợp`}
        </p>

        <button
          className="secondary-button"
          type="button"
          disabled={creating || selectedId !== null}
          onClick={() => setReloadKey((value) => value + 1)}
        >
          Làm mới
        </button>
      </div>

      {error && (
        <div className="load-error" role="alert">
          {error}
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div className="review-state">
          <h2>Chưa có từ phù hợp</h2>

          <p>Bạn có thể đổi bộ lọc hoặc học thêm từ mới.</p>

          <button className="primary-button" type="button" onClick={onLearn}>
            Học từ mới
          </button>
        </div>
      )}

      {!loading && !error && rows.length > 0 && (
        <NotebookStacks model={model} onOpenSession={onOpenSession} />
      )}

      <NotebookTools model={model} />
    </section>
  );
}
