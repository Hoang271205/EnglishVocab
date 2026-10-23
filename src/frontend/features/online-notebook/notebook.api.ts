import { apiRequest } from '../../api/client';
import type { Entry } from '../../../domain/types';
import type { NotebookRow } from './notebook.types';
export const notebookApi = {
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
    return apiRequest<{ entry: Entry; copied: boolean }>(
      `/api/personal/${encodeURIComponent(entry.id)}`,
      {
        method: 'PUT',
        body: { entry, expectedRevision },
        signal,
      },
    );
  },
  remove(entry: Entry, signal: AbortSignal) {
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
