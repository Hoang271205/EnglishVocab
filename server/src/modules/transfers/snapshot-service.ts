import { z } from 'zod';
import { entrySchema } from '../../../../src/content/schema.js';
import { ServiceError } from '../../../../src/domain/types.js';
import { client } from '../../database/mongo.js';
import { sharedEntries } from '../library/collections.js';
import { personalEntries } from '../personal/collections.js';
import { snapshotCounters } from './snapshot-counter.js';

const snapshotSchema = z
  .object({
    protocol: z.literal(1),
    version: z.number().int().nonnegative(),
    entries: z.array(entrySchema).max(20_000),
  })
  .strict()
  .refine(
    (snapshot) =>
      new Set(
        snapshot.entries.map((entry) => entry.id),
      ).size === snapshot.entries.length,
    'Snapshot có ID từ bị trùng.',
  );

export async function exportExtensionSnapshot(
  userId: string,
) {
  return client.withSession(async (mongoSession) =>
    mongoSession.withTransaction(
      async () => {
        const counter = await snapshotCounters.findOne(
          { _id: 'extension' },
          { session: mongoSession },
        );

        if (!counter) {
          throw new ServiceError(
            'storage',
            'Bộ đếm snapshot chưa được khởi tạo.',
          );
        }

        const shared = await sharedEntries
          .find(
            {
              collectionId: {
                $in: ['ielts', 'daily'],
              },
              contentStatus: 'ready',
            },
            {
              session: mongoSession,
              projection: { _id: 0 },
            },
          )
          .sort({ id: 1 })
          .limit(20_001)
          .toArray();

        const personal = await personalEntries
          .find(
            { userId },
            { session: mongoSession },
          )
          .sort({ 'entry.id': 1 })
          .limit(20_001)
          .toArray();

        const entries = [
          ...shared,
          ...personal.map(
            (document) => document.entry,
          ),
        ];

        if (entries.length > 20_000) {
          throw new ServiceError(
            'validation',
            'Thư viện vượt giới hạn 20.000 mục của extension.',
          );
        }

        const version = Math.max(
          Date.now(),
          counter.version + 1,
        );

        if (!Number.isSafeInteger(version)) {
          throw new ServiceError(
            'storage',
            'Phiên bản snapshot không hợp lệ.',
          );
        }

        const parsed = snapshotSchema.safeParse({
          protocol: 1,
          version,
          entries,
        });

        if (!parsed.success) {
          throw new ServiceError(
            'storage',
            'Dữ liệu thư viện chưa hợp lệ để đồng bộ.',
          );
        }

        const snapshot = parsed.data;

        // Giữ cùng giới hạn với service worker hiện tại.
        const bytes = Buffer.byteLength(
          JSON.stringify(snapshot),
          'utf8',
        );

        if (bytes > 8_000_000) {
          throw new ServiceError(
            'validation',
            'Snapshot vượt giới hạn 8 MB của extension.',
          );
        }

        const updated = await snapshotCounters.updateOne(
          {
            _id: 'extension',
            version: counter.version,
          },
          { $set: { version } },
          { session: mongoSession },
        );

        if (updated.matchedCount !== 1) {
          throw new ServiceError(
            'conflict',
            'Snapshot vừa thay đổi. Hãy thử lại.',
          );
        }

        return {
          ownerId: userId,
          snapshot,
          summary: {
            sharedEntries: shared.length,
            personalEntries: personal.length,
            totalEntries: entries.length,
            bytes,
          },
        };
      },
      {
        readConcern: { level: 'snapshot' },
        writeConcern: { w: 'majority' },
      },
    ),
  );
}