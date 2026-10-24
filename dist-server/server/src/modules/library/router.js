import { loadTopicSummaries } from './topic-summaries.js';
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/require-auth.js';
import { sharedEntries, sharedTopics } from './collections.js';
export const libraryRouter = Router();
libraryRouter.use(requireAuth);
const topicQuerySchema = z.object({
    collection: z.enum(['ielts', 'daily']).optional(),
    search: z.string().trim().max(100).default(''),
});
const idSchema = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/);
libraryRouter.get('/topic-summaries', async (request, response) => {
    const { collection } = z
        .object({ collection: z.enum(['ielts', 'daily']) })
        .parse(request.query);
    response.setHeader('Cache-Control', 'private, no-store');
    const topics = await loadTopicSummaries(request.session.userId, collection);
    response.json({ topics });
});
libraryRouter.get('/topics', async (request, response) => {
    const parsed = topicQuerySchema.safeParse(request.query);
    if (!parsed.success) {
        response.status(400).json({
            error: {
                code: 'INVALID_QUERY',
                message: 'Bộ lọc topic không hợp lệ.',
            },
        });
        return;
    }
    const filter = parsed.data.collection
        ? { collectionId: parsed.data.collection }
        : {};
    const topics = await sharedTopics
        .find(filter, { projection: { _id: 0 } })
        .sort({ collectionId: 1, order: 1 })
        .toArray();
    const search = parsed.data.search.normalize('NFKC').toLowerCase();
    const visible = topics.filter((topic) => `${topic.nameEn} ${topic.nameVi}`
        .normalize('NFKC')
        .toLowerCase()
        .includes(search));
    response.json({ topics: visible });
});
libraryRouter.get('/topics/:topicId/entries', async (request, response) => {
    const parsed = idSchema.safeParse(request.params.topicId);
    if (!parsed.success) {
        response.status(400).json({
            error: {
                code: 'INVALID_ID',
                message: 'ID topic không hợp lệ.',
            },
        });
        return;
    }
    const topic = await sharedTopics.findOne({ _id: parsed.data });
    if (!topic) {
        response.status(404).json({
            error: {
                code: 'TOPIC_NOT_FOUND',
                message: 'Không tìm thấy topic.',
            },
        });
        return;
    }
    const entries = await sharedEntries
        .find({
        _id: { $in: topic.entryIds },
        contentStatus: 'ready',
    }, { projection: { _id: 0 } })
        .toArray();
    const byId = new Map(entries.map((entry) => [entry.id, entry]));
    // Giữ thứ tự từ trong topic.
    response.json({
        entries: topic.entryIds.flatMap((id) => {
            const entry = byId.get(id);
            return entry ? [entry] : [];
        }),
    });
});
libraryRouter.get('/entries/:entryId', async (request, response) => {
    const parsed = idSchema.safeParse(request.params.entryId);
    if (!parsed.success) {
        response.status(400).json({
            error: {
                code: 'INVALID_ID',
                message: 'ID từ không hợp lệ.',
            },
        });
        return;
    }
    const entry = await sharedEntries.findOne({
        _id: parsed.data,
        contentStatus: 'ready',
    }, { projection: { _id: 0 } });
    if (!entry) {
        response.status(404).json({
            error: {
                code: 'ENTRY_NOT_FOUND',
                message: 'Không tìm thấy từ.',
            },
        });
        return;
    }
    response.json({ entry });
});
