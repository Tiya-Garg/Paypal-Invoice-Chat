import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/http/app.js';
import { privacyRouter } from '../src/http/privacyRoute.js';
import { signSession } from '../src/auth/tokens.js';
import { SESSION_COOKIE_NAME } from '../src/auth/middleware.js';

describe('Privacy Data Deletion Route', () => {
  const app = createApp();
  app.use(privacyRouter);

  it('rejects unauthenticated requests to delete data', async () => {
    const res = await request(app).post('/api/privacy/delete-my-data').send({ confirm: true });
    expect(res.status).toBe(401);
  });

  it('processes GDPR right-to-be-forgotten deletion with valid session and confirmation', async () => {
    const sellerToken = signSession({
      userId: 'seller-gdpr-1',
      email: 'delete-me@example.com',
      role: 'seller',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    const res = await request(app)
      .post('/api/privacy/delete-my-data')
      .set('Cookie', [`${SESSION_COOKIE_NAME}=${sellerToken}`])
      .send({ confirm: true });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('scheduled_for_purge');
  });
});

