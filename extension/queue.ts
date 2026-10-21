import { captureTransferSchema } from '../src/services/personal';
import type { z } from 'zod';
import { ServiceError } from '../src/domain/types';

export type CaptureItem =
  z.infer<typeof captureTransferSchema>['captures'][number];

export interface QueueStorage {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
}

export class CaptureQueue {
  private tail: Promise<unknown> = Promise.resolve();

  constructor(private readonly storage: QueueStorage) {}

  private serial<T>(work: () => Promise<T>): Promise<T> {
    const next = this.tail.then(work);
    this.tail = next.catch(() => {});
    return next;
  }

  private async load() {
    const raw = await this.storage.get('captures');

    if (raw === undefined) {
      return [];
    }

    const checked = captureTransferSchema.safeParse({
      protocol: 1,
      type: 'capture-transfer',
      transferId: 'stored',
      captures: raw,
    });

    if (!checked.success) {
      throw new ServiceError('storage', 'Stored capture queue is invalid');
    }

    return checked.data.captures;
  }

  list(): Promise<CaptureItem[]> {
    return this.serial(() => this.load());
  }

  save(input: unknown) {
    return this.serial(async () => {
      const parsed = captureTransferSchema.safeParse({
        protocol: 1,
        type: 'capture-transfer',
        transferId: 'save',
        captures: [input],
      });

      if (!parsed.success) {
        throw new ServiceError('validation', 'Invalid capture');
      }

      const item = parsed.data.captures[0]!;

      if (item.capture.entryId !== item.entry.id) {
        throw new ServiceError('validation', 'Capture entry mismatch');
      }

      const queue = await this.load();
      const old = queue.find((queued) => queued.capture.id === item.capture.id);

      if (old) {
        if (JSON.stringify(old) !== JSON.stringify(item)) {
          throw new ServiceError('conflict', 'Capture ID reused');
        }

        return { saved: true, duplicate: true };
      }

      if (queue.length >= 500) {
        throw new ServiceError(
          'storage',
          'Queue is full; transfer or export captures first',
        );
      }

      await this.storage.set('captures', [...queue, item]);
      return { saved: true, duplicate: false };
    });
  }

  acknowledge(captureIds: string[]) {
    return this.serial(async () => {
      const ids = new Set(captureIds);
      const queue = await this.load();
      const remaining = queue.filter((item) => !ids.has(item.capture.id));

      await this.storage.set('captures', remaining);
      return { remaining: remaining.length };
    });
  }

  removeEntry(entryId: string) {
    return this.serial(async () => {
      const queue = await this.load();

      const remaining = queue.filter(
        (item) =>
          item.entry.id !== entryId &&
          item.capture.entryId !== entryId,
      );

      await this.storage.set('captures', remaining);

      return { removed: queue.length - remaining.length };
    });
  }
}