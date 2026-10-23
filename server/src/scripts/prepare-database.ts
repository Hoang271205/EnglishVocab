import { prepareDatabase } from '../database/prepare.js';
import { closeMongo } from '../database/mongo.js';

try {
  await prepareDatabase();
  console.log(
    'Đã chuẩn bị các index và bộ đếm MongoDB. Không xoá dữ liệu hiện có.',
  );
} catch (error) {
  console.error(
    'Không chuẩn bị được database. Kiểm tra cấu hình và quyền truy cập.',
    {
      name: error instanceof Error ? error.name : 'UnknownError',
    },
  );
  process.exitCode = 1;
} finally {
  await closeMongo().catch(() => {
    process.exitCode = 1;
  });
}
