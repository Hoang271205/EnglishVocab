import type { backend } from '../../backend';

export type BackupPanelProps = {
  disabled: boolean;
  onRestored: () => void;
};

export type BackupOperation = 'export' | 'inspect' | 'restore';

export type AppSettings = Awaited<ReturnType<typeof backend.settings.get>>;

export type SettingsFormValues = Pick<
  AppSettings,
  'learnBatchSize' | 'reviewBatchSize' | 'onlineLookupEnabled'
>;

export type AppSettingsPanelProps = {
  disabled: boolean;
};

export type SettingsOperation = 'save' | 'clear-cache';
