import { db } from '../../database/mongo.js';

interface ImportReceipt {
  _id: string;
  userId: string;
  captureId: string;
  payloadHash: string;
  entryId: string;
  deleted: boolean;
}

interface EntryLink {
  _id: string;
  userId: string;
  sourceEntryId: string;
  entryId: string;
  identityHash: string;
}

interface SavedSource {
  _id: string;
  userId: string;
  entryId: string;
  captureId: string;
  selectedText: string;
  sourceUrl: string;
  capturedAt: number;
}

export const importReceipts =
  db.collection<ImportReceipt>('import_receipts');

export const extensionEntryLinks =
  db.collection<EntryLink>('extension_entry_links');

export const savedSources =
  db.collection<SavedSource>('saved_sources');

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