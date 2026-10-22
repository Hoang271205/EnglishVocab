import { createHash, randomUUID } from 'node:crypto';
import { ServiceError } from '../../../../src/domain/types.js';
import { client } from '../../database/mongo.js';
import { sharedEntries } from '../library/collections.js';
import { personalEntries } from '../personal/collections.js';
import {
  extensionEntryLinks,
  importReceipts,
  savedSources,
} from './collections.js';
import type { CaptureTransfer } from './schema.js';

function hash(value: unknown) {
  return createHash('sha256')
    .update(JSON.stringify(value))
    .digest('hex');
}

function identityHash(entry: {
  headword: string;
  partOfSpeech: string;
  senseKey: string;
}) {
  return hash([
    entry.headword,
    entry.partOfSpeech,
    entry.senseKey,
  ]);
}

export async function receiveTransfer(
  userId: string,
  transfer: CaptureTransfer,
) {
  return client.withSession(async (mongoSession) =>
    mongoSession.withTransaction(async () => {
      let createdEntries = 0;
      let receivedCaptures = 0;
      let duplicateCaptures = 0;

      for (const item of transfer.captures) {
        const receiptId = JSON.stringify([
          userId,
          item.capture.id,
        ]);

        // Không đưa đoạn văn bài đọc vào dữ liệu lưu.
        const payloadHash = hash({
          entry: item.entry,
          capture: {
            id: item.capture.id,
            entryId: item.capture.entryId,
            selectedText: item.capture.selectedText,
            sourceUrl: item.capture.sourceUrl,
            capturedAt: item.capture.capturedAt,
          },
        });

        const previous = await importReceipts.findOne(
          { _id: receiptId, userId },
          { session: mongoSession },
        );

        if (previous) {
          if (previous.payloadHash !== payloadHash) {
            throw new ServiceError(
              'conflict',
              'Một capture ID đang được dùng cho dữ liệu khác.',
            );
          }

          duplicateCaptures += 1;
          continue;
        }

        let entryId: string;

        if (item.entry.collectionId === 'personal') {
          const linkId = JSON.stringify([
            userId,
            item.entry.id,
          ]);

          const link = await extensionEntryLinks.findOne(
            { _id: linkId, userId },
            { session: mongoSession },
          );

          if (link) {
            if (
              link.identityHash !== identityHash(item.entry)
            ) {
              throw new ServiceError(
                'conflict',
                'ID từ bên extension đã thuộc một nghĩa khác.',
              );
            }

            const existing = await personalEntries.updateOne(
              {
                _id: link.entryId,
                userId,
              },
              { $inc: { studyUseVersion: 1 } },
              { session: mongoSession },
            );

            if (existing.matchedCount !== 1) {
              throw new ServiceError(
                'conflict',
                'Từ cá nhân đã thay đổi. Hãy tải lại.',
              );
            }

            // Không ghi đè nội dung người dùng đã sửa trên web.
            entryId = link.entryId;
          } else {
            entryId = `personal-${randomUUID()}`;
            const now = Date.now();

            await personalEntries.insertOne(
              {
                _id: entryId,
                userId,
                entry: {
                  ...item.entry,
                  id: entryId,
                  revision: 1,
                  collectionId: 'personal',
                },
                createdAt: now,
                updatedAt: now,
                studyUseVersion: 0,
              },
              { session: mongoSession },
            );

            await extensionEntryLinks.insertOne(
              {
                _id: linkId,
                userId,
                sourceEntryId: item.entry.id,
                entryId,
                identityHash: identityHash(item.entry),
              },
              { session: mongoSession },
            );

            createdEntries += 1;
          }
        } else {
          const shared = await sharedEntries.findOne(
            {
              _id: item.entry.id,
              collectionId: item.entry.collectionId,
              contentStatus: 'ready',
            },
            { session: mongoSession },
          );

          if (
            !shared ||
            identityHash(shared) !== identityHash(item.entry)
          ) {
            throw new ServiceError(
              'not-found',
              'Không tìm thấy từ tương ứng trong thư viện chung.',
            );
          }

          // Dữ liệu thư viện chung không bị ghi đè bởi extension.
          entryId = shared.id;
        }

        await savedSources.insertOne(
          {
            _id: receiptId,
            userId,
            entryId,
            captureId: item.capture.id,
            selectedText: item.capture.selectedText,
            sourceUrl: item.capture.sourceUrl,
            capturedAt: item.capture.capturedAt,
          },
          { session: mongoSession },
        );

        await importReceipts.insertOne(
          {
            _id: receiptId,
            userId,
            captureId: item.capture.id,
            payloadHash,
            entryId,
            deleted: false,
          },
          { session: mongoSession },
        );

        receivedCaptures += 1;
      }

      return {
        protocol: 1 as const,
        type: 'capture-ack' as const,
        transferId: transfer.transferId,

        captureIds: [
          ...new Set(
            transfer.captures.map(
              (item) => item.capture.id,
            ),
          ),
        ],

        summary: {
          createdEntries,
          receivedCaptures,
          duplicateCaptures,
        },
      };
    }),
  );
}