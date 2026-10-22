import type {
  ClozeCell,
  Entry,
  Example,
  Progress,
  ReviewEvent,
} from '../../../../src/domain/types.js';
import { db } from '../../database/mongo.js';

interface BaseSession {
  _id: string;
  userId: string;
  active: boolean;
  version: number;
  index: number;
  paused: boolean;
  draftAnswer: string;
  createdAt: number;
}

export interface LearnSession extends BaseSession {
  mode: 'learn';
  topicId: string | null;
  phase: 'front' | 'recall' | 'complete';
  items: {
    attemptId: string;
    entry: Entry;
  }[];
}

export interface ReviewSession extends BaseSession {
  mode: 'review';
  topicId: null;
  phase: 'question' | 'feedback' | 'complete';
  items: {
    attemptId: string;
    entry: Entry;
    expectedVersion: number;
    example: Example;
    cells: ClozeCell[];
  }[];
  feedback: {
    progress: Progress;
    event: ReviewEvent;
  } | null;
}

export type StudySession = LearnSession | ReviewSession;

export interface StudyReceipt {
  _id: string;
  userId: string;
  sessionId: string;
  progress: Progress;
  event: ReviewEvent;
}

export const studySessions =
  db.collection<StudySession>('study_sessions');

export const studyReceipts =
  db.collection<StudyReceipt>('study_receipts');

export async function ensureStudyIndexes() {
  await studySessions.createIndex(
    { userId: 1 },
    {
      unique: true,
      partialFilterExpression: { active: true },
    },
  );

  await studySessions.createIndex({
    userId: 1,
    createdAt: -1,
  });

  await studyReceipts.createIndex({
    userId: 1,
    sessionId: 1,
  });
}