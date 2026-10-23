import { readdir, readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { resolve, sep } from 'node:path';
import { z } from 'zod';
import { contentSchema } from '../../../src/content/schema.js';
import type { Entry, Topic } from '../../../src/domain/types.js';
import type { ReviewedPackage, ReviewTopicRow } from './review-import-plan.js';

const reportSchema = z.object({
  schemaVersion: z.literal(1),
  topics: z.array(z.object({
    topicId: z.string(),
    collectionId: z.enum(['ielts', 'daily']),
    order: z.number().int(),
    nameEn: z.string(),
    nameVi: z.string(),
    currentCount: z.number().int().nonnegative(),
    addedCount: z.number().int().nonnegative(),
    totalAfter: z.number().int().nonnegative(),
    currentWords: z.array(z.object({id: z.string()})),
    proposedAdditions: z.array(z.object({entryId: z.string(), headword: z.string()})),
    publishPack: z.string(),
  }).passthrough()).length(135),
}).passthrough();

const normalized = (value: string) =>
  value.normalize('NFKC').trim().toLocaleLowerCase().replace(/\s+/gu, ' ');

function inScope(topic: Topic) {
  return topic.collectionId === 'ielts' ? topic.order >= 56 : topic.order >= 11;
}

export async function loadReviewedPackage(packageDirectory: string): Promise<ReviewedPackage> {
  const root = resolve(packageDirectory);
  const report = reportSchema.parse(
    JSON.parse(await readFile(resolve(root, 'topic-report.json'), 'utf8')),
  );
  const topicRows = report.topics as ReviewTopicRow[];
  const packsByTopic = new Map<string, ReturnType<typeof contentSchema.parse>>();
  const entriesById = new Map<string, Entry>();

  for (const row of topicRows) {
    const path = resolve(root, row.publishPack);
    const publishRoot = resolve(root, 'publish-packs');
    if (!path.startsWith(publishRoot + sep)) {
      throw new Error(`Đường dẫn pack không hợp lệ: ${row.publishPack}.`);
    }
    const pack = contentSchema.parse(JSON.parse(await readFile(path, 'utf8')));
    if (pack.topics.length !== 1 || pack.topics[0]!.id !== row.topicId) {
      throw new Error(`Pack không có đúng topic ${row.topicId}: ${row.publishPack}.`);
    }
    if (packsByTopic.has(row.topicId)) throw new Error(`Report có topic trùng ID: ${row.topicId}.`);
    packsByTopic.set(row.topicId, pack);
    for (const entry of pack.entries) {
      const previous = entriesById.get(entry.id);
      if (previous && !isDeepStrictEqual(previous, entry)) {
        throw new Error(`Hai pack khác nội dung cho cùng entry ID ${entry.id}.`);
      }
      entriesById.set(entry.id, entry);
    }
  }

  const folderFiles = await readdir(resolve(root, 'publish-packs'), {withFileTypes: true});
  if (folderFiles.some((item) => !item.isDirectory() && item.name.endsWith('.json'))) {
    throw new Error('Pack phải nằm trong các thư mục collection/topic như report đã khai báo.');
  }

  return {topicRows, packsByTopic, entriesById};
}

export function validateReviewedPackageAgainstCatalog(
  reviewed: ReviewedPackage,
  catalog: Topic[],
) {
  const targetTopics = catalog.filter(inScope).sort((a, b) => a.collectionId.localeCompare(b.collectionId) || a.order - b.order);
  if (catalog.length !== 200 || targetTopics.length !== 135 || reviewed.topicRows.length !== 135) {
    throw new Error(`Catalog phải giữ 200 topic và gói phải có đúng 135 topic trong phạm vi (catalog=${catalog.length}, target=${targetTopics.length}, package=${reviewed.topicRows.length}).`);
  }
  const rows = new Map(reviewed.topicRows.map((row) => [row.topicId, row]));
  if (rows.size !== reviewed.topicRows.length) throw new Error('Report có topic ID trùng.');
  for (const topic of targetTopics) {
    const row = rows.get(topic.id);
    const pack = reviewed.packsByTopic.get(topic.id);
    const packTopic = pack?.topics[0];
    if (!row || !packTopic) throw new Error(`Gói rà soát thiếu topic ${topic.id}.`);
    for (const item of [row, packTopic]) {
      const id = 'topicId' in item ? item.topicId : item.id;
      if (
        id !== topic.id ||
        item.collectionId !== topic.collectionId ||
        item.order !== topic.order ||
        item.nameEn !== topic.nameEn ||
        item.nameVi !== topic.nameVi
      ) {
        throw new Error(`ID/tên/thứ tự topic sai catalog: ${topic.id}.`);
      }
    }
    const expectedIds = [
      ...row.currentWords.map((entry) => entry.id),
      ...row.proposedAdditions.map((entry) => entry.entryId),
    ];
    if (
      row.currentCount !== row.currentWords.length ||
      row.addedCount !== row.proposedAdditions.length ||
      row.totalAfter !== expectedIds.length ||
      row.totalAfter > 10 ||
      !isDeepStrictEqual(packTopic.entryIds, expectedIds)
      || !isDeepStrictEqual(pack.entries.map((entry) => entry.id), expectedIds)
    ) {
      throw new Error(`Báo cáo hoặc danh sách từ trong pack không khớp: ${topic.id}.`);
    }
    if (new Set(expectedIds).size !== expectedIds.length) {
      throw new Error(`Topic ${topic.id} có entry ID trùng.`);
    }
    for (const proposed of row.proposedAdditions) {
      const entry = reviewed.entriesById.get(proposed.entryId);
      if (!entry || normalized(entry.headword) !== normalized(proposed.headword)) {
        throw new Error(`Entry/headword không khớp ở ${topic.id}: ${proposed.entryId}.`);
      }
      if (entry.collectionId !== topic.collectionId) {
        throw new Error(`Entry ${entry.id} có collectionId khác topic ${topic.id}.`);
      }
    }
  }
  if ([...rows.keys()].some((id) => !targetTopics.some((topic) => topic.id === id))) {
    throw new Error('Gói chứa topic ngoài phạm vi cho phép.');
  }
}
