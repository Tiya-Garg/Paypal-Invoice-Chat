import crypto from 'node:crypto';
import { env } from '../config/env.js';

export interface SessionPayload {
  userId: string;
  role: 'seller' | 'firm';
  email: string;
  invoiceId?: string; // Set when bound to a specific invoice (e.g. firm invite)
  exp: number; // Unix epoch seconds
}

export interface MagicLinkToken {
  email: string;
  role: 'seller';
  exp: number;
}

/**
 * Creates HMAC SHA-256 signature for signed payloads.
 */
function signString(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('base64url');
}

/**
 * Signs a session payload into a compact token string: header.payload.signature
 */
export function signSession(payload: SessionPayload): string {
  const serialized = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = signString(serialized, env.SESSION_SECRET);
  return `${serialized}.${signature}`;
}

/**
 * Verifies and decodes a session token. Returns null if invalid or expired.
 */
export function verifySession(token: string): SessionPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [serialized, signature] = parts;
  if (!serialized || !signature) return null;

  const expectedSig = signString(serialized, env.SESSION_SECRET);
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(serialized, 'base64url').toString('utf8')) as SessionPayload;
    if (parsed.exp && Date.now() / 1000 > parsed.exp) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Generates a high-entropy random invite token for a firm.
 * Returns { rawToken, tokenHash } where ONLY tokenHash is stored in the database.
 */
export function generateInviteToken(): { rawToken: string; tokenHash: string } {
  const rawToken = crypto.randomBytes(32).toString('base64url');
  const tokenHash = hashToken(rawToken);
  return { rawToken, tokenHash };
}

/**
 * Computes standard SHA-256 hash for secure storage and comparison.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generates a 6-digit numeric OTP for firm email verification.
 */
export function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Generates a signed magic login link token for the seller.
 */
export function generateMagicLink(email: string): string {
  const payload: MagicLinkToken = {
    email: email.toLowerCase().trim(),
    role: 'seller',
    exp: Math.floor(Date.now() / 1000) + 15 * 60, // 15 min expiry
  };
  const serialized = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = signString(serialized, env.SESSION_SECRET);
  return `${serialized}.${signature}`;
}

/**
 * Verifies seller magic link token.
 */
export function verifyMagicLink(token: string): MagicLinkToken | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [serialized, signature] = parts;
  if (!serialized || !signature) return null;

  const expectedSig = signString(serialized, env.SESSION_SECRET);
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(serialized, 'base64url').toString('utf8')) as MagicLinkToken;
    if (Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

