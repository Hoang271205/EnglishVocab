import { useEffect, useRef, useState } from 'react';
import { deletePersonalWord } from './deletePersonalWord';
import type { CefrLevel, CollectionId } from '../../../../../../src/domain/types';
import { backend, initializeBackend } from '../../backend';
import type { NotebookRow, NotebookScope, PersonalEntryStatus } from './types';

export function useNotebookPage() {
  const [creating, setCreating] = useState(false);
  const [readingOpen, setReadingOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [scope, setScope] = useState<NotebookScope>('learned');
  const [collection, setCollection] = useState<CollectionId | 'all'>('all');
  const [referenceVersion, setReferenceVersion] = useState(0);
  const [search, setSearch] = useState('');
  const [cefr, setCefr] = useState<CefrLevel | ''>('');
  const [level, setLevel] = useState('');
  const [dueOnly, setDueOnly] = useState(false);
  const [status, setStatus] = useState<PersonalEntryStatus>('all');
  const [rows, setRows] = useState<NotebookRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const deleteLock = useRef(false);
  useEffect(() => {
    let cancelled = false;
    async function loadRows() {
      setLoading(true);
      setError(null);
      try {
        await initializeBackend();
        const query: Parameters<typeof backend.queries.notebook>[0] = {
          search,
        };
        if (scope === 'personal') {
          query.collection = 'personal';
        } else if (collection !== 'all') {
          query.collection = collection;
        }
        if (cefr) {
          query.cefr = cefr;
        }
        if (level) {
          query.level = Number(level);
        }
        if (dueOnly) {
          query.due = true;
        }
        const result = await backend.queries.notebook(query);
        const visible =
          scope === 'learned'
            ? result.filter((row) => row.progress !== null)
            : result.filter((row) => status === 'all' || row.status === status);
        if (!cancelled) {
          setRows(visible);
        }
      } catch (cause: unknown) {
        if (!cancelled) {
          setError(
            cause instanceof Error ? cause.message : 'Không tải được Sổ tay.',
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void loadRows();
    return () => {
      cancelled = true;
    };
  }, [scope, collection, search, cefr, level, dueOnly, status, reloadKey]);
  useEffect(() => {
    function refresh() {
      if (
        document.visibilityState === 'visible' &&
        !selectedId &&
        !creating &&
        !readingOpen
      ) {
        setReloadKey((value) => value + 1);
      }
    }
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    const timer = window.setInterval(refresh, 60000);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      window.clearInterval(timer);
    };
  }, [selectedId, creating, readingOpen]);
  function saved(id: string, copied: boolean) {
    setCreating(false);
    setScope('personal');
    setStatus('all');
    setSearch('');
    setCefr('');
    setLevel('');
    setDueOnly(false);
    setSelectedId(id);
    setReloadKey((value) => value + 1);
    setNotice(
      copied
        ? 'Đã tạo mục mới. Tiến độ của mục cũ được giữ nguyên.'
        : 'Đã lưu từ.',
    );
  }
  function chooseScope(nextScope: NotebookScope) {
    setScope(nextScope);
    setStatus('all');
    setSelectedId(null);
  }
  async function deleteWord(row: NotebookRow) {
    if (deleteLock.current) return;
    const confirmed = window.confirm(
      `Xóa "${row.entry.headword}"?\n\n` +
        'Thao tác này sẽ xóa từ, ngữ cảnh, ghi chú, tiến độ, ' +
        'lịch sử ôn và cache liên quan trên web và extension.\n\n' +
        'Không thể hoàn tác trong ứng dụng.',
    );
    if (!confirmed) return;
    deleteLock.current = true;
    setDeletingId(row.entry.id);
    setError(null);
    setNotice(null);
    try {
      await deletePersonalWord(row.entry.id, row.entry.revision);
      setRows((current) =>
        current.filter((item) => item.entry.id !== row.entry.id),
      );
      if (selectedId === row.entry.id) {
        setSelectedId(null);
      }
      setNotice(`Đã xóa "${row.entry.headword}" và dữ liệu liên quan.`);
      setReloadKey((value) => value + 1);
      setReferenceVersion((value) => value + 1);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Không xóa được từ.');
    } finally {
      deleteLock.current = false;
      setDeletingId(null);
    }
  }
  const reviewStacks = [
    {
      id: 'enabled',
      title: 'Bật ôn tập',
      description: 'Các từ được phép xuất hiện khi đến hạn ôn.',
      rows: rows.filter((row) => row.reviewEnabled),
    },
    {
      id: 'disabled',
      title: 'Tạm ngừng ôn',
      description: 'Vẫn giữ từ và tiến độ. Tick lại để tiếp tục ôn.',
      rows: rows.filter((row) => !row.reviewEnabled),
    },
  ];
  return {
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
    scope,
    chooseScope,
    search,
    collection,
    cefr,
    level,
    dueOnly,
    status,
    loading,
    rows,
    error,
    reviewStacks,
    setRows,
    deleteWord,
    reloadKey,
    referenceVersion,
    setReferenceVersion,
  };
}
