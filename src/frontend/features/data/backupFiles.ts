import { backend, initializeBackend } from '../../backend';

export type Backup = ReturnType<typeof backend.backup.inspect>;

function localDate(timestamp: number): string {
  const date = new Date(timestamp);

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export async function downloadBackup() {
  await initializeBackend();

  const backup = await backend.backup.export();

  const blob = new Blob(
    [JSON.stringify(backup, null, 2)],
    { type: 'application/json;charset=utf-8' },
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download =
    `englishvocab-backup-${localDate(backup.exportedAt)}.json`;

  document.body.append(link);

  try {
    link.click();
  } finally {
    link.remove();

    // Cho trình duyệt thời gian bắt đầu tải trước khi giải phóng URL.
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  return backup.exportedAt;
}

export async function readBackup(file: File): Promise<Backup> {
  let input: unknown;

  try {
    input = JSON.parse(await file.text());
  } catch {
    throw new Error('Không đọc được file JSON. Hãy kiểm tra lại tệp.');
  }

  // Kiểm tra dữ liệu, chưa thay đổi cơ sở dữ liệu.
  return backend.backup.inspect(input);
}

export async function restoreBackup(backup: Backup) {
  await initializeBackend();

  backend.audio.stop();

  return backend.backup.restore(backup);
}