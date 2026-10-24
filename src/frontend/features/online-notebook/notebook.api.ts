import { apiRequest } from '../../api/client';
import type { Entry } from '../../../domain/types';
import type {
  NotebookRow,
  NotebookFilters,
  NotebookPage,
} from './notebook.types';
export const notebookApi = {
  async words(signal: AbortSignal) {
    return (
      await apiRequest<{ words: string[] }>('/api/notebook/words', { signal })
    ).words;
  },
  page(filters: NotebookFilters, page: number, signal: AbortSignal) {
    const query = new URLSearchParams({
      ...filters,
      dueOnly: String(filters.dueOnly),
      page: String(page),
    });
    return apiRequest<NotebookPage>(`/api/notebook/list?${query}`, { signal });
  },
  async detail(id: string, signal: AbortSignal) {
    return (
      await apiRequest<{ row: NotebookRow }>(
        `/api/notebook/entries/${encodeURIComponent(id)}`,
        { signal },
      )
    ).row;
  },
  async lookup(word: string, signal: AbortSignal) {
    return (
      await apiRequest<{ entries: Entry[] }>(
        `/api/notebook/lookup?${new URLSearchParams({ word })}`,
        { signal },
      )
    ).entries;
  },
  async list(signal: AbortSignal) {
    return (
      await apiRequest<{ rows: NotebookRow[] }>('/api/notebook', { signal })
    ).rows;
  },
  create(entry: Entry, signal: AbortSignal) {
    return apiRequest<{ entry: Entry }>('/api/personal', {
      method: 'POST',
      body: { entry },
      signal,
    });
  },
  update(entry: Entry, expectedRevision: number, signal: AbortSignal) {
    return apiRequest<{ entry: Entry }>(
      `/api/personal/${encodeURIComponent(entry.id)}`,
      {
        method: 'PUT',
        body: { entry, expectedRevision },
        signal,
      },
    );
  },
  remove(entry: Pick<Entry, 'id' | 'revision'>, signal: AbortSignal) {
    return apiRequest<void>(`/api/personal/${encodeURIComponent(entry.id)}`, {
      method: 'DELETE',
      body: { expectedRevision: entry.revision },
      signal,
    });
  },
  setReview(entryId: string, reviewEnabled: boolean, signal: AbortSignal) {
    return apiRequest(
      `/api/progress/${encodeURIComponent(entryId)}/review-preference`,
      {
        method: 'PATCH',
        body: { reviewEnabled },
        signal,
      },
    );
  },
  async extensionIds(entryId: string, signal: AbortSignal) {
    return (
      await apiRequest<{ ids: string[] }>(
        `/api/notebook/extension-ids/${encodeURIComponent(entryId)}`,
        { signal },
      )
    ).ids;
  },
};
