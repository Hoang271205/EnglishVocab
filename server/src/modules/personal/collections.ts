import type { Entry } from '../../../../src/domain/types.js';
import { db } from '../../database/mongo.js';

export interface PersonalEntry {
  _id: string;
  userId: string;
  entry: Entry;
  createdAt: number;
  updatedAt: number;
  studyUseVersion?: number;
}

export const personalEntries = db.collection<PersonalEntry>('personal_entries');

export async function ensurePersonalIndexes() {
  await personalEntries.createIndex(
    { userId: 1, 'entry.headword': 1 },
    {
      name: 'personal_headword_lookup',
      collation: { locale: 'en', strength: 2 },
    },
  );
  await personalEntries.createIndex(
    { userId: 1, 'entry.id': 1 },
    { unique: true },
  );

  await personalEntries.createIndex({
    userId: 1,
    createdAt: -1,
  });
}
