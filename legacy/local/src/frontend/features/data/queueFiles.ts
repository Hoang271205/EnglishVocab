import { backend, initializeBackend } from '../../backend';

export type QueuePreview = {
  fileName: string;
  transfer: ReturnType<typeof backend.personal.inspectTransfer>;
  summary: Awaited<ReturnType<typeof backend.personal.previewTransfer>>;
};

export async function previewQueueFile(file: File): Promise<QueuePreview> {
  let input: unknown;

  try {
    input = JSON.parse(await file.text());
  } catch {
    throw new Error('Không đọc được file JSON.');
  }

  const transfer = backend.personal.inspectTransfer(input);

  await initializeBackend();

  const summary = await backend.personal.previewTransfer(transfer);

  return {
    fileName: file.name,
    transfer,
    summary,
  };
}

export async function importQueueFile(transfer: QueuePreview['transfer']) {
  await initializeBackend();

  return backend.personal.importTransfer(transfer);
}
