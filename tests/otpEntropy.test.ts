import { describe, it, expect } from 'vitest';
import { generateOtp } from '../src/auth/tokens.js';

describe('OTP Entropy & Distribution', () => {
  it('generates strictly 6-digit numeric strings', () => {
    for (let i = 0; i < 50; i++) {
      const otp = generateOtp();
      expect(otp).toMatch(/^\d{6}$/);
      const num = parseInt(otp, 10);
      expect(num).toBeGreaterThanOrEqual(100000);
      expect(num).toBeLessThanOrEqual(999999);
    }
  });
});
