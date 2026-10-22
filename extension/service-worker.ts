import { z } from 'zod';
import { snapshotSchema } from '../src/services/snapshot';
import { normalizeAnswer } from '../src/domain/grading';
import { WiktionaryDictionary } from '../src/dictionary/wiktionaryDictionary';
import { CaptureQueue } from './queue';
import {
  forgetTranslations,
  translateSense,
  translationInputSchema,
} from './translation';

const queue = new CaptureQueue({
  get: async (key) => (await chrome.storage.local.get(key))[key],
  set: async (key, value) => {
    await chrome.storage.local.set({ [key]: value });
  },
});

const provider = new WiktionaryDictionary();
const pending = new Map<string, string[]>();

let cacheGeneration = 0;

const messageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('lookup'),
    query: z.string().min(1).max(120),
    forceOnline: z.boolean().optional(),
  }).strict(),

  z.object({
    type: z.literal('translate-sense'),
    input: translationInputSchema,
  }).strict(),

  z.object({
    type: z.literal('queue-save'),
    item: z.unknown(),
  }).strict(),

  z.object({
    type: z.literal('queue-export'),
  }).strict(),

  z.object({
    type: z.literal('queue-transfer'),
  }).strict(),

  z.object({
    type: z.literal('queue-ack'),
    transferId: z.string(),
    captureIds: z.array(z.string()).max(500),
  }).strict(),

  z.object({
    type: z.literal('snapshot-update'),
    snapshot: z.unknown(),
  }).strict(),

  z.object({
    type: z.literal('personal-delete'),
    entryId: z.string().min(1).max(128),
    headword: z.string().min(1).max(500),
  }).strict(),
]);

function isLocal(sender: ExtensionSender) {
  try {
    return (
      new URL(sender.url ?? '').origin ===
      'http://localhost:5173'
    );
  } catch {
    return false;
  }
}

