import type { ReviewFilter } from './types';

export const filters: {
  id: ReviewFilter;
  label: string;
}[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'ielts', label: 'IELTS' },
  { id: 'daily', label: 'Giao tiếp' },
  { id: 'personal', label: 'Từ của tôi' },
];
