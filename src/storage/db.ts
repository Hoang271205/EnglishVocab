import { Dexie } from 'dexie';
import type { Table } from 'dexie';
import type { CacheRecord, Capture, Entry, Progress, ReviewEvent, Session, Setting, Topic } from '../domain/types';
export class VocabDB extends Dexie {
 entries!: Table<Entry,string>; topics!: Table<Topic,string>; progress!: Table<Progress,string>;
 events!: Table<ReviewEvent,string>; sessions!: Table<Session,string>; captures!: Table<Capture,string>;
 settings!: Table<Setting,string>; lookupCache!: Table<CacheRecord,string>;
 constructor(name = 'englishvocab') {
  super(name);
  this.version(1).stores({entries:'id, headword, collectionId, contentStatus',topics:'id, collectionId, *entryIds',progress:'entryId, nextReviewAt, level',events:'id, entryId, sessionId, reviewedAt',sessions:'id, mode',captures:'id, entryId',settings:'key'});
  this.version(2).stores({lookupCache:'key, accessedAt'});
 }
}
