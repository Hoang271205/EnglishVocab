import type { Entry, Topic } from '../../../../src/domain/types.js';
import { db } from '../../database/mongo.js';

export type SharedEntry = Entry & {
  _id: string;
};

export type SharedTopic = Topic & {
  _id: string;
};

export const sharedEntries = db.collection<SharedEntry>('shared_entries');

export const sharedTopics = db.collection<SharedTopic>('shared_topics');

export async function ensureLibraryIndexes() {
  await sharedEntries.createIndex({
    collectionId: 1,
    contentStatus: 1,
  });

  await sharedEntries.createIndex({ headword: 1 });
  await sharedEntries.createIndex(
    { headword: 1 },
    {
      name: 'shared_headword_lookup',
      collation: { locale: 'en', strength: 2 },
    },
  );

  await sharedTopics.createIndex(
    { collectionId: 1, order: 1 },
    {
      unique: true,
      name: 'shared_topics_collection_order',
    },
  );
}
