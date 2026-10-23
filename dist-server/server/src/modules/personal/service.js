import { randomUUID } from 'node:crypto';
import { entrySchema } from '../../../../src/content/schema.js';
import { ServiceError } from '../../../../src/domain/types.js';
import { client } from '../../database/mongo.js';
import { extensionEntryLinks, importReceipts, savedSources, } from '../transfers/collections.js';
import { reviewPreferences, userProgress, } from '../progress/collections.js';
import { studyReceipts, studySessions, } from '../study/collections.js';
import { personalEntries } from './collections.js';
function buildEntry(input, id, revision) {
    return entrySchema.parse({
        ...input,
        id,
        revision,
        collectionId: 'personal',
    });
}
export async function listPersonalEntries(userId) {
    const [documents, progress, preferences] = await Promise.all([
        personalEntries
            .find({ userId })
            .sort({ createdAt: -1, _id: 1 })
            .toArray(),
        userProgress
            .find({ userId }, { projection: { _id: 0, userId: 0 } })
            .toArray(),
        reviewPreferences
            .find({ userId })
            .toArray(),
    ]);
    const progressById = new Map(progress.map((item) => [item.entryId, item]));
    const preferenceById = new Map(preferences.map((item) => [
        item.entryId,
        item.reviewEnabled,
    ]));
    return documents.map((document) => ({
        entry: document.entry,
        progress: progressById.get(document.entry.id) ?? null,
        reviewEnabled: preferenceById.get(document.entry.id) ?? true,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
    }));
}
export async function getPersonalEntry(userId, entryId) {
    const document = await personalEntries.findOne({
        userId,
        'entry.id': entryId,
    });
    if (!document) {
        throw new ServiceError('not-found', 'Không tìm thấy từ cá nhân.');
    }
    return document.entry;
}
export async function createPersonalEntry(userId, input) {
    const id = `personal-${randomUUID()}`;
    const entry = buildEntry(input, id, 1);
    const now = Date.now();
    await personalEntries.insertOne({
        _id: id,
        userId,
        entry,
        createdAt: now,
        updatedAt: now,
    });
    return entry;
}
export async function updatePersonalEntry(userId, entryId, expectedRevision, input) {
    return client.withSession(async (mongoSession) => mongoSession.withTransaction(async () => {
        const document = await personalEntries.findOne({ userId, 'entry.id': entryId }, { session: mongoSession });
        if (!document) {
            throw new ServiceError('not-found', 'Không tìm thấy từ cá nhân.');
        }
        const old = document.entry;
        if (old.revision !== expectedRevision) {
            throw new ServiceError('conflict', 'Từ đã thay đổi. Hãy tải lại trước khi sửa.');
        }
        const candidate = buildEntry(input, old.id, old.revision + 1);
        const copied = candidate.headword !== old.headword ||
            (old.meaningVi.trim() !== '' &&
                candidate.meaningVi !== old.meaningVi) ||
            (old.partOfSpeech.trim() !== '' &&
                candidate.partOfSpeech !== old.partOfSpeech);
        // Đổi từ/nghĩa/từ loại tạo mục riêng,
        // không ghi đè tiến độ của nghĩa cũ.
        if (copied) {
            const id = `personal-${randomUUID()}`;
            const entry = buildEntry(input, id, 1);
            const now = Date.now();
            await personalEntries.insertOne({
                _id: id,
                userId,
                entry,
                createdAt: now,
                updatedAt: now,
            }, { session: mongoSession });
            return { entry, copied: true };
        }
        const active = await studySessions.findOne({
            userId,
            active: true,
            'items.entry.id': entryId,
        }, { session: mongoSession });
        if (active) {
            throw new ServiceError('conflict', 'Hãy hoàn thành phiên đang dùng từ này trước khi sửa.');
        }
        const progress = await userProgress.findOne({ userId, entryId }, { session: mongoSession });
        if (progress && candidate.contentStatus !== 'ready') {
            throw new ServiceError('validation', 'Từ đã học không thể chuyển về bản nháp.');
        }
        const result = await personalEntries.replaceOne({
            _id: document._id,
            userId,
            'entry.revision': expectedRevision,
        }, {
            ...document,
            entry: candidate,
            updatedAt: Date.now(),
        }, { session: mongoSession });
        if (result.matchedCount !== 1) {
            throw new ServiceError('conflict', 'Từ vừa thay đổi. Hãy tải lại.');
        }
        return { entry: candidate, copied: false };
    }));
}
export async function deletePersonalEntry(userId, entryId, expectedRevision) {
    return client.withSession(async (mongoSession) => mongoSession.withTransaction(async () => {
        const document = await personalEntries.findOne({ userId, 'entry.id': entryId }, { session: mongoSession });
        if (!document) {
            throw new ServiceError('not-found', 'Không tìm thấy từ cá nhân.');
        }
        if (document.entry.revision !== expectedRevision) {
            throw new ServiceError('conflict', 'Từ đã thay đổi. Hãy tải lại trước khi xoá.');
        }
        const active = await studySessions.findOne({
            userId,
            active: true,
            'items.entry.id': entryId,
        }, { session: mongoSession });
        if (active) {
            throw new ServiceError('conflict', 'Hãy hoàn thành phiên đang dùng từ này trước khi xoá.');
        }
        // Bỏ bản sao của từ trong các phiên đã hoàn thành,
        // giữ lại những từ khác trong cùng phiên.
        const completed = await studySessions
            .find({
            userId,
            active: false,
            'items.entry.id': entryId,
        }, { session: mongoSession })
            .toArray();
        for (const session of completed) {
            session.items = session.items.filter((item) => item.entry.id !== entryId);
            session.index = session.items.length;
            session.phase = 'complete';
            session.draftAnswer = '';
            session.version += 1;
            if (session.mode === 'review' &&
                session.feedback?.event.entryId === entryId) {
                session.feedback = null;
            }
            await studySessions.replaceOne({ _id: session._id, userId }, session, { session: mongoSession });
        }
        await studyReceipts.deleteMany({ userId, 'event.entryId': entryId }, { session: mongoSession });
        await userProgress.deleteMany({ userId, entryId }, { session: mongoSession });
        await reviewPreferences.deleteMany({ userId, entryId }, { session: mongoSession });
        await savedSources.deleteMany({ userId, entryId }, { session: mongoSession });
        await extensionEntryLinks.deleteMany({ userId, entryId }, { session: mongoSession });
        await importReceipts.updateMany({ userId, entryId }, { $set: { deleted: true } }, { session: mongoSession });
        await personalEntries.deleteOne({
            _id: document._id,
            userId,
            'entry.revision': expectedRevision,
        }, { session: mongoSession });
    }));
}
