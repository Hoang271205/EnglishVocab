import { createServer } from 'node:http';
import { createApp } from './app.js';
import { ensureExtensionIndexes } from './modules/extension/access.js';
import { ensureUserIndexes } from './modules/auth/users.js';
import { env } from './config/env.js';
import { ensureLibraryIndexes } from './modules/library/collections.js';
import { ensureProgressIndexes } from './modules/progress/collections.js';
import { ensureStudyIndexes } from './modules/study/collections.js';
import { ensurePersonalIndexes } from './modules/personal/collections.js';
import { ensureTransferIndexes } from './modules/transfers/collections.js';
import { ensureSnapshotCounter } from './modules/transfers/snapshot-counter.js';
import { closeMongo, connectMongo } from './database/mongo.js';

async function start() {
  await connectMongo();

  await ensureUserIndexes();
  await ensureExtensionIndexes();
  await ensurePersonalIndexes();
  await ensureLibraryIndexes();
  await ensureProgressIndexes();
  await ensureStudyIndexes();
  await ensureTransferIndexes();
  await ensureSnapshotCounter();
  const server = createServer(createApp());

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);

    server.listen(env.PORT, env.HOST, () => {
      server.off('error', reject);
      resolve();
    });
  });

  console.log('MongoDB: đã kết nối.');
  console.log(`EnglishVocab API: http://${env.HOST}:${env.PORT}`);

  let stopping = false;

  function shutdown() {
    if (stopping) return;
    stopping = true;

    console.log('Đang đóng server…');

    const timeout = setTimeout(() => {
      process.exit(1);
    }, 10_000);

    timeout.unref();

    server.close(() => {
      void closeMongo()
        .catch(() => {
          console.error('Không đóng được kết nối MongoDB.');
          process.exitCode = 1;
        })
        .finally(() => {
          clearTimeout(timeout);
        });
    });
  }

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

void start().catch(async () => {
  console.error(
    'Không khởi động được API. Kiểm tra cấu hình .env, ' +
      'Database User, Network Access và cổng server.',
  );

  await closeMongo().catch(() => {});
  process.exitCode = 1;
});
