import { ServiceError } from '../../../../src/domain/types.js';
import { sharedEntries } from '../library/collections.js';
import { personalEntries } from '../personal/collections.js';
export async function resolveReadyEntries(userId, entryIds, mongoSession) {
    const ids = [...new Set(entryIds)];
    if (!ids.length)
        return [];
    const sessionOptions = mongoSession
        ? { session: mongoSession }
        : {};
    const shared = await sharedEntries
        .find({
        _id: { $in: ids },
        collectionId: { $in: ['ielts', 'daily'] },
        contentStatus: 'ready',
    }, {
        ...sessionOptions,
        projection: { _id: 0 },
    })
        .toArray();
    const personal = await personalEntries
        .find({
        userId,
        'entry.id': { $in: ids },
        'entry.contentStatus': 'ready',
    }, sessionOptions)
        .toArray();
    // Khi chạy trong transaction tạo phiên, ghi vào cùng
    // document từ để phát hiện sửa/xoá đồng thời.
    if (mongoSession) {
        for (const document of personal) {
            const result = await personalEntries.updateOne({
                _id: document._id,
                userId,
                'entry.revision': document.entry.revision,
                'entry.contentStatus': 'ready',
            }, { $inc: { studyUseVersion: 1 } }, { session: mongoSession });
            if (result.matchedCount !== 1) {
                throw new ServiceError('conflict', 'Từ cá nhân vừa thay đổi. Hãy tải lại.');
            }
        }
    }
    return [
        ...shared,
        ...personal.map((document) => document.entry),
    ];
}
