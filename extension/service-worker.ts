import {
  currentExtensionUser,
  loginExtension,
  logoutExtension,
} from './accountApi';
import { trustedAppOrigins } from './config';
import {
  connectionSchema,
  connectionState,
  initializePrivateStorage,
  saveToCloud,
} from './cloud';
import { z } from 'zod';
import { snapshotSchema } from '../src/shared/schemas/snapshot';
import { normalizeAnswer } from '../src/domain/grading';
import { WiktionaryDictionary } from '../src/dictionary/wiktionaryDictionary';
import { CaptureQueue } from './queue';
import {
  forgetTranslations,
  translateSense,
  translationInputSchema,
} from './translation';

const queues = new Map<string, CaptureQueue>();
function accountQueue(ownerId: string | null) {
  const key = ownerId ? `captures:${ownerId}` : 'captures';
  let queue = queues.get(key);
  if (!queue) {
    queue = new CaptureQueue({
      get: async () => (await chrome.storage.local.get(key))[key],
      set: async (_key, value) => {
        await chrome.storage.local.set({ [key]: value });
      },
    });
    queues.set(key, queue);
  }
  return queue;
}
let mutationTail: Promise<unknown> = Promise.resolve();
function serialMutation<T>(work: () => Promise<T>): Promise<T> {
  const next = mutationTail.then(work);
  mutationTail = next.catch(() => {});
  return next;
}

const provider = new WiktionaryDictionary();
const pending = new Map<string, string[]>();

let cacheGeneration = 0;

const messageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('auth-status') }).strict(),
  z.object({ type: z.literal('auth-open') }).strict(),
  z
    .object({
      type: z.literal('auth-login'),
      email: z.string().trim().email().max(254),
      password: z.string().min(1).max(128),
    })
    .strict(),
  z.object({ type: z.literal('auth-logout') }).strict(),
  z.object({ type: z.literal('extension-state') }).strict(),
  z
    .object({
      type: z.literal('connection-install'),
      connection: connectionSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal('capture-save'),
      ownerId: z.string().min(1).max(128).nullable().optional(),
      item: z.unknown(),
    })
    .strict(),
  z
    .object({
      type: z.literal('account-bind'),
      ownerId: z.string().min(1).max(128),
      adoptGuest: z.boolean().default(false),
    })
    .strict(),
  z
    .object({
      type: z.literal('account-release'),
      ownerId: z.string().min(1).max(128),
    })
    .strict(),
  z
    .object({
      type: z.literal('lookup'),
      query: z.string().min(1).max(120),
      forceOnline: z.boolean().optional(),
    })
    .strict(),

  z
    .object({
      type: z.literal('translate-sense'),
      input: translationInputSchema,
    })
    .strict(),

  z
    .object({
      type: z.literal('queue-save'),
      ownerId: z.string().min(1).max(128).nullable().optional(),
      item: z.unknown(),
    })
    .strict(),

  z
    .object({
      type: z.literal('queue-export'),
    })
    .strict(),

  z
    .object({
      type: z.literal('queue-transfer'),
      ownerId: z.string().min(1).max(128).optional(),
    })
    .strict(),

  z
    .object({
      type: z.literal('queue-ack'),
      ownerId: z.string().min(1).max(128).optional(),
      transferId: z.string(),
      captureIds: z.array(z.string()).max(500),
    })
    .strict(),

  z
    .object({
      type: z.literal('snapshot-update'),
      ownerId: z.string().min(1).max(128).optional(),
      snapshot: z.unknown(),
    })
    .strict(),

  z
    .object({
      type: z.literal('personal-delete'),
      ownerId: z.string().min(1).max(128).optional(),
      entryId: z.string().min(1).max(128),
      headword: z.string().min(1).max(500),
      sourceIds: z.array(z.string().min(1).max(128)).max(500).default([]),
    })
    .strict(),
]);

