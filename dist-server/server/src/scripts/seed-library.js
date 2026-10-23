import { isDeepStrictEqual } from 'node:util';
import { client, closeMongo, connectMongo, } from '../database/mongo.js';
import { ensureLibraryIndexes, sharedEntries, sharedTopics, } from '../modules/library/collections.js';
import { loadSharedContent } from './load-shared-content.js';
async function main() {
    // Đọc và kiểm tra các file trước khi ghi database.
    const content = await loadSharedContent();
    await connectMongo();
    await ensureLibraryIndexes();
    const session = client.startSession();
    try {
        await session.withTransaction(async () => {
            const existingEntries = await sharedEntries.find({ _id: { $in: content.entries.map((entry) => entry.id) } }, { session }).toArray();
            const incomingEntries = new Map(content.entries.map((entry) => [entry.id, entry]));
            for (const existing of existingEntries) {
                const incoming = incomingEntries.get(existing._id);
                if (!incoming ||
                    !isDeepStrictEqual(existing, {
                        _id: incoming.id,
                        ...incoming,
                    })) {
                    throw new Error(`Từ đã có nội dung khác trong MongoDB: ${existing._id}`);
                }
            }
            const existingTopics = await sharedTopics.find({ _id: { $in: content.topics.map((topic) => topic.id) } }, { session }).toArray();
            const incomingTopics = new Map(content.topics.map((topic) => [topic.id, topic]));
            for (const existing of existingTopics) {
                const incoming = incomingTopics.get(existing._id);
                if (!incoming ||
                    !isDeepStrictEqual(existing, {
                        _id: incoming.id,
                        ...incoming,
                    })) {
                    throw new Error(`Topic đã có nội dung khác trong MongoDB: ${existing._id}`);
                }
            }
            if (content.entries.length > 0) {
                await sharedEntries.bulkWrite(content.entries.map((entry) => ({
                    updateOne: {
                        filter: { _id: entry.id },
                        update: { $setOnInsert: entry },
                        upsert: true,
                    },
                })), { session, ordered: true });
            }
            if (content.topics.length > 0) {
                await sharedTopics.bulkWrite(content.topics.map((topic) => ({
                    updateOne: {
                        filter: { _id: topic.id },
                        update: { $setOnInsert: topic },
                        upsert: true,
                    },
                })), { session, ordered: true });
            }
        });
    }
    finally {
        await session.endSession();
    }
    console.log(`Đã nhập hoặc giữ nguyên ${content.entries.length} từ, ` +
        `${content.topics.length} topic.`);
}
try {
    await main();
}
catch (cause) {
    console.error(cause instanceof Error
        ? cause.message
        : 'Không nhập được thư viện.');
    process.exitCode = 1;
}
finally {
    await closeMongo();
}
