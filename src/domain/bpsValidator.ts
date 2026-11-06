import { MoneyArithmeticError } from './money.js';

/**
 * Validates basis points (0 to 10000 BPS representing 0% to 100%)
 */
export function validateBasisPoints(bps: bigint): bigint {
  if (bps < 0n || bps > 10000n) {
    throw new MoneyArithmeticError(`Basis points must be between 0 and 10000 (0% - 100%). Received: ${bps}`);
  }
  return bps;
}