function isLocal(sender: ExtensionSender) {
  try {
    return trustedAppOrigins.has(new URL(sender.url ?? '').origin);
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

  const work = async () => {
    await initializePrivateStorage();
    const accountStorage = await chrome.storage.local.get('accountOwner');
    const ownerId =
      typeof accountStorage.accountOwner === 'string'
        ? accountStorage.accountOwner
        : null;
    const queue = accountQueue(ownerId);
    const deletedKey = `deletedEntryIds:${ownerId ?? 'guest'}`;
    async function deletedIds(): Promise<string[]> {
      const stored = (await chrome.storage.local.get(deletedKey))[deletedKey];
      return Array.isArray(stored)
        ? stored.filter((id): id is string => typeof id === 'string')
        : [];
    }

    if (message.type === 'auth-open') {
      await chrome.tabs.create({ url: chrome.runtime.getURL('account.html') });
      return { opened: true };
    }

    if (message.type === 'auth-status') {
      const user = await currentExtensionUser();
      if (!user || ownerId !== user.id) {
        cacheGeneration++;
        pending.clear();
        await chrome.storage.local.set({
          accountOwner: user?.id ?? null,
          snapshot: null,
          lookupCache: [],
        });
      }
      return { user };
    }

    if (message.type === 'auth-login') {
      if (sender.url !== chrome.runtime.getURL('account.html')) {
        throw new Error('Hãy đăng nhập từ trang tài khoản của extension.');
      }
      cacheGeneration++;
      const user = await loginExtension({
        email: message.email,
        password: message.password,
      });
      cacheGeneration++;
      pending.clear();
      await chrome.storage.local.set({
        accountOwner: user.id,
        snapshot: null,
        lookupCache: [],
      });
      return { user };
    }

    if (message.type === 'auth-logout') {
      cacheGeneration++;
      pending.clear();
      return logoutExtension();
    }

    if (message.type === 'queue-save') {
      throw new Error(
        'Luồng hàng đợi đã dừng. Hãy reload extension và trang bài đọc để dùng Lưu trực tiếp.',
      );
    }

    if (message.type === 'capture-save') {
      const candidate = z
        .object({ entry: z.object({ id: z.string() }) })
        .safeParse(message.item);
      if (
        candidate.success &&
        (await deletedIds()).includes(candidate.data.entry.id)
      ) {
        throw new Error(
          'Từ này đã bị xoá. Hãy đóng popup và tra lại để tạo lượt lưu mới.',
        );
      }
      const result = await saveToCloud(message.item, message.ownerId);
      try {
        const storage = await chrome.storage.local.get('snapshot');
        const snapshot = snapshotSchema.safeParse(storage.snapshot);
        // Cache only the committed server entry, never an offline capture queue.
        await chrome.storage.local.set({
          snapshot: {
            protocol: 1,
            version: snapshot.success ? snapshot.data.version : 0,
            entries: [
              ...(snapshot.success
                ? snapshot.data.entries.filter(
                    (entry) =>
                      entry.id !== result.entry.id &&
                      (!candidate.success ||
                        entry.id !== candidate.data.entry.id),
                  )
                : []),
              result.entry,
            ],
          },
        });
      } catch {
        /* The server commit succeeded; cache is optional. */
      }
      return {
        saved: true,
        duplicate: result.duplicate,
        entryId: result.entry.id,
        contentStatus: result.entry.contentStatus,
      };
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
            ownerId,
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
        return { ...found, source: 'cache', ownerId };
      }

      const result = await provider.lookup(message.query);

      try {
        if (generation === cacheGeneration) {
          await chrome.storage.local.set({
            lookupCache: [
              ...cached.filter((item) => item.query !== result.query),
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

      return { ...result, ownerId };
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
        'Thao tác chỉ được phép từ trang EnglishVocab đã cấu hình.',
      );
    }

    if (message.type === 'extension-state') {
      const stored = await chrome.storage.local.get('extensionDeviceId');
      const parsedId = z.uuid().safeParse(stored.extensionDeviceId);
      const deviceId = parsedId.success ? parsedId.data : crypto.randomUUID();
      if (!parsedId.success)
        await chrome.storage.local.set({ extensionDeviceId: deviceId });
      const connection = await connectionState();
      return {
        deviceId,
        connected: connection !== null,
        ownerId: connection?.ownerId ?? null,
        expiresAt: connection?.expiresAt ?? null,
      };
    }

    if (message.type === 'connection-install') {
      throw new Error('Hãy đăng nhập trực tiếp trong extension.');
    }

    if (message.type === 'account-bind') {
      const connection = await connectionState();
      if (!connection || connection.ownerId !== message.ownerId) {
        throw new Error('Hãy đăng nhập cùng tài khoản trong extension.');
      }

      if (ownerId !== message.ownerId) {
        cacheGeneration++;
        pending.clear();
        await chrome.storage.local.set({
          accountOwner: message.ownerId,
          snapshot: null,
          lookupCache: [],
        });
      }
      const guest = accountQueue(null);
      const guestItems = await guest.list();
      if (message.adoptGuest && guestItems.length) {
        const owned = accountQueue(message.ownerId);
        for (const item of guestItems) await owned.save(item);
        await guest.acknowledge(guestItems.map((item) => item.capture.id));
      }
      return {
        bound: true,
        ownerId: message.ownerId,
        guestCount: message.adoptGuest ? 0 : guestItems.length,
      };
    }

    if (message.type === 'account-release') {
      if (ownerId === message.ownerId) {
        cacheGeneration++;
        pending.clear();
        await chrome.storage.local.set({
          accountOwner: null,
          cloudConnection: null,
          snapshot: null,
          lookupCache: [],
        });
      }
      return { released: true };
    }

    if (
      message.ownerId !== ownerId &&
      !(ownerId === null && message.ownerId === undefined)
    ) {
      throw new Error(
        'Tài khoản extension đã thay đổi. Hãy tải lại trang và đồng bộ lại.',
      );
    }

    if (message.type === 'personal-delete') {
      cacheGeneration++;
      await chrome.storage.local.set({
        [deletedKey]: [
          ...new Set([
            ...(await deletedIds()),
            message.entryId,
            ...message.sourceIds,
          ]),
        ],
      });

      for (const id of new Set([message.entryId, ...message.sourceIds]))
        await queue.removeEntry(id);
      await forgetTranslations(message.headword);

      const [snapshotStorage, cacheStorage] = await Promise.all([
        chrome.storage.local.get('snapshot'),
        chrome.storage.local.get('lookupCache'),
      ]);

      const snapshot = snapshotSchema.safeParse(snapshotStorage.snapshot);

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
              (entry) =>
                entry.id !== message.entryId &&
                !message.sourceIds.includes(entry.id),
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
        new TextEncoder().encode(JSON.stringify(snapshot)).length > 8_000_000
      ) {
        throw new Error('Snapshot too large');
      }

      const stored = await chrome.storage.local.get('snapshot');
      const old = snapshotSchema.safeParse(stored.snapshot);

      if (old.success && old.data.version > snapshot.version) {
        throw new Error('Snapshot is stale');
      }

      const deleted = new Set(await deletedIds());
      await chrome.storage.local.set({
        snapshot: {
          ...snapshot,
          entries: snapshot.entries.filter((entry) => !deleted.has(entry.id)),
        },
      });

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
  };
  const operation =
    message.type === 'lookup' || message.type === 'translate-sense'
      ? work()
      : serialMutation(work);
  void operation.then(
    (value) => respond({ ok: true, value }),
    (cause: unknown) =>
      respond({
        ok: false,
        error:
          cause instanceof Error ? cause.message : 'Extension operation failed',
      }),
  );

  return true;
});
