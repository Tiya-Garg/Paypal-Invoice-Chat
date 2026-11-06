import { describe, it, expect } from 'vitest';
import { generateInviteToken, hashToken } from '../src/auth/tokens.js';

describe('Invite Token SHA-256 Storage Security', () => {
  it('generates high entropy tokens and never stores raw tokens', () => {
    const { rawToken, tokenHash } = generateInviteToken();

    expect(rawToken.length).toBeGreaterThanOrEqual(40);
    expect(tokenHash).toBe(hashToken(rawToken));
    expect(rawToken).not.toBe(tokenHash);
  });
});

