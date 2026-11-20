import { isDeepStrictEqual } from 'node:util';
import { contentSchema } from '../../../src/content/schema.js';
import type { Entry, Topic } from '../../../src/domain/types.js';

export interface Part2Snapshot {
  entries: Array<Entry & { _id: string }>;
  topics: Array<Topic & { _id: string }>;
}
export interface Part2Plan {
  entriesToInsert: Entry[];
  topicsToInsert: Topic[];
  existingEntries: number;
  existingTopics: number;
}
export const normalizedHeadword = (word: string) =>
  word
    .normalize('NFKC')
    .toLocaleLowerCase('en')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
const withoutMongoId = <T extends { _id: string }>(doc: T): Omit<T, '_id'> => {
  const { _id: ignored, ...value } = doc;
  void ignored;
  return value;
};

export function buildPart2Plan(input: {
  package: unknown;
  catalog: Topic[];
  snapshot: Part2Snapshot;
}): Part2Plan {
  const pack = contentSchema.parse(input.package);
  const { catalog, snapshot } = input;
  if (
    catalog.length !== 200 ||
    pack.topics.length !== 200 ||
    pack.entries.length !== 2000
  )
    throw new Error('Part 2 requires 200 topics and 2000 reviewed entries.');
  const parents = new Map(catalog.map((t) => [t.id, t]));
  const storedTopics = new Map(snapshot.topics.map((t) => [t.id, t]));
  const storedEntries = new Map(snapshot.entries.map((e) => [e.id, e]));
  const incoming = new Map(pack.entries.map((e) => [e.id, e]));
  const linked = new Set<string>();
  const seenParents = new Set<string>();
  const headOwners = new Map<string, Entry[]>();
  const plan: Part2Plan = {
    entriesToInsert: [],
    topicsToInsert: [],
    existingEntries: 0,
    existingTopics: 0,
  };

  for (const doc of [...snapshot.entries, ...pack.entries]) {
    const group = headOwners.get(normalizedHeadword(doc.headword)) ?? [];
    if (!group.some((e) => e.id === doc.id)) group.push(doc);
    headOwners.set(normalizedHeadword(doc.headword), group);
  }
  for (const entry of pack.entries) {
    if (
      entry.contentStatus !== 'ready' ||
      !entry.id.startsWith(`part2-${entry.collectionId}-`)
    )
      throw new Error(`Invalid Part 2 entry: ${entry.id}`);
    const group = headOwners.get(normalizedHeadword(entry.headword))!;
    const reviewedFollowUp =
      group.length === 2 &&
      group.some(
        (e) => e.id === 'part2-daily-043-follow-up' && e.partOfSpeech === 'n.',
      ) &&
      group.some(
        (e) =>
          e.id === 'part2-daily-053-follow-up' &&
          e.partOfSpeech === 'v. phrase',
      );
    if (group.length > 1 && !reviewedFollowUp)
      throw new Error(`Headword collision requires review: ${entry.headword}`);
    const stored = storedEntries.get(entry.id);
    if (stored) {
      if (
        stored._id !== entry.id ||
        !isDeepStrictEqual(withoutMongoId(stored), entry)
      )
        throw new Error(`Entry content conflict: ${entry.id}`);
      plan.existingEntries++;
    } else plan.entriesToInsert.push(entry);
  }
  for (const topic of pack.topics) {
    const parent = parents.get(topic.parentTopicId ?? '');
    const storedParent = parent ? storedTopics.get(parent.id) : undefined;
    if (
      !parent ||
      parent.part ||
      !storedParent ||
      storedParent._id !== parent.id ||
      seenParents.has(parent.id)
    )
      throw new Error(`Missing/duplicate Part 1 parent: ${topic.id}`);
    seenParents.add(parent.id);
    for (const field of [
      'id',
      'collectionId',
      'nameEn',
      'nameVi',
      'order',
    ] as const) {
      if (storedParent[field] !== parent[field])
        throw new Error(`Parent differs from catalog: ${parent.id}/${field}`);
    }
    if (
      topic.part !== 2 ||
      topic.id !== `${parent.id}-part-2` ||
      topic.collectionId !== parent.collectionId ||
      topic.order !== parent.order + 100 ||
      topic.nameEn !== `${parent.nameEn} (Part 2)` ||
      topic.nameVi !== `${parent.nameVi} (Phần 2)` ||
      topic.entryIds.length !== 10
    )
      throw new Error(`Part 2 metadata/size mismatch: ${topic.id}`);
    for (const id of topic.entryIds) {
      const entry = incoming.get(id);
      if (!entry || entry.collectionId !== topic.collectionId || linked.has(id))
        throw new Error(`Invalid/shared Part 2 entry link: ${id}`);
      linked.add(id);
    }
    const collision = snapshot.topics.find(
      (t) =>
        t.collectionId === topic.collectionId &&
        t.order === topic.order &&
        t.id !== topic.id,
    );
    if (collision) throw new Error(`Storage order occupied by ${collision.id}`);
    const stored = storedTopics.get(topic.id);
    if (stored) {
      if (
        stored._id !== topic.id ||
        !isDeepStrictEqual(withoutMongoId(stored), topic)
      )
        throw new Error(`Topic content conflict: ${topic.id}`);
      plan.existingTopics++;
    } else plan.topicsToInsert.push(topic);
  }
  if (linked.size !== 2000 || seenParents.size !== 200)
    throw new Error('Orphan entries or incomplete parent coverage.');
  return plan;
}

export async function executePart2Import<S>(input: {
  write: boolean;
  read: (session?: S) => Promise<Part2Snapshot>;
  plan: (snapshot: Part2Snapshot) => Part2Plan;
  transaction: (work: (session: S) => Promise<Part2Plan>) => Promise<Part2Plan>;
  apply: (session: S, plan: Part2Plan) => Promise<void>;
}) {
  if (!input.write)
    return { applied: false, plan: input.plan(await input.read()) };
  const plan = await input.transaction(async (session) => {
    const candidate = input.plan(await input.read(session));
    await input.apply(session, candidate);
    return candidate;
  });
  return { applied: true, plan };
}
