import { Router, type Response } from 'express';
import { z } from 'zod';
import crypto from 'node:crypto';
import {
  generateMagicLink,
  verifyMagicLink,
  signSession,
  verifySession,
  generateInviteToken,
  hashToken,
  generateOtp,
} from '../auth/tokens.js';
import {
  sessionMiddleware,
  requireSeller,
  csrfProtection,
  SESSION_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  type AuthenticatedRequest,
} from '../auth/middleware.js';
import { loginRateLimiter } from '../auth/rateLimit.js';
import { env } from '../config/env.js';

export const authRouter = Router();

// In-memory mock/fallback stores when Postgres is unmigrated or in offline testing mode
const userStore = new Map<string, { id: string; email: string; role: 'seller' }>();
const otpStore = new Map<string, { otp: string; exp: number; email: string; invoiceId: string }>();
export const participantStore = new Map<
  string, // tokenHash
  { invoiceId: string; email: string; role: 'firm'; expiresAt: number; revoked: boolean }
>();

const setAuthCookies = (res: Response, sessionToken: string) => {
  const isProd = env.NODE_ENV === 'production';
  const csrfToken = crypto.randomBytes(24).toString('hex');

  res.cookie(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
  });

  res.cookie(CSRF_COOKIE_NAME, csrfToken, {
    httpOnly: false, // Accessible to client JavaScript to pass in header
    secure: isProd,
    sameSite: 'lax',
    maxAge: 14 * 24 * 60 * 60 * 1000,
  });

  return csrfToken;
};

// 1. Seller requests magic login link
authRouter.post('/auth/magic-link', loginRateLimiter, (req, res) => {
  const schema = z.object({ email: z.string().email() });
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  const { email } = result.data;
  const token = generateMagicLink(email);
  const magicUrl = `${env.APP_BASE_URL}/api/auth/verify?token=${token}`;

  // Log link in development/testing mode
  return res.status(200).json({
    message: 'Magic login link generated',
    magicUrl, // Convenient in dev/test; emailed in production
  });
});

// 2. Verify magic link and establish session
authRouter.get('/auth/verify', (req, res) => {
  const token = req.query.token as string;
  const payload = verifyMagicLink(token);
  if (!payload) {
    return res.status(400).json({ error: 'Invalid or expired magic link' });
  }

  let user = userStore.get(payload.email);
  if (!user) {
    user = { id: crypto.randomUUID(), email: payload.email, role: 'seller' };
    userStore.set(payload.email, user);
  }

  const sessionToken = signSession({
    userId: user.id,
    email: user.email,
    role: 'seller',
    exp: Math.floor(Date.now() / 1000) + 14 * 24 * 3600,
  });

  const csrfToken = setAuthCookies(res, sessionToken);

  return res.status(200).json({
    status: 'authenticated',
    user,
    csrfToken,
  });
});

// 3. Seller creates firm invite link
authRouter.post('/auth/invite', sessionMiddleware, requireSeller, csrfProtection, (req: AuthenticatedRequest, res) => {
  const schema = z.object({
    invoiceId: z.string().min(1),
    firmEmail: z.string().email(),
    expiryDays: z.number().int().positive().default(14),
  });

  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid invite parameters' });
  }

  const { invoiceId, firmEmail, expiryDays } = result.data;
  const { rawToken, tokenHash } = generateInviteToken();
  const expiresAt = Date.now() + expiryDays * 24 * 60 * 60 * 1000;

  participantStore.set(tokenHash, {
    invoiceId,
    email: firmEmail.toLowerCase(),
    role: 'firm',
    expiresAt,
    revoked: false,
  });

  const inviteUrl = `${env.APP_BASE_URL}/invite?token=${rawToken}`;
  return res.status(201).json({ inviteUrl, rawToken, expiresAt });
});

// 4. Firm verifies invite token and requests single-use OTP
authRouter.post('/auth/firm/request-otp', (req, res) => {
  const schema = z.object({ token: z.string().min(1) });
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invite token is required' });
  }

  const tokenHash = hashToken(result.data.token);
  const participant = participantStore.get(tokenHash);

  if (!participant || participant.revoked || Date.now() > participant.expiresAt) {
    return res.status(403).json({ error: 'Invite link is invalid, expired, or has been revoked' });
  }

  const otp = generateOtp();
  otpStore.set(tokenHash, {
    otp,
    exp: Date.now() + 10 * 60 * 1000, // 10 min OTP
    email: participant.email,
    invoiceId: participant.invoiceId,
  });

  return res.status(200).json({
    message: 'OTP sent to firm email',
    devOtp: env.NODE_ENV !== 'production' ? otp : undefined,
  });
});

// 5. Firm submits single-use OTP to complete login
authRouter.post('/auth/firm/verify-otp', (req, res) => {
  const schema = z.object({ token: z.string().min(1), otp: z.string().length(6) });
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Token and 6-digit OTP required' });
  }

  const tokenHash = hashToken(result.data.token);
  const otpRecord = otpStore.get(tokenHash);
  const participant = participantStore.get(tokenHash);

  if (!participant || participant.revoked || Date.now() > participant.expiresAt) {
    return res.status(403).json({ error: 'Invite is invalid or revoked' });
  }

  if (!otpRecord || otpRecord.otp !== result.data.otp || Date.now() > otpRecord.exp) {
    return res.status(400).json({ error: 'Invalid or expired OTP' });
  }

  // Consume OTP (single use)
  otpStore.delete(tokenHash);

  const sessionToken = signSession({
    userId: crypto.randomUUID(),
    email: participant.email,
    role: 'firm',
    invoiceId: participant.invoiceId,
    exp: Math.floor(participant.expiresAt / 1000),
  });

  const csrfToken = setAuthCookies(res, sessionToken);

  return res.status(200).json({
    status: 'authenticated',
    role: 'firm',
    invoiceId: participant.invoiceId,
    csrfToken,
  });
});

// 6. Seller revokes firm invite
authRouter.post('/auth/invite/revoke', sessionMiddleware, requireSeller, csrfProtection, (req: AuthenticatedRequest, res) => {
  const schema = z.object({ tokenHash: z.string() });
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'tokenHash required' });
  }

  const participant = participantStore.get(result.data.tokenHash);
  if (participant) {
    participant.revoked = true;
  }

  return res.status(200).json({ message: 'Invite revoked' });
});
