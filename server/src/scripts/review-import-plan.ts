import { isDeepStrictEqual } from 'node:util';
import { contentSchema, entrySchema, topicSchema } from '../../../src/content/schema.js';
import type { Entry, Topic } from '../../../src/domain/types.js';

export interface ReviewAddition {
  entryId: string;
  headword: string;
}

export interface ReviewTopicRow {
  topicId: string;
  collectionId: 'ielts' | 'daily';
  order: number;
  nameEn: string;
  nameVi: string;
  currentCount: number;
  addedCount: number;
  totalAfter: number;
  currentWords: Array<{ id: string }>;
  proposedAdditions: ReviewAddition[];
  publishPack: string;
}

export interface ReviewedPackage {
  topicRows: ReviewTopicRow[];
  packsByTopic: Map<string, ReturnType<typeof contentSchema.parse>>;
  entriesById: Map<string, Entry>;
}

export interface StoredEntry extends Entry {
  _id: string;
}

export interface StoredTopic extends Topic {
  _id: string;
}

export interface ImportSnapshot {
  entries: StoredEntry[];
  topics: StoredTopic[];
}

export interface TopicAppend {
  topicId: string;
  entryIdsBefore: string[];
  entryIdsToAdd: string[];
  entryIdsAfter: string[];
}

export interface ReviewedImportPlan {
  topicCount: number;
  additionReferences: number;
  uniqueAdditionEntryIds: number;
  entriesToInsert: Entry[];
  entriesAlreadyPresent: string[];
  topicsToAppend: TopicAppend[];
  unchangedTopics: number;
  resultingEntries: number;
  resultingTopicLinks: number;
  maximumTopicSize: number;
}

const normalized = (value: string) =>
  value.normalize('NFKC').trim().toLocaleLowerCase().replace(/\s+/gu, ' ');

function inScope(topic: Topic) {
  return topic.collectionId === 'ielts' ? topic.order >= 56 : topic.order >= 11;
}

function expectedTopicIds(catalog: Topic[]) {
  return catalog.filter(inScope).map((topic) => topic.id);
}

function entryFromStored(document: StoredEntry): Entry {
  const { _id: _ignored, ...entry } = document;
  return entrySchema.parse(entry);
}

function topicFromStored(document: StoredTopic): Topic {
  const { _id: _ignored, ...topic } = document;
  return topicSchema.parse(topic);
}

function assertEntrySourceQuality(entry: Entry) {
  const meaningSource = entry.provenance.find((source) => source.field === 'meaning');
  const exampleSource = entry.provenance.find((source) => source.field === 'example');
  if (!meaningSource || !exampleSource) {
    throw new Error(`Entry ${entry.id} thiếu provenance cho nghĩa hoặc ví dụ.`);
  }
  for (const source of [meaningSource, exampleSource]) {
    if (!source.attribution.trim() || !source.license.trim()) {
      throw new Error(`Entry ${entry.id} thiếu attribution hoặc license.`);
    }
    if (source.status === 'verified') {
      throw new Error(`Entry ${entry.id} bị đánh dấu verified nhưng gói crawl chưa có bằng chứng xác minh.`);
    }
  }
  if (entry.cefr.level !== null || entry.cefr.status !== 'unknown') {
    throw new Error(`Entry crawl mới ${entry.id} có CEFR chưa được nguồn cung cấp.`);
  }
  if (entry.pronunciation.ipa && !entry.provenance.some((source) => source.field === 'ipa')) {
    throw new Error(`Entry ${entry.id} có IPA nhưng thiếu provenance.`);
  }
}

