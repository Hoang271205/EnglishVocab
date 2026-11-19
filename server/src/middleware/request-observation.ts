import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

export interface RequestMetric {
  event: 'api_request';
  requestId: string;
  method: string;
  route: string;
  status: number;
  durationMs: number;
  outcome: 'finished' | 'aborted';
}
// Keep bodies, query strings, account IDs, cookies and error messages out of logs.
export function observeRequests(
  record: (metric: RequestMetric) => void = (metric) =>
    console.log(JSON.stringify(metric)),
): RequestHandler {
  return (request, response, next) => {
    const started = performance.now();
    const requestId = randomUUID();
    response.setHeader('X-Request-ID', requestId);
    response.locals.requestId = requestId;
    let recorded = false;
    function finish(outcome: RequestMetric['outcome']) {
      if (recorded) return;
      recorded = true;
      const route: unknown = request.route?.path;
      record({
        event: 'api_request',
        requestId,
        method: request.method,
        route:
          typeof route === 'string'
            ? `${request.baseUrl}${route}`
            : '/unmatched',
        status: response.statusCode,
        durationMs: Math.round((performance.now() - started) * 100) / 100,
        outcome,
      });
    }
    response.once('finish', () => finish('finished'));
    response.once('close', () => finish('aborted'));
    next();
  };
}
