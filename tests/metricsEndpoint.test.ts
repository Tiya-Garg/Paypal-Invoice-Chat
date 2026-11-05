import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/http/app.js';
import { metricsRouter } from '../src/http/metricsRoute.js';

describe('Metrics Endpoint', () => {
  const app = createApp();
  app.use(metricsRouter);

  it('GET /metrics returns 200 and JSON snapshot of telemetry counters', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.body.llmSuccessRatePercent).toBeDefined();
    expect(res.body.syncFailures).toBeDefined();
    expect(res.body.mismatchCount).toBeDefined();
  });
});
