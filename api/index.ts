import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApp } from '../server/src/app.js';
import { connectMongo } from '../server/src/database/mongo.js';

// One module instance reuses its application and MongoDB connection pool.
// Schema/index preparation is a separate deployment step, never a request task.
const app = createApp({ serveFrontend: false });

export default async function handler(
  request: IncomingMessage,
  response: ServerResponse,
) {
  try {
    await connectMongo();
  } catch (error) {
    // Do not log connection strings or credentials.
    console.error('API database initialization failed', {
      name: error instanceof Error ? error.name : 'UnknownError',
    });
    response.statusCode = 503;
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('Cache-Control', 'no-store');
    response.end(
      JSON.stringify({
        error: {
          code: 'DATABASE_UNAVAILABLE',
          message: 'Chưa kết nối được dữ liệu. Hãy thử lại sau.',
        },
      }),
    );
    return;
  }
  app(request, response);
}
