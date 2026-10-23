import { db } from '../../database/mongo.js';
export const importReceipts = db.collection('import_receipts');
export const extensionEntryLinks = db.collection('extension_entry_links');
export const savedSources = db.collection('saved_sources');
export async function ensureTransferIndexes() {
    await importReceipts.createIndex({
        userId: 1,
        entryId: 1,
    });
    await extensionEntryLinks.createIndex({
        userId: 1,
        entryId: 1,
    });
    await savedSources.createIndex({
        userId: 1,
        entryId: 1,
        capturedAt: -1,
    });
}
