import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/http/app.js';

describe('Health endpoints', () => {
  const app = createApp();

  it('GET /healthz returns 200 with status healthy', async () => {
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.timestamp).toBeDefined();
  });
});

