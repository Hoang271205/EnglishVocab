import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { z } from 'zod';
import { contentSchema } from '../../../src/content/schema.js';
import type { Entry, Topic } from '../../../src/domain/types.js';

const webUrl = z.url().refine(value => new URL(value).protocol === 'https:');
const usageEvidence = z.object({
  url: webUrl,
  kind: z.enum(['publisher_common_list', 'publisher_common_usage_claim', 'corpus_frequency']),
  publishedYear: z.number().int().min(2020).max(2026),
  sourceExpression: z.string().trim().min(1),
  observationStart: z.number().int().min(2020).max(2026).nullable(),
  observationEnd: z.number().int().min(2020).max(2026).nullable(),
  frequencyPerMillion: z.number().positive().nullable(),
  assessment: z.string().trim().min(1),
}).strict().superRefine((value, ctx) => {
  if (value.kind === 'corpus_frequency' && (
    value.observationStart === null || value.observationEnd === null ||
    value.frequencyPerMillion === null ||
    value.observationStart > value.observationEnd
  )) ctx.addIssue({ code: 'custom', message: 'Corpus evidence needs its actual observation window and frequency.' });
});

export const idiomsQualitySchema = z.object({
  schemaVersion: z.literal(1),
  packageSha256: z.string().regex(/^[a-f0-9]{64}$/),
  status: z.literal('reviewed'),
  unresolvedEntryIds: z.array(z.string()).length(0),
  entries: z.array(z.object({
    entryId: z.string(),
    senseKey: z.string(),
    topicId: z.string(),
    meaningReferenceUrls: z.array(webUrl).min(1),
    popularityAssessment: z.enum(['editorial_selection_only', 'dated_qualitative_signal', 'measured_frequency']),
    usageEvidence: z.array(usageEvidence),
    classification: z.enum(['idiom', 'idiomatic_phrasal_verb', 'idiomatic_formula']),
    meaningExampleTopicReviewed: z.literal(true),
    reviewNote: z.string().trim().min(1),
  }).strict().superRefine((review, ctx) => {
    if (review.popularityAssessment === 'dated_qualitative_signal' &&
      !review.usageEvidence.some(e => e.kind === 'publisher_common_list' || e.kind === 'publisher_common_usage_claim'))
      ctx.addIssue({ code: 'custom', message: 'Dated qualitative popularity assessment needs its cited publisher signal.' });
    if (review.popularityAssessment === 'measured_frequency' &&
      !review.usageEvidence.some(e => e.kind === 'corpus_frequency'))
      ctx.addIssue({ code: 'custom', message: 'Measured popularity needs corpus frequency evidence.' });
  })).length(500),
}).strict();

