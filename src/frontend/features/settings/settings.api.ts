import type { ReviewBatchSize } from '../../../shared/studyOptions';
import { apiRequest } from '../../api/client';
export interface AppSettings {
  voiceURI: string | null;
  onlineLookupEnabled: boolean;
  learnBatchSize: 5 | 10;
  reviewBatchSize: ReviewBatchSize;
  dailyNewWordTarget: number;
}
export interface SettingsDocument {
  revision: number;
  settings: AppSettings;
  updatedAt: number | null;
}
export const settingsApi = {
  get: (signal: AbortSignal) =>
    apiRequest<SettingsDocument>('/api/settings', { signal }),
  save: (
    document: SettingsDocument,
    changes: AppSettings,
    signal: AbortSignal,
  ) =>
    apiRequest<SettingsDocument>('/api/settings', {
      method: 'PATCH',
      body: { expectedRevision: document.revision, changes },
      signal,
    }),
};
