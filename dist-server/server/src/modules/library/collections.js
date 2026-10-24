import { db } from '../../database/mongo.js';
export const sharedEntries = db.collection('shared_entries');
export const sharedTopics = db.collection('shared_topics');
export async function ensureLibraryIndexes() {
    await sharedEntries.createIndex({
        collectionId: 1,
        contentStatus: 1,
    });
    await sharedEntries.createIndex({ headword: 1 });
    await sharedEntries.createIndex({ headword: 1 }, {
        name: 'shared_headword_lookup',
        collation: { locale: 'en', strength: 2 },
    });
    await sharedTopics.createIndex({ collectionId: 1, order: 1 }, {
        unique: true,
        name: 'shared_topics_collection_order',
    });
}
