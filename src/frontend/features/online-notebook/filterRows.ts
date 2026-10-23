import type { NotebookFilters, NotebookRow } from './notebook.types';
function searchable(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/g, 'd')
    .toLocaleLowerCase('vi');
}
export function filterRows(
  rows: NotebookRow[],
  filters: NotebookFilters,
  now: number,
) {
  const query = searchable(filters.search.trim());
  return rows.filter((row) => {
    const { entry, progress, reviewEnabled } = row;
    if (
      filters.scope === 'personal'
        ? entry.collectionId !== 'personal' && !row.saved
        : !progress
    )
      return false;
    if (
      query &&
      !searchable(`${entry.headword} ${entry.meaningVi}`).includes(query)
    )
      return false;
    if (filters.cefr && entry.cefr.level !== filters.cefr) return false;
    if (filters.level && String(progress?.level ?? '') !== filters.level)
      return false;
    if (
      filters.dueOnly &&
      (!progress || !reviewEnabled || progress.nextReviewAt > now)
    )
      return false;
    switch (filters.status) {
      case 'draft':
        return entry.contentStatus === 'draft';
      case 'unlearned':
        return !progress && entry.contentStatus === 'ready';
      case 'reviewing':
        return Boolean(progress && progress.level < 5);
      case 'mastered':
        return progress?.level === 5;
      default:
        return true;
    }
  });
}
