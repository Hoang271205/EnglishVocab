import { invalidateReadScopes } from '../../api/readCache';
import { useCallback, useEffect, useState } from 'react';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { notebookApi } from './notebook.api';
import { initialFilters } from './notebook.types';
import type { NotebookRow, NotebookListRow } from './notebook.types';
import type { Entry } from '../../../domain/types';
import { cleanExtensionWord } from '../sync/extensionBridge';
import type { ExtensionCleanup } from '../sync/extensionBridge';
export function useOnlineNotebook(ownerId: string, onChanged: () => void) {
  const [filters, setFilterState] = useState(initialFilters);
  const [contentVersion, setContentVersion] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  useEffect(() => {
    if (filters.search === search) return;
    const timer = setTimeout(() => {
      setSearch(filters.search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [filters.search, search]);
  const queryKey = JSON.stringify({ ...filters, search });
  const load = useCallback(
    (signal: AbortSignal) =>
      notebookApi.page(JSON.parse(queryKey), page, signal),
    [queryKey, page],
  );
  const resource = useAsyncResource(load, {
    cacheKey: `notebook:${ownerId}:${page}:${queryKey}`,
    keepStaleData: false,
  });
  useEffect(() => {
    if (!resource.data) return;
    const last = Math.max(
      1,
      Math.ceil(resource.data.total / resource.data.pageSize),
    );
    if (page > last) setPage(last);
  }, [page, resource.data]);
  const action = useAsyncAction();
  function setFilters(
    next:
      | typeof initialFilters
      | ((current: typeof initialFilters) => typeof initialFilters),
  ) {
    const updated = typeof next === 'function' ? next(filters) : next;
    setFilterState(updated);
    if (updated.search === filters.search) setPage(1);
    setSelectedId(null);
  }
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editor, setEditor] = useState<NotebookRow | 'new' | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cleanup, setCleanup] = useState<ExtensionCleanup[]>(() => {
    try {
      return JSON.parse(
        sessionStorage.getItem(`englishvocab-cleanup:${ownerId}`) ?? '[]',
      ) as ExtensionCleanup[];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      sessionStorage.setItem(
        `englishvocab-cleanup:${ownerId}`,
        JSON.stringify(cleanup),
      );
    } catch {
      /* Cleanup remains available in this tab. */
    }
  }, [cleanup, ownerId]);
  function refresh() {
    invalidateReadScopes(['notebook']);
    setContentVersion((value) => value + 1);
    resource.reload();
  }
  function changed() {
    refresh();
    onChanged();
  }
  async function save(entry: Entry) {
    const current = editor;
    const result = await action.run((signal) =>
      current && current !== 'new'
        ? notebookApi.update(entry, current.entry.revision, signal)
        : notebookApi.create(entry, signal),
    );
    if (!result) return;
    setNotice(
      current && current !== 'new'
        ? 'Đã cập nhật từ; level và lịch ôn được giữ nguyên.'
        : 'Đã thêm từ.',
    );
    setEditor(null);
    setFilters((value) => ({ ...value, scope: 'personal' }));
    setSelectedId(result.entry.id);
    changed();
  }
  async function toggle(row: NotebookListRow, enabled: boolean) {
    const result = await action.run(async (signal) => {
      await notebookApi.setReview(row.entry.id, enabled, signal);
      return true;
    });
    if (result) {
      setNotice(
        enabled
          ? 'Đã bật ôn tập; lịch cũ được giữ nguyên.'
          : 'Đã chuyển từ sang nhóm Không ôn tập.',
      );
      changed();
    }
  }
  async function remove(row: NotebookListRow) {
    if (
      !window.confirm(
        `Xoá “${row.entry.headword}”, tiến độ và nguồn đã lưu của từ này?`,
      )
    )
      return;
    const result = await action.run(async (signal) => {
      const sourceIds = await notebookApi.extensionIds(row.entry.id, signal);
      await notebookApi.remove(row.entry, signal);
      return { entryId: row.entry.id, headword: row.entry.headword, sourceIds };
    });
    if (!result) return;
    setSelectedId(null);
    if (resource.data?.rows.length === 1 && page > 1) setPage(page - 1);
    setNotice('Đã xoá dữ liệu trên server. Đang dọn cache extension…');
    changed();
    setCleanup((items) => [
      ...items.filter((item) => item.entryId !== result.entryId),
      result,
    ]);
    const cleared = await action.run(async (signal) => {
      await cleanExtensionWord(ownerId, result, signal);
      return true;
    });
    if (cleared) {
      setCleanup((items) =>
        items.filter((item) => item.entryId !== result.entryId),
      );
      setNotice('Đã xoá từ, tiến độ, nguồn và cache extension.');
    } else
      setNotice(
        'Đã xoá dữ liệu trên server; cache extension chưa dọn được. Tải lại extension rồi bấm Dọn cache còn lại. Bạn vẫn có thể xoá các từ khác.',
      );
  }
  async function retryCleanup() {
    const result = await action.run(async (signal) => {
      for (const item of cleanup)
        await cleanExtensionWord(ownerId, item, signal);
      return true;
    });
    if (result) {
      setCleanup([]);
      setNotice('Đã dọn cache extension còn lại.');
    }
  }
  return {
    resource,
    refresh,
    contentVersion,
    page,
    setPage,
    busy: action.busy || resource.refreshing,
    error: action.error?.message,
    filters,
    setFilters,
    selectedId,
    setSelectedId,
    editor,
    setEditor,
    notice,
    cleanup,
    save,
    toggle,
    remove,
    retryCleanup,
    changed,
  };
}
