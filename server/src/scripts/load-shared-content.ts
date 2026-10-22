import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { z } from 'zod';

import {
  contentSchema,
  topicSchema,
} from '../../../src/content/schema.js';

import type {
  Entry,
  Topic,
} from '../../../src/domain/types.js';

const manifestSchema = z.object({
  schemaVersion: z.literal(1),
  packs: z.array(
    z.object({
      url: z.string().startsWith('/content/'),
      contentVersion: z.string().min(1),
      sha256: z.string().regex(/^[a-f0-9]{64}$/),
    }),
  ).min(1),
});

export async function loadSharedContent() {
  const publicRoot = resolve('public');

  const manifest = manifestSchema.parse(
    JSON.parse(
      await readFile(resolve(publicRoot, 'content/index.json'), 'utf8'),
    ),
  );

  const catalog = z.array(topicSchema).parse(
    JSON.parse(
      await readFile(resolve('content/catalog.json'), 'utf8'),
    ),
  );

  if (new Set(catalog.map((topic) => topic.id)).size !== catalog.length) {
    throw new Error('Catalog có topic trùng ID.');
  }

  const entries = new Map<string, Entry>();
  const topics = new Map<string, Topic>(
    catalog.map((topic) => [topic.id, topic]),
  );

  for (const item of manifest.packs) {
    const file = resolve(publicRoot, `.${item.url}`);

    if (!file.startsWith(publicRoot + sep)) {
      throw new Error('Đường dẫn gói từ không hợp lệ.');
    }

    const buffer = await readFile(file);
    const checksum = createHash('sha256').update(buffer).digest('hex');

    if (checksum !== item.sha256) {
      throw new Error(`Checksum không khớp: ${item.url}`);
    }

    const pack = contentSchema.parse(
      JSON.parse(buffer.toString('utf8')),
    );

    if (pack.contentVersion !== item.contentVersion) {
      throw new Error(`Phiên bản không khớp: ${item.url}`);
    }

    for (const entry of pack.entries) {
      if (entry.collectionId === 'personal') {
        throw new Error(
          'Không được nhập từ cá nhân vào thư viện dùng chung.',
        );
      }

      const previous = entries.get(entry.id);

      if (previous && !isDeepStrictEqual(previous, entry)) {
        throw new Error(`Hai gói chứa nội dung khác nhau: ${entry.id}`);
      }

      entries.set(entry.id, entry);
    }

    for (const topic of pack.topics) {
      const previous = topics.get(topic.id);

      if (!previous) {
        throw new Error(`Topic chưa có trong catalog: ${topic.id}`);
      }

      if (
        previous.collectionId !== topic.collectionId ||
        previous.nameEn !== topic.nameEn ||
        previous.nameVi !== topic.nameVi ||
        previous.order !== topic.order
      ) {
        throw new Error(`Thông tin topic không khớp: ${topic.id}`);
      }

      topics.set(topic.id, {
        ...previous,
        entryIds: [
          ...new Set([...previous.entryIds, ...topic.entryIds]),
        ],
      });
    }
  }

  // Kiểm tra toàn bộ dữ liệu sau khi ghép các gói.
  return contentSchema.parse({
    schemaVersion: 1,
    contentVersion: 'online-library-v1',
    entries: [...entries.values()],
    topics: [...topics.values()],
  });
}