chrome.runtime.onMessage.addListener((raw, sender, respond) => {
  if (sender.id !== chrome.runtime.id) {
    respond({ ok: false, error: 'Untrusted sender' });
    return false;
  }

  const parsed = messageSchema.safeParse(raw);

  if (!parsed.success) {
    respond({ ok: false, error: 'Invalid message' });
    return false;
  }

  const message = parsed.data;

  void (async () => {
    if (message.type === 'queue-save') {
      return queue.save(message.item);
    }

    if (message.type === 'translate-sense') {
      return translateSense(message.input);
    }

    if (message.type === 'lookup') {
      const key = normalizeAnswer(message.query);
      const generation = cacheGeneration;

      if (!message.forceOnline) {
        const stored = await chrome.storage.local.get('snapshot');
        const snapshot = snapshotSchema.safeParse(stored.snapshot);

        const entries = snapshot.success
          ? snapshot.data.entries.filter(
              (entry) => normalizeAnswer(entry.headword) === key,
            )
          : [];

        if (entries.length) {
          return {
            query: key,
            source: 'local',
            entries,
            senses: entries.map((entry) => ({
              entryId: entry.id,
              partOfSpeech: entry.partOfSpeech,
              definition: entry.meaningVi,
              example: entry.examples[0]
                ? entry.examples[0].prefix +
                  entry.examples[0].targetSurface +
                  entry.examples[0].suffix
                : null,
              sourceUrls: entry.provenance.flatMap((source) =>
                source.url ? [source.url] : [],
              ),
              licenses: entry.provenance.map((source) => ({
                name: source.license,
                url: source.url,
              })),
            })),
            phonetics: entries
              .filter((entry) => entry.pronunciation.ipa)
              .map((entry) => ({
                text: entry.pronunciation.ipa,
                audio: null,
                accent: entry.pronunciation.accent,
                sourceUrl: null,
                license: null,
              })),
          };
        }
      }

      const stored = await chrome.storage.local.get('lookupCache');

      const cached = Array.isArray(stored.lookupCache)
        ? stored.lookupCache.filter(
            (item) =>
              item &&
              typeof item === 'object' &&
              typeof item.query === 'string',
          )
        : [];

      const found = cached.find((item) => item.query === key);

      if (found && !message.forceOnline) {
        return { ...found, source: 'cache' };
      }

      const result = await provider.lookup(message.query);

      try {
        if (generation === cacheGeneration) {
          await chrome.storage.local.set({
            lookupCache: [
              ...cached.filter(
                (item) => item.query !== result.query,
              ),
              result,
            ].slice(-500),
          });

          if (generation !== cacheGeneration) {
            await chrome.storage.local.set({ lookupCache: [] });
          }
        }
      } catch {
        // Lỗi cache không ngăn hiển thị kết quả tra từ.
      }

      return result;
    }

    if (message.type === 'queue-export') {
      return {
        protocol: 1,
        type: 'capture-transfer',
        transferId: crypto.randomUUID(),
        captures: await queue.list(),
      };
    }

    if (!isLocal(sender)) {
      throw new Error(
        'Thao tác này chỉ được phép từ http://localhost:5173',
      );
    }

    if (message.type === 'personal-delete') {
      cacheGeneration++;

      await queue.removeEntry(message.entryId);
      await forgetTranslations(message.headword);

      const [snapshotStorage, cacheStorage] = await Promise.all([
        chrome.storage.local.get('snapshot'),
        chrome.storage.local.get('lookupCache'),
      ]);

      const snapshot = snapshotSchema.safeParse(
        snapshotStorage.snapshot,
      );

      const key = normalizeAnswer(message.headword);

      const cache = Array.isArray(cacheStorage.lookupCache)
        ? cacheStorage.lookupCache
        : [];

      const lookupCache = cache.filter(
        (item: unknown) =>
          !item ||
          typeof item !== 'object' ||
          !('query' in item) ||
          typeof item.query !== 'string' ||
          normalizeAnswer(item.query) !== key,
      );

      if (snapshot.success) {
        await chrome.storage.local.set({
          snapshot: {
            ...snapshot.data,
            entries: snapshot.data.entries.filter(
              (entry) => entry.id !== message.entryId,
            ),
          },
          lookupCache,
        });
      } else {
        await chrome.storage.local.set({ lookupCache });
      }

      return { deleted: true };
    }

    if (message.type === 'snapshot-update') {
      const snapshot = snapshotSchema.parse(message.snapshot);

      if (
        new TextEncoder().encode(JSON.stringify(snapshot)).length >
        8_000_000
      ) {
        throw new Error('Snapshot too large');
      }

      const stored = await chrome.storage.local.get('snapshot');
      const old = snapshotSchema.safeParse(stored.snapshot);

      if (old.success && old.data.version > snapshot.version) {
        throw new Error('Snapshot is stale');
      }

      await chrome.storage.local.set({ snapshot });

      return {
        updated: true,
        version: snapshot.version,
      };
    }

    if (message.type === 'queue-transfer') {
      if (pending.size > 100) pending.clear();

      const captures = await queue.list();
      const transferId = crypto.randomUUID();

      pending.set(
        transferId,
        captures.map((item) => item.capture.id),
      );

      return {
        protocol: 1,
        type: 'capture-transfer',
        transferId,
        captures,
      };
    }

    const expected = pending.get(message.transferId);

    if (
      !expected ||
      message.captureIds.length !== expected.length ||
      new Set(message.captureIds).size !== expected.length ||
      message.captureIds.some((id) => !expected.includes(id))
    ) {
      throw new Error('Unexpected ACK');
    }

    const result = await queue.acknowledge(message.captureIds);
    pending.delete(message.transferId);

    return result;
  })().then(
    (value) => respond({ ok: true, value }),
    (cause: unknown) =>
      respond({
        ok: false,
        error:
          cause instanceof Error
            ? cause.message
            : 'Extension operation failed',
      }),
  );

  return true;
});