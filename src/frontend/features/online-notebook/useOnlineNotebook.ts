import { useCallback, useEffect, useState } from 'react';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { notebookApi } from './notebook.api';
import { initialFilters } from './notebook.types';
import type { NotebookRow } from './notebook.types';
import type { Entry } from '../../../domain/types';
import { cleanExtensionWord } from '../sync/extensionBridge';
import type { ExtensionCleanup } from '../sync/extensionBridge';
export function useOnlineNotebook(ownerId: string, onChanged: () => void) {
  const load = useCallback(
    (signal: AbortSignal) => notebookApi.list(signal),
    [],
  );
  const resource = useAsyncResource(load, { cacheKey: `notebook:${ownerId}` });
  const action = useAsyncAction();
  const [filters, setFilters] = useState(initialFilters);
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
  function changed() {
    resource.reload();
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
    setSelectedId(result.entry.id);
    setFilters((value) => ({ ...value, scope: 'personal' }));
    changed();
  }
  async function toggle(row: NotebookRow, enabled: boolean) {
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
  async function remove(row: NotebookRow) {
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
