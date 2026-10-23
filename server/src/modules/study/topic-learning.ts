import type { ClientSession } from 'mongodb';
import { db } from '../../database/mongo.js';
import { sharedTopics } from '../library/collections.js';
import type { LearnSession } from './collections.js';

export interface TopicLearning {
  _id: string;
  userId: string;
  topicId: string;
  nextIndex: number;
  updatedAt: number;
}

// One cursor per learner/topic. Skipped words never become notebook entries.
export const topicLearning = db.collection<TopicLearning>('topic_learning');

export async function recordTopicPosition(
  session: LearnSession,
  entryId: string,
  mongoSession: ClientSession,
) {
  if (!session.topicId) return;
  const topic = await sharedTopics.findOne(
    { _id: session.topicId },
    { session: mongoSession },
  );
  const position = topic?.entryIds.indexOf(entryId) ?? -1;
  if (position < 0) return;
  await topicLearning.updateOne(
    { _id: JSON.stringify([session.userId, session.topicId]) },
    {
      $set: {
        userId: session.userId,
        topicId: session.topicId,
        updatedAt: Date.now(),
      },
      $max: { nextIndex: position + 1 },
    },
    { upsert: true, session: mongoSession },
  );
}
