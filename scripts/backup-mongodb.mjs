import { spawnSync } from 'node:child_process';
import { createReadStream } from 'node:fs';
import {
  lstat,
  mkdir,
  mkdtemp,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { createGunzip } from 'node:zlib';
import { config } from 'dotenv';

const root = fileURLToPath(new URL('../', import.meta.url));
config({ path: join(root, '.env'), quiet: true });

async function backup() {
  const dbName = (process.env.MONGODB_DB ?? 'englishvocab').trim();
  const uri = (
    process.env.MONGODB_BACKUP_URI ?? process.env.MONGODB_URI
  )?.trim();
  if (!uri || !/^mongodb(?:\+srv)?:\/\//.test(uri)) {
    throw new Error('Cần đặt MONGODB_BACKUP_URI hoặc MONGODB_URI hợp lệ.');
  }
  if (
    !/^[a-zA-Z0-9_-]{1,63}$/.test(dbName) ||
    ['admin', 'local', 'config'].includes(dbName)
  ) {
    throw new Error('MONGODB_DB phải chỉ định một database ứng dụng hợp lệ.');
  }

  process.umask(0o077);
  const dir = resolve(
    root,
    process.env.MONGODB_BACKUP_DIR || '.mongodb-backups',
  );
  await mkdir(dir, { recursive: true, mode: 0o700 });
  const folder = await lstat(dir);
  if (
    !folder.isDirectory() ||
    (folder.mode & 0o077) !== 0 ||
    folder.uid !== process.getuid()
  ) {
    throw new Error(
      'Thư mục backup phải thuộc tài khoản đang chạy, có quyền 700 và không là symlink.',
    );
  }

  const staging = await mkdtemp(join(dir, '.incomplete-'));
  try {
    const configFile = join(staging, 'mongo.yml');
    const archive = join(staging, 'backup.archive.gz');
    // JSON string quoting is valid YAML; the URI is kept out of process arguments and logs.
    await writeFile(configFile, `uri: ${JSON.stringify(uri)}\n`, {
      mode: 0o600,
    });
    const dump = spawnSync(
      'mongodump',
      [
        `--config=${configFile}`,
        `--db=${dbName}`,
        `--archive=${archive}`,
        '--gzip',
        '--numParallelCollections=1',
        '--excludeCollection=auth_sessions',
        '--excludeCollection=password_resets',
        '--excludeCollection=extension_grants',
      ],
      {
        stdio: ['ignore', 'ignore', 'pipe'],
        encoding: 'utf8',
        timeout: 15 * 60_000,
        killSignal: 'SIGKILL',
      },
    );
    await rm(configFile);

    if (dump.error?.code === 'ENOENT')
      throw new Error('Không tìm thấy mongodump trong PATH.');
    if (dump.error?.code === 'ETIMEDOUT')
      throw new Error('mongodump vượt quá 15 phút.');
    if (dump.status !== 0) {
      const diagnostics = dump.stderr ?? '';
      const reason =
        /authentication failed|bad auth|unable to authenticate|not authorized/i.test(
          diagnostics,
        )
          ? 'Xác thực thất bại hoặc tài khoản thiếu quyền đọc.'
          : /no such host|lookup .* on |operation not permitted|server selection|connection refused|i\/o timeout/i.test(
                diagnostics,
              )
            ? 'Không kết nối được MongoDB. Kiểm tra DNS, mạng và Atlas Network Access.'
            : 'Kiểm tra kết nối, quyền đọc và tên database.';
      throw new Error(
        `mongodump thất bại (${dump.status ?? dump.signal ?? 'không rõ'}). ${reason}`,
      );
    }

    const { size } = await stat(archive);
    if (size === 0) throw new Error('File backup rỗng.');
    await pipeline(
      createReadStream(archive),
      createGunzip(),
      new Writable({
        write(_chunk, _encoding, callback) {
          callback();
        },
      }),
    );

    const stamp = new Date().toISOString().replaceAll(':', '-');
    const output = join(
      dir,
      `${dbName}-${stamp}-${staging.slice(-6)}.archive.gz`,
    );
    await rename(archive, output);
    console.log(`Backup ${dbName}: ${output} (${size} bytes; gzip hợp lệ)`);
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

try {
  await backup();
} catch (error) {
  console.error(`Backup thất bại: ${error.message}`);
  process.exitCode = 1;
}
