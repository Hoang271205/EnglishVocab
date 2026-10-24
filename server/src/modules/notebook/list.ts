import type { Document } from 'mongodb';
import { z } from 'zod';
import { userProgress, reviewPreferences } from '../progress/collections.js';
import { personalEntries } from '../personal/collections.js';
import { importReceipts } from '../transfers/collections.js';
import { sharedEntries } from '../library/collections.js';
import type { NotebookPage } from '../../../../src/shared/notebook.js';

export const notebookQuery = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  scope: z.enum(['learned', 'personal']).default('learned'),
  search: z.string().max(200).default(''),
  cefr: z.enum(['', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']).default(''),
  level: z.enum(['', '1', '2', '3', '4', '5']).default(''),
  status: z
    .enum(['all', 'draft', 'unlearned', 'reviewing', 'mastered'])
    .default('all'),
  dueOnly: z.enum(['true', 'false']).default('false'),
});

// Preserve accent-insensitive Vietnamese search without evaluating JS in MongoDB.
function searchPattern(input: string) {
  const variants: Record<string, string> = {
    a: 'aàáảãạăằắẳẵặâầấẩẫậ',
    e: 'eèéẻẽẹêềếểễệ',
    i: 'iìíỉĩị',
    o: 'oòóỏõọôồốổỗộơờớởỡợ',
    u: 'uùúủũụưừứửữự',
    y: 'yỳýỷỹỵ',
    d: 'dđ',
  };
  return Array.from(
    input
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/đ/gi, 'd')
      .toLowerCase()
      .trim(),
  )
    .map((char) =>
      variants[char]
        ? `[${variants[char]}]`
        : '\\^$.*+?()[]{}|'.includes(char)
          ? '\\' + char
          : char,
    )
    .join('');
}
const entryProjection = {
  _id: 0,
  id: 1,
  revision: 1,
  collectionId: 1,
  headword: 1,
  partOfSpeech: 1,
  meaningVi: 1,
  cefr: 1,
  contentStatus: 1,
};

export async function listNotebook(
  userId: string,
  query: z.infer<typeof notebookQuery>,
): Promise<NotebookPage> {
  const pageSize = 50;
  const filter: Document = {};
  const pattern = searchPattern(query.search);
  if (pattern)
    filter.$expr = {
      $regexMatch: {
        input: { $concat: ['$entry.headword', ' ', '$entry.meaningVi'] },
        regex: pattern,
        options: 'i',
      },
    };
  if (query.cefr) filter['entry.cefr.level'] = query.cefr;
  if (query.level) filter['progress.level'] = Number(query.level);
  if (query.dueOnly === 'true') {
    filter.progress = { $ne: null };
    filter.reviewEnabled = true;
    filter['progress.nextReviewAt'] = { $lte: Date.now() };
  }
  if (query.status === 'draft') filter['entry.contentStatus'] = 'draft';
  if (query.status === 'unlearned') {
    filter.progress = null;
    filter['entry.contentStatus'] = 'ready';
    // dueOnly + unlearned is an empty intersection.
    if (query.dueOnly === 'true') filter._id = { $exists: false };
  }
  if (query.status === 'reviewing')
    filter['progress.level'] = query.level
      ? { $eq: Number(query.level), $lt: 5 }
      : { $lt: 5, $gte: 1 };
  if (query.status === 'mastered')
    filter['progress.level'] = query.level && query.level !== '5' ? -1 : 5;
  const scope =
    query.scope === 'learned'
      ? { progress: { $ne: null } }
      : { $or: [{ 'entry.collectionId': 'personal' }, { saved: true }] };
  const [result] = await userProgress
    .aggregate<{
      rows: NotebookPage['rows'];
      counts: { total: number; enabledCount: number }[];
      scope: { count: number }[];
      all: { count: number }[];
    }>(
      [
        { $match: { userId } },
        {
          $project: {
            _id: 0,
            entryId: 1,
            progress: { level: '$level', nextReviewAt: '$nextReviewAt' },
            saved: { $literal: false },
          },
        },
        {
          $unionWith: {
            coll: personalEntries.collectionName,
            pipeline: [
              { $match: { userId } },
              {
                $project: {
                  _id: 0,
                  entryId: '$entry.id',
                  saved: { $literal: false },
                },
              },
            ],
          },
        },
        {
          $unionWith: {
            coll: importReceipts.collectionName,
            pipeline: [
              { $match: { userId, deleted: false } },
              { $project: { _id: 0, entryId: 1, saved: { $literal: true } } },
            ],
          },
        },
        {
          $group: {
            _id: '$entryId',
            saved: { $max: '$saved' },
            progress: { $max: '$progress' },
          },
        },
        {
          $lookup: {
            from: sharedEntries.collectionName,
            localField: '_id',
            foreignField: '_id',
            pipeline: [{ $project: entryProjection }],
            as: 'shared',
          },
        },
        {
          $lookup: {
            from: personalEntries.collectionName,
            localField: '_id',
            foreignField: 'entry.id',
            pipeline: [
              { $match: { userId } },
              { $replaceWith: '$entry' },
              { $project: entryProjection },
            ],
            as: 'personal',
          },
        },
        {
          $set: {
            entry: {
              $arrayElemAt: [{ $concatArrays: ['$shared', '$personal'] }, 0],
            },
          },
        },
        { $match: { entry: { $exists: true } } },
        {
          $lookup: {
            from: reviewPreferences.collectionName,
            localField: '_id',
            foreignField: 'entryId',
            pipeline: [
              { $match: { userId } },
              { $project: { reviewEnabled: 1 } },
            ],
            as: 'preference',
          },
        },
        {
          $set: {
            progress: { $ifNull: ['$progress', null] },
            reviewEnabled: {
              $ifNull: [
                { $arrayElemAt: ['$preference.reviewEnabled', 0] },
                true,
              ],
            },
          },
        },
        { $project: { entry: 1, progress: 1, reviewEnabled: 1, saved: 1 } },
        {
          $facet: {
            all: [{ $count: 'count' }],
            scope: [{ $match: scope }, { $count: 'count' }],
            counts: [
              { $match: scope },
              { $match: filter },
              {
                $group: {
                  _id: null,
                  total: { $sum: 1 },
                  enabledCount: { $sum: { $cond: ['$reviewEnabled', 1, 0] } },
                },
              },
            ],
            rows: [
              { $match: scope },
              { $match: filter },
              { $sort: { _id: 1 } },
              { $skip: (query.page - 1) * pageSize },
              { $limit: pageSize },
              { $project: { _id: 0 } },
            ],
          },
        },
      ],
      { maxTimeMS: 8000 },
    )
    .toArray();
  const counts = result?.counts[0];
  return {
    rows: result?.rows ?? [],
    total: counts?.total ?? 0,
    enabledCount: counts?.enabledCount ?? 0,
    disabledCount: (counts?.total ?? 0) - (counts?.enabledCount ?? 0),
    scopeCount: result?.scope[0]?.count ?? 0,
    allCount: result?.all[0]?.count ?? 0,
    page: query.page,
    pageSize,
  };
}
