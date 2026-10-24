import { createServer } from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { prepareDatabase } from './database/prepare.js';
import { closeMongo } from './database/mongo.js';
async function start() {
    await prepareDatabase();
    const server = createServer(createApp());
    await new Promise((resolve, reject) => {
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
        if (stopping)
            return;
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
    console.error('Không khởi động được API. Kiểm tra cấu hình .env, ' +
        'Database User, Network Access và cổng server.');
    await closeMongo().catch(() => { });
    process.exitCode = 1;
});
