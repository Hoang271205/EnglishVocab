import type { CefrLevel } from '../../../../../../src/domain/types';
import type { PersonalEntryStatus } from './types';

export const cefrLevels: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export const personalStatuses: {
  id: PersonalEntryStatus;
  label: string;
}[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'draft', label: 'Chờ bổ sung' },
  { id: 'unlearned', label: 'Chưa học' },
  { id: 'reviewing', label: 'Đang ôn' },
  { id: 'mastered', label: 'Thành thạo' },
];

export const statusLabels: Record<string, string> = {
  draft: 'Chờ bổ sung',
  unlearned: 'Chưa học',
  reviewing: 'Đang ôn',
  mastered: 'Thành thạo',
};
