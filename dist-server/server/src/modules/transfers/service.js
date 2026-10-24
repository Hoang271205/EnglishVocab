import { createHash, randomUUID } from 'node:crypto';
import { enrollSavedEntry, requireSavedEntryReady, } from './enroll-saved-entry.js';
import { ServiceError } from '../../../../src/domain/types.js';
import { client } from '../../database/mongo.js';
import { sharedEntries } from '../library/collections.js';
import { personalEntries } from '../personal/collections.js';
import { extensionEntryLinks, importReceipts } from './collections.js';
function hash(value) {
    return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
function identityHash(entry) {
    return hash([entry.headword, entry.partOfSpeech, entry.senseKey]);
}
export async function receiveTransfer(userId, transfer, authorize) {
    return client.withSession(async (mongoSession) => mongoSession.withTransaction(async () => {
        if (authorize)
            await authorize(mongoSession);
        let createdEntries = 0;
        let receivedCaptures = 0;
        let duplicateCaptures = 0;
        for (const item of transfer.captures) {
            const receiptId = JSON.stringify([userId, item.capture.id]);
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
            const previous = await importReceipts.findOne({ _id: receiptId, userId }, { session: mongoSession });
            if (previous) {
                if (previous.payloadHash !== payloadHash) {
                    throw new ServiceError('conflict', 'Một capture ID đang được dùng cho dữ liệu khác.');
                }
                duplicateCaptures += 1;
                continue;
            }
            requireSavedEntryReady(item.entry);
            let entryId;
            let savedEntry;
            if (item.entry.collectionId === 'personal') {
                const linkId = JSON.stringify([userId, item.entry.id]);
                const link = await extensionEntryLinks.findOne({ _id: linkId, userId }, { session: mongoSession });
                const canonical = await personalEntries.findOne({ userId, 'entry.id': item.entry.id }, { session: mongoSession });
                if (canonical) {
                    if (identityHash(canonical.entry) !== identityHash(item.entry)) {
                        throw new ServiceError('conflict', 'Từ đã được đổi nghĩa trên web. Hãy tra lại trước khi lưu.');
                    }
                    await personalEntries.updateOne({ _id: canonical._id, userId }, { $inc: { studyUseVersion: 1 } }, { session: mongoSession });
                    entryId = canonical.entry.id;
                    savedEntry = canonical.entry;
                }
                else if (link) {
                    if (link.identityHash !== identityHash(item.entry)) {
                        throw new ServiceError('conflict', 'ID từ bên extension đã thuộc một nghĩa khác.');
                    }
                    const existing = await personalEntries.findOneAndUpdate({ _id: link.entryId, userId }, { $inc: { studyUseVersion: 1 } }, { session: mongoSession, returnDocument: 'after' });
                    if (!existing) {
                        throw new ServiceError('conflict', 'Từ cá nhân đã thay đổi. Hãy tải lại.');
                    }
                    // Không ghi đè nội dung người dùng đã sửa trên web.
                    entryId = link.entryId;
                    savedEntry = existing.entry;
                }
                else {
                    const deleted = await importReceipts.findOne({ userId, entryId: item.entry.id, deleted: true }, { session: mongoSession });
                    if (deleted)
                        throw new ServiceError('conflict', 'Từ này đã bị xoá. Hãy cập nhật thư viện và tra lại.');
                    entryId = `personal-${randomUUID()}`;
                    const now = Date.now();
                    await personalEntries.insertOne({
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
                    }, { session: mongoSession });
                    await extensionEntryLinks.insertOne({
                        _id: linkId,
                        userId,
                        sourceEntryId: item.entry.id,
                        entryId,
                        identityHash: identityHash(item.entry),
                    }, { session: mongoSession });
                    savedEntry = {
                        ...item.entry,
                        id: entryId,
                        revision: 1,
                        collectionId: 'personal',
                    };
                    createdEntries += 1;
                }
            }
            else {
                const shared = await sharedEntries.findOne({
                    _id: item.entry.id,
                    collectionId: item.entry.collectionId,
                    contentStatus: 'ready',
                }, { session: mongoSession });
                if (!shared || identityHash(shared) !== identityHash(item.entry)) {
                    throw new ServiceError('not-found', 'Không tìm thấy từ tương ứng trong thư viện chung.');
                }
                // Dữ liệu thư viện chung không bị ghi đè bởi extension.
                entryId = shared.id;
                savedEntry = shared;
            }
            await enrollSavedEntry(userId, savedEntry, mongoSession);
            await importReceipts.insertOne({
                _id: receiptId,
                userId,
                captureId: item.capture.id,
                payloadHash,
                entryId,
                deleted: false,
            }, { session: mongoSession });
            receivedCaptures += 1;
        }
        return {
            protocol: 1,
            type: 'capture-ack',
            transferId: transfer.transferId,
            captureIds: [
                ...new Set(transfer.captures.map((item) => item.capture.id)),
            ],
            summary: {
                createdEntries,
                receivedCaptures,
                duplicateCaptures,
            },
        };
    }));
}
