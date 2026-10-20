export const POLICY = 'fixed-5day-v2' as const;
export type Level = 1 | 2 | 3 | 4 | 5;
export type CollectionId = 'ielts' | 'daily' | 'personal';
export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export interface Source {
 field: 'meaning' | 'ipa' | 'cefr' | 'example' | 'audio' | 'definition';
 attribution: string; license: string; url: string | null;
 status: 'authored' | 'verified' | 'unverified'; checkedAt: number | null;
}
export interface Example { id: string; prefix: string; targetSurface: string; suffix: string; acceptedAnswers: string[] }
export interface Entry {
 id: string; revision: number; collectionId: CollectionId; headword: string; partOfSpeech: string;
 senseKey: string; meaningVi: string; acceptedLearnAnswers: string[];
 cefr: { level: CefrLevel | null; status: 'estimated' | 'verified' | 'unknown'; note: string };
 pronunciation: { ipa: string | null; accent: 'en-US' | null };
 examples: Example[]; provenance: Source[]; contentStatus: 'draft' | 'ready';
}
export interface Topic { id: string; collectionId: 'ielts' | 'daily'; nameEn: string; nameVi: string; order: number; entryIds: string[] }
export interface Progress {
 entryId: string; level: Level; learnedAt: number; lastReviewedAt: number | null;
 nextReviewAt: number; correctCount: number; wrongCount: number; version: number;
}
export type ClozeCell = { kind: 'fixed'; value: string } | { kind: 'blank' };
export interface Question {
 attemptId: string; meaningVi: string; partOfSpeech: string;
 prefix: string; suffix: string; cells: ClozeCell[];
}
export interface SessionItem { entryId: string; entryRevision: number; expectedVersion: number; attemptId: string; example: Example; cells: ClozeCell[] }
export interface Session {
 id: string; mode: 'learn' | 'review'; version: number; index: number;
 phase: 'front' | 'recall' | 'question' | 'feedback' | 'complete';
 items: SessionItem[]; draftAnswer: string; paused: boolean; createdAt: number;
}
export interface ReviewEvent {
 id: string; sessionId: string; entryId: string; mode: 'learn' | 'review'; correct: boolean;
 reviewedAt: number; beforeLevel: Level | null; afterLevel: Level;
 nextReviewAt: number; entryRevision: number; policy: typeof POLICY;
}
export interface Capture { id: string; entryId: string; selectedText: string; originalSentence: string; sourceUrl: string; capturedAt: number }
export interface Setting { key: string; value: unknown }
export interface CacheRecord { key: string; fetchedAt: number; accessedAt: number; payload: unknown }
export interface Clock { now(): number }
export interface SubmitCommand { sessionId: string; attemptId: string; expectedSessionVersion: number; answer: string; forgotten?: boolean }
export interface GradeResult { kind: 'committed'; event: ReviewEvent; progress: Progress }
export type ServiceErrorCode = 'validation' | 'not-found' | 'conflict' | 'storage' | 'unavailable';
export class ServiceError extends Error {
 constructor(public readonly code: ServiceErrorCode, message: string) { super(message); this.name = 'ServiceError'; }
}

export type SessionView = Omit<Session, "items"> & {items: {attemptId:string}[]};
