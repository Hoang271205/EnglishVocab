import type { Topic } from '../../../../src/domain/types.js';
import { sharedTopics } from './collections.js';
import { userProgress } from '../progress/collections.js';
import { topicLearning } from '../study/topic-learning.js';

type Collection = 'ielts' | 'daily';
const catalogueCache = new Map<
  Collection,
  { topics: Topic[]; expiresAt: number }
>();
const catalogueRequests = new Map<Collection, Promise<Topic[]>>();

// Only shared catalogue data is cached. Personal progress is queried per request.
async function loadCatalogue(collection: Collection): Promise<Topic[]> {
  const cached = catalogueCache.get(collection);
  if (cached && cached.expiresAt > Date.now()) return cached.topics;
  const pending = catalogueRequests.get(collection);
  if (pending) return pending;
  const request = sharedTopics
    .find({ collectionId: collection }, { projection: { _id: 0 } })
    .sort({ collectionId: 1, order: 1 })
    .toArray();
  catalogueRequests.set(collection, request);
  try {
    const topics = await request;
    catalogueCache.set(collection, { topics, expiresAt: Date.now() + 30000 });
    return topics;
  } finally {
    catalogueRequests.delete(collection);
  }
}

export async function loadTopicSummaries(
  userId: string,
  collection: Collection,
) {
  const [topics, progress, positions] = await Promise.all([
    loadCatalogue(collection),
    userProgress
      .find({ userId }, { projection: { _id: 0, entryId: 1 } })
      .toArray(),
    topicLearning
      .find({ userId }, { projection: { _id: 0, topicId: 1, nextIndex: 1 } })
      .toArray(),
  ]);
  const learnedIds = new Set(progress.map((item) => item.entryId));
  const positionsByTopic = new Map(
    positions.map((item) => [item.topicId, item.nextIndex]),
  );
  return topics.map((topic) => ({
    ...topic,
    total: topic.entryIds.length,
    learned: topic.entryIds.filter((id) => learnedIds.has(id)).length,
    processed: topic.entryIds.filter(
      (id, index) =>
        index < (positionsByTopic.get(topic.id) ?? 0) || learnedIds.has(id),
    ).length,
  }));
}
