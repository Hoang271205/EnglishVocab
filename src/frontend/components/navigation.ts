import type { IconName } from './ui/Icon';
export type Tab = 'review' | 'learn' | 'notebook';

export const navigation: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'review', label: 'Ôn tập', icon: 'review' },
  { id: 'learn', label: 'Học từ mới', icon: 'learn' },
  { id: 'notebook', label: 'Sổ tay', icon: 'notebook' },
];
