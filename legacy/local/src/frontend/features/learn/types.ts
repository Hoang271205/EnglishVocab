import type { SessionView } from '../../../../../../src/domain/types';

import type { backend } from '../../backend';

export type LearningCollection = 'ielts' | 'daily';

export type TopicSummary = Awaited<
  ReturnType<typeof backend.queries.topics>
>[number];

export type TopicGroups = Record<LearningCollection, TopicSummary[]>;

export type LearnPageProps = {
  onNotebook: () => void;
  onOpenSession: (session: SessionView) => void;
};
