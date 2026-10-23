import { savePersonalEdit } from './personalEditor';
import { z } from 'zod';
import { parseEntry } from '../../../../src/content/schema';
import { VocabDB } from '../storage/db';
import { ServiceError } from '../../../../src/domain/types';
import { deletePersonalEntry } from './personalDeletion';

import { captureTransferSchema } from '../../../../src/shared/schemas/captureTransfer';
export { captureTransferSchema } from '../../../../src/shared/schemas/captureTransfer';

type CaptureTransfer = z.infer<typeof captureTransferSchema>;

export class PersonalService {
  constructor(private readonly db: VocabDB) {}
  async checkRemoval(entryId: string, revision: number) {
    return deletePersonalEntry(this.db, entryId, revision, true);
  }

  async remove(entryId: string, revision: number) {
    return deletePersonalEntry(this.db, entryId, revision);
  }
  inspectTransfer(input: unknown) {
    const parsed = captureTransferSchema.safeParse(input);

    if (!parsed.success) {
      throw new ServiceError('validation', parsed.error.message);
    }

    const bytes = new TextEncoder().encode(JSON.stringify(input)).length;

    if (bytes > 2_000_000) {
      throw new ServiceError(
        'validation',
        'File hàng đợi vượt giới hạn nhập 2 MB.',
      );
    }

    return parsed.data;
  }

  private async analyzeTransfer(transfer: CaptureTransfer) {
    const [storedEntries, storedCaptures] = await Promise.all([
      this.db.entries.toArray(),
      this.db.captures.toArray(),
    ]);

    const entries = new Map(storedEntries.map((entry) => [entry.id, entry]));
    const captures = new Map(
      storedCaptures.map((capture) => [capture.id, capture]),
    );

    let newEntries = 0;
    let newCaptures = 0;
    let duplicateCaptures = 0;
    let drafts = 0;

    for (const { entry, capture } of transfer.captures) {
      if (capture.entryId !== entry.id) {
        throw new ServiceError(
          'validation',
          'Ngữ cảnh đang tham chiếu sai ID từ.',
        );
      }

      const previousCapture = captures.get(capture.id);

      if (previousCapture) {
        if (JSON.stringify(previousCapture) !== JSON.stringify(capture)) {
          throw new ServiceError(
            'conflict',
            'Một ID ngữ cảnh đang được dùng cho dữ liệu khác.',
          );
        }

        duplicateCaptures++;
        continue;
      }

      const existing = entries.get(entry.id);

      if (existing) {
        if (
          existing.headword !== entry.headword ||
          existing.partOfSpeech !== entry.partOfSpeech ||
          existing.senseKey !== entry.senseKey
        ) {
          throw new ServiceError(
            'conflict',
            `${entry.headword}: ID đã thuộc một mục từ khác.`,
          );
        }
      } else {
        if (entry.collectionId !== 'personal') {
          throw new ServiceError(
            'validation',
            `${entry.headword}: cần có bộ từ gốc trên web trước khi nhận ngữ cảnh.`,
          );
        }

        entries.set(entry.id, entry);
        newEntries++;

        if (entry.contentStatus === 'draft') {
          drafts++;
        }
      }

      captures.set(capture.id, capture);
      newCaptures++;
    }

    return {
      newEntries,
      newCaptures,
      duplicateCaptures,
      drafts,
    };
  }

  async previewTransfer(input: unknown) {
    const transfer = this.inspectTransfer(input);

    return this.db.transaction(
      'r',
      this.db.entries,
      this.db.captures,
      () => this.analyzeTransfer(transfer),
    );
  }

  async importTransfer(input: unknown) {
    const transfer = this.inspectTransfer(input);

    return this.db.transaction(
      'rw',
      this.db.entries,
      this.db.captures,
      async () => {
        const summary = await this.analyzeTransfer(transfer);
        await this.receive(transfer);
        return summary;
      },
    );
  }

  async saveManual(input: unknown) {
    return savePersonalEdit(this.db, input);
  }

  async save(input: unknown) {
    const parsed = z
      .object({
        capture: captureSchema,
        entry: entrySchema,
      })
      .strict()
      .safeParse(input);

    if (!parsed.success) {
      throw new ServiceError('validation', parsed.error.message);
    }

    const { entry, capture } = parsed.data;

    if (capture.entryId !== entry.id) {
      throw new ServiceError('validation', 'Capture entry mismatch');
    }

    return this.db.transaction(
      'rw',
      this.db.entries,
      this.db.captures,
      async () => {
        const previous = await this.db.captures.get(capture.id);

        if (previous) {
          if (JSON.stringify(previous) !== JSON.stringify(capture)) {
            throw new ServiceError('conflict', 'Capture ID reused');
          }

          return {
            captureId: capture.id,
            entryId: previous.entryId,
            duplicate: true,
          };
        }

        const existing = await this.db.entries.get(entry.id);

        if (
          existing &&
          (existing.headword !== entry.headword ||
            existing.partOfSpeech !== entry.partOfSpeech ||
            existing.senseKey !== entry.senseKey)
        ) {
          throw new ServiceError(
            'conflict',
            'Different sense needs a new ID',
          );
        }

        if (!existing) {
          if (entry.collectionId !== 'personal') {
            throw new ServiceError(
              'validation',
              'New captures belong to personal library',
            );
          }

          await this.db.entries.add(entry);
        }

        await this.db.captures.add(capture);

        return {
          captureId: capture.id,
          entryId: entry.id,
          duplicate: false,
        };
      },
    );
  }

  async update(input: unknown) {
    const entry = parseEntry(input);

    return this.db.transaction('rw', this.db.entries, async () => {
      const old = await this.db.entries.get(entry.id);

      if (!old || old.collectionId !== 'personal') {
        throw new ServiceError('not-found', 'Personal entry missing');
      }

      if (
        old.headword !== entry.headword ||
        (old.partOfSpeech !== '' &&
          old.partOfSpeech !== entry.partOfSpeech) ||
        old.senseKey !== entry.senseKey
      ) {
        throw new ServiceError(
          'conflict',
          'Create a new entry for a different sense',
        );
      }

      if (entry.revision !== old.revision + 1) {
        throw new ServiceError('conflict', 'Stale content revision');
      }

      await this.db.entries.put(entry);
      return entry;
    });
  }

  async receive(input: unknown) {
    const parsed = captureTransferSchema.safeParse(input);

    if (!parsed.success) {
      throw new ServiceError('validation', parsed.error.message);
    }

    if (new TextEncoder().encode(JSON.stringify(input)).length > 2_000_000) {
      throw new ServiceError('validation', 'Transfer too large');
    }

    const transfer = parsed.data;

    await this.db.transaction(
      'rw',
      this.db.entries,
      this.db.captures,
      async () => {
        for (const item of transfer.captures) {
          await this.save(item);
        }
      },
    );

    return {
      protocol: 1 as const,
      type: 'capture-ack' as const,
      transferId: transfer.transferId,
      captureIds: transfer.captures.map((item) => item.capture.id),
    };
  }
}