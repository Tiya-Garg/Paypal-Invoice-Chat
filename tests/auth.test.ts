import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/http/app.js';
import { authRouter, participantStore } from '../src/auth/routes.js';
import {
  signSession,
  verifySession,
  generateInviteToken,
  hashToken,
} from '../src/auth/tokens.js';
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME, SESSION_COOKIE_NAME } from '../src/auth/middleware.js';

describe('Authentication & Authorization Suite', () => {
  const app = createApp();
  app.use('/api', authRouter);

  it('signs and verifies session tokens securely with HMAC SHA-256', () => {
    const sessionToken = signSession({
      userId: 'user-123',
      email: 'seller@test.com',
      role: 'seller',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    const verified = verifySession(sessionToken);
    expect(verified).not.toBeNull();
    expect(verified?.email).toBe('seller@test.com');
    expect(verified?.role).toBe('seller');

    // Tampered token fails verification
    const tampered = sessionToken.slice(0, -4) + 'abcd';
    expect(verifySession(tampered)).toBeNull();
  });

  it('rejects expired session tokens', () => {
    const expiredToken = signSession({
      userId: 'user-expired',
      email: 'old@test.com',
      role: 'seller',
      exp: Math.floor(Date.now() / 1000) - 100, // Expired
    });
    expect(verifySession(expiredToken)).toBeNull();
  });

  it('executes seller magic-link verification flow', async () => {
    const reqRes = await request(app)
      .post('/api/auth/magic-link')
      .send({ email: 'seller@example.com' });

    expect(reqRes.status).toBe(200);
    const magicUrl = reqRes.body.magicUrl as string;
    expect(magicUrl).toBeDefined();

    const verifyUrl = magicUrl.replace('http://localhost:3000', '');
    const verifyRes = await request(app).get(verifyUrl);

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.status).toBe('authenticated');
    expect(verifyRes.body.user.email).toBe('seller@example.com');
    expect(verifyRes.headers['set-cookie']).toBeDefined();
  });

  it('allows seller to create firm invite, verifies OTP, and rejects revoked invites', async () => {
    // 1. Establish seller session
    const sellerSession = signSession({
      userId: 'seller-id-1',
      email: 'seller@firm.com',
      role: 'seller',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const csrfVal = 'test-csrf-token-1234';

    // 2. Seller creates invite
    const inviteRes = await request(app)
      .post('/api/auth/invite')
      .set('Cookie', [`${SESSION_COOKIE_NAME}=${sellerSession}`, `${CSRF_COOKIE_NAME}=${csrfVal}`])
      .set(CSRF_HEADER_NAME, csrfVal)
      .send({
        invoiceId: 'inv-123',
        firmEmail: 'buyer@firmx.com',
        expiryDays: 14,
      });

    expect(inviteRes.status).toBe(201);
    const rawToken = inviteRes.body.rawToken as string;
    expect(rawToken).toBeDefined();

    // 3. Firm requests OTP using the invite token
    const otpRes = await request(app)
      .post('/api/auth/firm/request-otp')
      .send({ token: rawToken });

    expect(otpRes.status).toBe(200);
    const devOtp = otpRes.body.devOtp as string;
    expect(devOtp).toBeDefined();

    // 4. Firm verifies OTP
    const firmAuthRes = await request(app)
      .post('/api/auth/firm/verify-otp')
      .send({ token: rawToken, otp: devOtp });

    expect(firmAuthRes.status).toBe(200);
    expect(firmAuthRes.body.status).toBe('authenticated');
    expect(firmAuthRes.body.role).toBe('firm');
    expect(firmAuthRes.body.invoiceId).toBe('inv-123');

    // 5. Seller revokes invite
    const tokenHash = hashToken(rawToken);
    const revokeRes = await request(app)
      .post('/api/auth/invite/revoke')
      .set('Cookie', [`${SESSION_COOKIE_NAME}=${sellerSession}`, `${CSRF_COOKIE_NAME}=${csrfVal}`])
      .set(CSRF_HEADER_NAME, csrfVal)
      .send({ tokenHash });

    expect(revokeRes.status).toBe(200);

    // 6. Requesting OTP again with revoked token is rejected
    const revokedOtpRes = await request(app)
      .post('/api/auth/firm/request-otp')
      .send({ token: rawToken });

    expect(revokedOtpRes.status).toBe(403);
  });

  it('enforces CSRF protection on mutating endpoints', async () => {
    const sellerSession = signSession({
      userId: 'seller-id-1',
      email: 'seller@firm.com',
      role: 'seller',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    // Attempt without CSRF header
    const res = await request(app)
      .post('/api/auth/invite')
      .set('Cookie', [`${SESSION_COOKIE_NAME}=${sellerSession}`])
      .send({
        invoiceId: 'inv-123',
        firmEmail: 'buyer@firmx.com',
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('CSRF');
  });
});

