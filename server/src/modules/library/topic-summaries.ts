import type { Topic } from '../../../../src/domain/types.js';
import { sharedTopics } from './collections.js';
import { knownWords, userProgress } from '../progress/collections.js';

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
  const [topics, progress, known] = await Promise.all([
    loadCatalogue(collection),
    userProgress
      .find({ userId }, { projection: { _id: 0, entryId: 1 } })
      .toArray(),
    knownWords
      .find({ userId }, { projection: { _id: 0, entryId: 1 } })
      .toArray(),
  ]);
  const learnedIds = new Set(progress.map((item) => item.entryId));
  const knownIds = new Set(known.map((item) => item.entryId));
  return topics.map((topic) => ({
    ...topic,
    total: topic.entryIds.length,
    learned: topic.entryIds.filter((id) => learnedIds.has(id)).length,
    known: topic.entryIds.filter(
      (id) => knownIds.has(id) && !learnedIds.has(id),
    ).length,
  }));
}
