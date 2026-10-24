import type { Entry, Progress } from '../domain/types.js';

export interface NotebookListRow {
  entry: Pick<
    Entry,
    | 'id'
    | 'revision'
    | 'collectionId'
    | 'headword'
    | 'partOfSpeech'
    | 'meaningVi'
    | 'cefr'
    | 'contentStatus'
  >;
  progress: Pick<Progress, 'level' | 'nextReviewAt'> | null;
  reviewEnabled: boolean;
  saved?: boolean;
}
export interface NotebookPage {
  rows: NotebookListRow[];
  total: number;
  enabledCount: number;
  disabledCount: number;
  scopeCount: number;
  allCount: number;
  page: number;
  pageSize: number;
}