export function buildReviewedImportPlan(input: {
  catalog: Topic[];
  currentContent: ReturnType<typeof contentSchema.parse>;
  reviewed: ReviewedPackage;
  snapshot: ImportSnapshot;
}): ReviewedImportPlan {
  const { catalog, currentContent, reviewed, snapshot } = input;
  const parsedCurrent = contentSchema.parse(currentContent);
  const parsedCatalog = catalog.map((topic) => topicSchema.parse(topic));
  if (new Set(parsedCatalog.map((topic) => topic.id)).size !== parsedCatalog.length) {
    throw new Error('Catalog có topic trùng ID.');
  }
  if (parsedCatalog.length !== 200) throw new Error(`Catalog phải giữ nguyên 200 topic, hiện có ${parsedCatalog.length}.`);
  const catalogById = new Map(parsedCatalog.map((topic) => [topic.id, topic]));
  const targetIds = expectedTopicIds(parsedCatalog);
  if (targetIds.length !== 135 || reviewed.topicRows.length !== 135) {
    throw new Error(`Phạm vi phải có 135 topic; catalog=${targetIds.length}, package=${reviewed.topicRows.length}.`);
  }

  const rowsById = new Map(reviewed.topicRows.map((row) => [row.topicId, row]));
  if (rowsById.size !== reviewed.topicRows.length || targetIds.some((id) => !rowsById.has(id))) {
    throw new Error('Package thiếu topic, lặp ID hoặc chứa phạm vi không đúng.');
  }

  const currentTopics = new Map(parsedCurrent.topics.map((topic) => [topic.id, topic]));
  const currentEntries = new Map(parsedCurrent.entries.map((entry) => [entry.id, entry]));
  const databaseEntries = new Map<string, Entry>();
  for (const document of snapshot.entries) {
    if (databaseEntries.has(document._id)) throw new Error(`Mongo snapshot có entry trùng ID ${document._id}.`);
    if (document._id !== document.id) throw new Error(`Mongo entry _id không khớp id: ${document._id}.`);
    databaseEntries.set(document._id, entryFromStored(document));
  }

  const databaseTopics = new Map<string, Topic>();
  for (const document of snapshot.topics) {
    if (databaseTopics.has(document._id)) throw new Error(`Mongo snapshot có topic trùng ID ${document._id}.`);
    if (document._id !== document.id) throw new Error(`Mongo topic _id không khớp id: ${document._id}.`);
    databaseTopics.set(document._id, topicFromStored(document));
  }
  const missingDbTopics = targetIds.filter((id) => !databaseTopics.has(id));
  if (missingDbTopics.length) throw new Error(`Mongo thiếu topic hiện có: ${missingDbTopics.join(', ')}.`);

  const additionsByTopic = new Map<string, string[]>();
  const incomingEntries = new Map<string, Entry>();
  let additionReferences = 0;
  for (const topicId of targetIds) {
    const row = rowsById.get(topicId)!;
    const canonicalTopic = catalogById.get(topicId)!;
    const publicTopic = currentTopics.get(topicId);
    const dbTopic = databaseTopics.get(topicId)!;
    const pack = reviewed.packsByTopic.get(topicId);
    if (!publicTopic || !pack || pack.topics.length !== 1) {
      throw new Error(`Thiếu topic hiện hành hoặc pack cho ${topicId}.`);
    }

    const topicRecords = [
      {id: row.topicId, collectionId: row.collectionId, order: row.order, nameEn: row.nameEn, nameVi: row.nameVi},
      pack.topics[0]!,
      publicTopic,
      dbTopic,
    ];
    for (const topic of topicRecords) {
      if (
        topic.id !== canonicalTopic.id ||
        topic.collectionId !== canonicalTopic.collectionId ||
        topic.order !== canonicalTopic.order ||
        topic.nameEn !== canonicalTopic.nameEn ||
        topic.nameVi !== canonicalTopic.nameVi
      ) {
        throw new Error(`Thông tin ID/tên/thứ tự topic không khớp catalog: ${topicId}.`);
      }
    }

    const currentIds = row.currentWords.map((entry) => entry.id);
    if (
      row.currentCount !== currentIds.length ||
      !isDeepStrictEqual(publicTopic.entryIds, currentIds)
    ) {
      throw new Error(`Danh sách từ đang có trong báo cáo khác public content: ${topicId}.`);
    }
    for (const currentId of currentIds) {
      const publicEntry = currentEntries.get(currentId);
      const packedEntry = reviewed.entriesById.get(currentId);
      if (!publicEntry || !packedEntry || !isDeepStrictEqual(publicEntry, packedEntry)) {
        throw new Error(`Pack đã thay đổi hoặc thiếu mục từ cũ ${currentId} ở ${topicId}.`);
      }
    }
    const proposedIds = row.proposedAdditions.map((entry) => entry.entryId);
    if (
      row.addedCount !== proposedIds.length ||
      row.totalAfter !== currentIds.length + proposedIds.length ||
      row.totalAfter > 10 ||
      new Set(proposedIds).size !== proposedIds.length ||
      !isDeepStrictEqual(pack.topics[0]!.entryIds, [...currentIds, ...proposedIds])
    ) {
      throw new Error(`Báo cáo/pack sai số lượng, thứ tự hoặc vượt 10 từ ở ${topicId}.`);
    }

    const linked = new Set(dbTopic.entryIds);
    if (linked.size !== dbTopic.entryIds.length || dbTopic.entryIds.length > 10) {
      throw new Error(`Topic Mongo có liên kết trùng hoặc vượt giới hạn 10: ${topicId}.`);
    }
    for (const existingId of dbTopic.entryIds) {
      const stored = databaseEntries.get(existingId);
      if (!stored) throw new Error(`Topic Mongo ${topicId} tham chiếu entry thiếu: ${existingId}.`);
      if (stored.collectionId !== canonicalTopic.collectionId) {
        throw new Error(`Topic Mongo ${topicId} có entry khác collection: ${existingId}.`);
      }
    }

    const additions: string[] = [];
    for (const proposed of row.proposedAdditions) {
      additionReferences += 1;
      const entry = reviewed.entriesById.get(proposed.entryId);
      if (!entry || !pack.entries.some((candidate) => candidate.id === proposed.entryId)) {
        throw new Error(`Gói thiếu entry được báo cáo ${proposed.entryId} (${topicId}).`);
      }
      if (
        normalized(entry.headword) !== normalized(proposed.headword) ||
        entry.collectionId !== canonicalTopic.collectionId
      ) {
        throw new Error(`Headword/collectionId không khớp ở ${topicId}: ${proposed.entryId}.`);
      }
      const baseline = currentEntries.get(entry.id);
      if (baseline && !isDeepStrictEqual(baseline, entry)) {
        throw new Error(`Entry ${entry.id} trong gói khác public content hiện hành.`);
      }
      if (!baseline) assertEntrySourceQuality(entry);
      const previous = incomingEntries.get(entry.id);
      if (previous && !isDeepStrictEqual(previous, entry)) {
        throw new Error(`Hai topic đưa nội dung khác nhau cho cùng entry ID ${entry.id}.`);
      }
      incomingEntries.set(entry.id, entry);
      additions.push(entry.id);
    }
    additionsByTopic.set(topicId, additions);
  }

  for (const entryId of new Set([...databaseTopics.values()].flatMap((topic) => topic.entryIds))) {
    if (!databaseEntries.has(entryId)) throw new Error(`Mongo topic tham chiếu entry chưa được đọc: ${entryId}.`);
  }

  const entriesToInsert: Entry[] = [];
  const entriesAlreadyPresent: string[] = [];
  for (const [entryId, incoming] of incomingEntries) {
    const existing = databaseEntries.get(entryId);
    if (existing) {
      if (!isDeepStrictEqual(existing, incoming)) {
        throw new Error(`Xung đột entry cùng ID trong MongoDB; dừng trước khi ghi: ${entryId}.`);
      }
      entriesAlreadyPresent.push(entryId);
    } else {
      entriesToInsert.push(incoming);
    }
  }

  const topicsToAppend: TopicAppend[] = [];
  let unchangedTopics = 0;
  for (const topicId of targetIds) {
    const existing = databaseTopics.get(topicId)!;
    const entryIdsToAdd = (additionsByTopic.get(topicId) ?? []).filter((id) => !existing.entryIds.includes(id));
    const entryIdsAfter = [...existing.entryIds, ...entryIdsToAdd];
    if (entryIdsAfter.length > 10) {
      throw new Error(`Topic ${topicId} sẽ vượt giới hạn 10 từ (${entryIdsAfter.length}); chưa ghi gì.`);
    }
    if (entryIdsToAdd.length) {
      topicsToAppend.push({topicId, entryIdsBefore: [...existing.entryIds], entryIdsToAdd, entryIdsAfter});
    } else {
      unchangedTopics += 1;
    }
  }

  const allEntries = new Map(currentEntries);
  for (const [id, entry] of databaseEntries) {
    const previous = allEntries.get(id);
    if (previous && !isDeepStrictEqual(previous, entry)) continue;
    allEntries.set(id, entry);
  }
  for (const [id, entry] of incomingEntries) allEntries.set(id, entry);
  const finalTopics = parsedCurrent.topics.map((topic) => {
    const row = databaseTopics.get(topic.id);
    if (!row) return topic;
    return {...topic, entryIds: [...row.entryIds, ...(additionsByTopic.get(topic.id) ?? []).filter((id) => !row.entryIds.includes(id))]};
  });
  contentSchema.parse({
    schemaVersion: 1,
    contentVersion: 'reviewed-import-preflight',
    entries: [...allEntries.values()],
    topics: finalTopics,
  });

  return {
    topicCount: targetIds.length,
    additionReferences,
    uniqueAdditionEntryIds: incomingEntries.size,
    entriesToInsert,
    entriesAlreadyPresent,
    topicsToAppend,
    unchangedTopics,
    resultingEntries: allEntries.size,
    resultingTopicLinks: finalTopics.reduce((sum, topic) => sum + topic.entryIds.length, 0),
    maximumTopicSize: Math.max(...finalTopics.map((topic) => topic.entryIds.length)),
  };
}
