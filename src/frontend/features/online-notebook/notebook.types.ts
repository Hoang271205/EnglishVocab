export type { NotebookListRow, NotebookPage } from '../../../shared/notebook';
import type { Entry, Progress } from '../../../domain/types';
export interface NotebookRow {
  entry: Entry;
  progress: Progress | null;
  reviewEnabled: boolean;
  saved?: boolean;
}
export interface NotebookFilters {
  scope: 'learned' | 'personal';
  search: string;
  cefr: string;
  level: string;
  status: 'all' | 'draft' | 'unlearned' | 'reviewing' | 'mastered';
  dueOnly: boolean;
}
export const initialFilters: NotebookFilters = {
  scope: 'learned',
  search: '',
  cefr: '',
  level: '',
  status: 'all',
  dueOnly: false,
};
