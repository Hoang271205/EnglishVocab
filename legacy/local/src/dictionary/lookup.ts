import { normalizeAnswer } from '../../../../src/domain/grading';
import { VocabDB } from '../storage/db';
import { queryKey, LookupError } from '../../../../src/dictionary/freeDictionary';
import { WiktionaryDictionary } from '../../../../src/dictionary/wiktionaryDictionary';
import type { LookupProvider, LookupResult } from '../../../../src/dictionary/freeDictionary';

export class DictionaryService {
  private pending = new Map<string, Promise<LookupResult>>();
  private cacheGeneration = 0;

  constructor(
    private readonly db: VocabDB,
    private readonly provider: LookupProvider = new WiktionaryDictionary(),
    private readonly now = () => Date.now(),
  ) {}

  invalidatePendingCache() {
    this.cacheGeneration++;
    this.pending.clear();
  }

  async lookup(
    word: string,
    options: { forceOnline?: boolean; signal?: AbortSignal } = {},
  ): Promise<LookupResult> {
    const key = queryKey(word);

    if (!options.forceOnline) {
      const local = (await this.db.entries.toArray()).filter(
        (entry) =>
          normalizeAnswer(entry.headword) === normalizeAnswer(key),
      );

      if (local.length) {
        return {
          query: key,
          source: 'local',
          senses: local.map((entry) => ({
            entryId: entry.id,
            partOfSpeech: entry.partOfSpeech,
            definition: entry.meaningVi,
            example: entry.examples[0]
              ? entry.examples[0].prefix +
                entry.examples[0].targetSurface +
                entry.examples[0].suffix
              : null,
            sourceUrls: entry.provenance
              .map((source) => source.url)
              .filter((source): source is string => !!source),
            licenses: entry.provenance.map((source) => ({
              name: source.license,
              url: source.url,
            })),
          })),
          phonetics: local
            .filter((entry) => entry.pronunciation.ipa)
            .map((entry) => ({
              text: entry.pronunciation.ipa,
              audio: null,
              accent: entry.pronunciation.accent,
              sourceUrl:
                entry.provenance.find((source) => source.field === 'ipa')
                  ?.url ?? null,
              license: null,
            })),
        };
      }

      try {
        const cached = await this.db.lookupCache.get(key);

        if (cached) {
          await this.db.lookupCache.update(key, {
            accessedAt: this.now(),
          });

          return {
            ...(cached.payload as LookupResult),
            source: 'cache',
          };
        }
      } catch {
        /* Cache is optional. */
      }
    }

    const enabled = await this.db.settings.get('onlineLookupEnabled');

    if (enabled?.value === false) {
      throw new LookupError('network', 'Online lookup disabled');
    }

    if (!options.signal && this.pending.has(key)) {
      return this.pending.get(key)!;
    }

    const generation = this.cacheGeneration;

    const promise = this.provider
      .lookup(key, options.signal)
      .then(async (result) => {
        try {
          await this.db.transaction(
            'rw',
            this.db.lookupCache,
            async () => {
              if (generation !== this.cacheGeneration) return;

              const now = this.now();

              await this.db.lookupCache.put({
                key,
                fetchedAt: now,
                accessedAt: now,
                payload: result,
              });

              const excess = (await this.db.lookupCache.count()) - 500;

              if (excess > 0) {
                const remove = await this.db.lookupCache
                  .orderBy('accessedAt')
                  .limit(excess)
                  .primaryKeys();

                await this.db.lookupCache.bulkDelete(remove);
              }
            },
          );
        } catch {
          /* Lookup can succeed when optional cache is full. */
        }

        return result;
      })
      .finally(() => {
        if (!options.signal && this.pending.get(key) === promise) {
          this.pending.delete(key);
        }
      });

    if (!options.signal) {
      this.pending.set(key, promise);
    }

    return promise;
  }

  async clearCache() {
    this.invalidatePendingCache();
    await this.db.lookupCache.clear();
  }
}