export type IdiomsPack = z.infer<typeof contentSchema>;
export interface IdiomsSnapshot {
  entries: Array<Entry & { _id: string }>;
  topics: Array<Topic & { _id: string }>;
}
export interface IdiomsPlan {
  entriesToInsert: Entry[];
  topicsToInsert: Topic[];
  existingEntries: number;
  existingTopics: number;
}
export const idiomsPackageHash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
export const idiomsHeadwordKey = (word: string) => word.normalize('NFKC').toLocaleLowerCase('en')
  .replace(/[’‘]/g, "'").replace(/\b(your|one's|his|her|my|their)\b/g, 'POSS')
  .replace(/\b(someone|somebody)\b/g, 'PERSON')
  .replace(/\s+/g, ' ').trim();

export function validateIdiomsPackage(bytes: Uint8Array, qualityInput: unknown): IdiomsPack {
  const pack = contentSchema.parse(JSON.parse(Buffer.from(bytes).toString('utf8')));
  const quality = idiomsQualitySchema.parse(qualityInput);
  if (idiomsPackageHash(bytes) !== quality.packageSha256) throw new Error('Idioms quality report checksum mismatch.');
  if (pack.entries.length !== 500 || pack.topics.length !== 100) throw new Error('Idioms requires 100 topics and 500 entries.');
  if (new Set(pack.entries.map(e => idiomsHeadwordKey(e.headword))).size !== 500) throw new Error('Duplicate Idioms headword or pronoun variant.');
  const entries = new Map(pack.entries.map(e => [e.id, e]));
  const reviews = new Map(quality.entries.map(e => [e.entryId, e]));
  if (reviews.size !== 500) throw new Error('Duplicate/missing Idioms entry review.');
  const links = new Set<string>();
  const orders = new Set<number>();
  for (const topic of pack.topics) {
    if (topic.collectionId !== 'idioms' || topic.id !== `idioms-${String(topic.order).padStart(3, '0')}` ||
      topic.entryIds.length !== 5 || orders.has(topic.order)) throw new Error(`Invalid Idioms topic: ${topic.id}`);
    orders.add(topic.order);
    for (const id of topic.entryIds) {
      const entry = entries.get(id);
      const review = reviews.get(id);
      if (!entry || !review || links.has(id) || review.topicId !== topic.id || review.senseKey !== entry.senseKey)
        throw new Error(`Invalid or unreviewed Idioms link: ${topic.id}/${id}`);
      links.add(id);
    }
  }
  if (links.size !== 500) throw new Error('Orphan Idioms entry.');
  for (const entry of pack.entries) {
    const expectedId = 'idiom-sense-' + createHash('sha256').update(idiomsHeadwordKey(entry.headword)).digest('hex').slice(0, 20);
    if (entry.collectionId !== 'idioms' || entry.id !== expectedId || entry.contentStatus !== 'ready')
      throw new Error(`Idioms entry is not ready or has the wrong namespace: ${entry.id}`);
    const review = reviews.get(entry.id)!;
    for (const url of [...review.meaningReferenceUrls, ...review.usageEvidence.map(e => e.url)]) {
      if (!entry.provenance.some(p => p.url === url))
        throw new Error(`Review source missing from entry provenance: ${entry.id}`);
    }
    for (const field of ['meaning', 'example'] as const) {
      if (!entry.provenance.some(p => p.field === field && p.attribution.trim() && p.license.trim()))
        throw new Error(`Missing ${field} provenance: ${entry.id}`);
    }
    for (const [field, present] of [['ipa', Boolean(entry.pronunciation.ipa)], ['cefr', Boolean(entry.cefr.level)]] as const) {
      if (present && !entry.provenance.some(p => p.field === field && p.url))
        throw new Error(`Missing optional ${field} source: ${entry.id}`);
    }
    // A report cannot re-label authored material or manufacture a verification flag.
    if (entry.provenance.some(p => p.status === 'verified')) throw new Error(`Unsupported verified label: ${entry.id}`);
  }
  return pack;
}

function storedContent<T extends { _id: string }>(document: T): Omit<T, '_id'> {
  const { _id, ...content } = document;
  void _id;
  return content;
}

// New-only import. Every conflict is checked before the caller may write anything.
export function buildIdiomsPlan(pack: IdiomsPack, snapshot: IdiomsSnapshot): IdiomsPlan {
  const plan: IdiomsPlan = { entriesToInsert: [], topicsToInsert: [], existingEntries: 0, existingTopics: 0 };
  for (const entry of pack.entries) {
    const matches = snapshot.entries.filter(e => e.id === entry.id || e._id === entry.id);
    if (matches.length > 1 || matches.some(e => e._id !== entry.id || !isDeepStrictEqual(storedContent(e), entry)))
      throw new Error(`Entry content conflict: ${entry.id}`);
    if (snapshot.entries.some(e => e.collectionId === 'idioms' && e.id !== entry.id && idiomsHeadwordKey(e.headword) === idiomsHeadwordKey(entry.headword)))
      throw new Error(`Idioms headword collision: ${entry.headword}`);
    if (matches.length) plan.existingEntries++;
    else plan.entriesToInsert.push(entry);
  }
  for (const topic of pack.topics) {
    const matches = snapshot.topics.filter(t => t.id === topic.id || t._id === topic.id);
    if (matches.length > 1 || matches.some(t => t._id !== topic.id || !isDeepStrictEqual(storedContent(t), topic)))
      throw new Error(`Topic content conflict: ${topic.id}`);
    if (snapshot.topics.some(t => t.collectionId === 'idioms' && t.order === topic.order && t.id !== topic.id))
      throw new Error(`Idioms topic order is occupied: ${topic.order}`);
    if (matches.length) plan.existingTopics++;
    else plan.topicsToInsert.push(topic);
  }
  return plan;
}

export async function executeIdiomsImport<S>(input: {
  write: boolean;
  read: (session?: S) => Promise<IdiomsSnapshot>;
  plan: (snapshot: IdiomsSnapshot) => IdiomsPlan;
  transaction: (work: (session: S) => Promise<IdiomsPlan>) => Promise<IdiomsPlan>;
  apply: (session: S, plan: IdiomsPlan) => Promise<void>;
}) {
  if (!input.write) return { applied: false, plan: input.plan(await input.read()) };
  const plan = await input.transaction(async session => {
    const candidate = input.plan(await input.read(session));
    await input.apply(session, candidate);
    return candidate;
  });
  return { applied: true, plan };
}
