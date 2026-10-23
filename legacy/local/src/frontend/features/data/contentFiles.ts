import { backend, initializeBackend } from '../../backend';

export type ContentPack = ReturnType<typeof backend.content.inspect>;

export type ContentPreview = {
  fileName: string;
  pack: ContentPack;
  summary: Awaited<ReturnType<typeof backend.content.preview>>;
};

export async function previewContentFile(file: File): Promise<ContentPreview> {
  let input: unknown;

  try {
    input = JSON.parse(await file.text());
  } catch {
    throw new Error('Không đọc được file JSON.');
  }

  if (input && typeof input === 'object' && 'schedulePolicyVersion' in input) {
    throw new Error('Đây là bản sao lưu. Hãy dùng phần Khôi phục từ file.');
  }

  if (
    input &&
    typeof input === 'object' &&
    'type' in input &&
    input.type === 'capture-transfer'
  ) {
    throw new Error('Đây là file hàng đợi extension, không phải gói từ.');
  }

  const pack = backend.content.inspect(input);

  await initializeBackend();

  const summary = await backend.content.preview(pack);

  return {
    fileName: file.name,
    pack,
    summary,
  };
}

export async function importContentFile(pack: ContentPack) {
  await initializeBackend();

  return backend.content.import(pack);
}
