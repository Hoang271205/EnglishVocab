import type { CollectionId, SessionView } from '../../../../../../src/domain/types';

import type { backend } from '../../backend';

import type { LevelCounts } from '../../../../../../src/frontend/components/charts/LevelDistribution';

export type ReviewFilter = 'all' | CollectionId;

export type ReviewOverview = Awaited<
  ReturnType<typeof backend.queries.overview>
>;

export type ReviewData = {
  filter: ReviewFilter;
  overview: ReviewOverview;
  dueIds: string[];
  pending: SessionView | null;
  levelCounts: LevelCounts;
};

export type ReviewPageProps = {
  onLearn: () => void;
  onOpenSession: (session: SessionView) => void;
};
