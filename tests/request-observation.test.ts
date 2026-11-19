import assert from 'node:assert/strict';
import { test } from 'node:test';
import express from 'express';
import { createServer } from 'node:http';
import { observeRequests } from '../server/src/middleware/request-observation';
import type { RequestMetric } from '../server/src/middleware/request-observation';

test('API metrics correlate requests and omit private path parameters and queries', async (t) => {
  const metrics: RequestMetric[] = [];
  const app = express();
  app.use(
    '/api',
    observeRequests((metric) => metrics.push(metric)),
  );
  const router = express.Router();
  router.get('/:id', (_req, res) => {
    res.status(503).json({ error: 'Unavailable' });
  });
  app.use('/api/study', router);
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise<void>((resolve) => server.close(() => resolve())));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const response = await fetch(
    `http://127.0.0.1:${address.port}/api/study/private-session?token=secret`,
  );
  await response.text();
  assert.equal(metrics.length, 1);
  const metric = metrics[0]!;
  assert.equal(metric.requestId, response.headers.get('x-request-id'));
  assert.equal(metric.route, '/api/study/:id');
  assert.equal(metric.status, 503);
  assert.equal(metric.outcome, 'finished');
  assert.ok(metric.durationMs >= 0);
  assert.doesNotMatch(JSON.stringify(metric), /private-session|secret|token/);
});
