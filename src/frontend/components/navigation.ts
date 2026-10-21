export type Tab = 'review' | 'learn' | 'notebook';

export const navigation: { id: Tab; label: string; icon: string }[] = [
  { id: 'review', label: 'Ôn tập', icon: '▥' },
  { id: 'learn', label: 'Học từ mới', icon: '♧' },
  { id: 'notebook', label: 'Sổ tay', icon: '▤' },
];
