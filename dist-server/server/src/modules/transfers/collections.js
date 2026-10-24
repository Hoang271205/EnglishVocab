import { db } from '../../database/mongo.js';
export const importReceipts = db.collection('import_receipts');
export const extensionEntryLinks = db.collection('extension_entry_links');
export async function ensureTransferIndexes() {
    await importReceipts.createIndex({ userId: 1, deleted: 1, entryId: 1 });
    await importReceipts.createIndex({
        userId: 1,
        entryId: 1,
    });
    await extensionEntryLinks.createIndex({
        userId: 1,
        entryId: 1,
    });
}
