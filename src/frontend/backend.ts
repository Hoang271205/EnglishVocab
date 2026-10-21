import { z } from 'zod';
import { createBackend } from '../backend';

export const backend = createBackend();

const manifestSchema = z.object({
  schemaVersion: z.literal(1),
  packs: z
    .array(
      z.object({
        url: z.string().startsWith('/content/'),
        contentVersion: z.string().min(1),
      }),
    )
    .min(1),
});

let initialization: Promise<void> | undefined;

async function readJson(path: string): Promise<unknown> {
  const response = await fetch(path, {
    cache: 'no-cache',
  });

  if (!response.ok) {
    throw new Error(`Không tải được ${path} — HTTP ${response.status}`);
  }

  return response.json();
}

async function loadContent(): Promise<void> {
  const manifest = manifestSchema.parse(await readJson('/content/index.json'));

  for (const item of manifest.packs) {
    const pack = backend.content.inspect(await readJson(item.url));

    if (pack.contentVersion !== item.contentVersion) {
      throw new Error(`Phiên bản gói từ không khớp: ${item.url}`);
    }

    await backend.content.seed(pack);
  }
}

export function initializeBackend(): Promise<void> {
  if (!initialization) {
    initialization = loadContent().catch((error: unknown) => {
      initialization = undefined;
      throw error;
    });
  }

  return initialization;
}
