import { MongoServerError } from 'mongodb';
import { ServiceError } from '../../../../src/domain/types.js';
import { userSettings } from './collections.js';
import { appSettingsSchema, defaultSettings, } from './schema.js';
export async function getUserSettings(userId) {
    const document = await userSettings.findOne({
        _id: userId,
    });
    if (!document) {
        return {
            revision: 0,
            settings: { ...defaultSettings },
            updatedAt: null,
        };
    }
    const parsed = appSettingsSchema.safeParse(document.settings);
    if (!parsed.success) {
        throw new ServiceError('storage', 'Cài đặt đã lưu không hợp lệ.');
    }
    return {
        revision: document.revision,
        settings: parsed.data,
        updatedAt: document.updatedAt,
    };
}
export async function updateUserSettings(userId, expectedRevision, changes) {
    const current = await getUserSettings(userId);
    if (current.revision !== expectedRevision) {
        throw new ServiceError('conflict', 'Cài đặt đã thay đổi ở nơi khác. Hãy tải lại.');
    }
    const settings = appSettingsSchema.parse({
        ...current.settings,
        ...changes,
    });
    const updatedAt = Date.now();
    const revision = expectedRevision + 1;
    // Lần lưu đầu tiên.
    if (expectedRevision === 0) {
        try {
            await userSettings.insertOne({
                _id: userId,
                revision,
                settings,
                updatedAt,
            });
        }
        catch (error) {
            if (error instanceof MongoServerError &&
                error.code === 11000) {
                throw new ServiceError('conflict', 'Cài đặt vừa được lưu ở nơi khác. Hãy tải lại.');
            }
            throw error;
        }
        return {
            revision,
            settings,
            updatedAt,
        };
    }
    // Chỉ cập nhật khi bản lưu chưa bị tab khác thay đổi.
    const result = await userSettings.updateOne({
        _id: userId,
        revision: expectedRevision,
    }, {
        $set: {
            revision,
            settings,
            updatedAt,
        },
    });
    if (result.matchedCount !== 1) {
        throw new ServiceError('conflict', 'Cài đặt vừa thay đổi ở nơi khác. Hãy tải lại.');
    }
    return {
        revision,
        settings,
        updatedAt,
    };
}
