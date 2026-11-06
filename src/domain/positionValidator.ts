/**
 * Validates invoice item position indexing in invoice table
 */
export function validateItemPosition(pos: number): number {
  if (!Number.isInteger(pos) || pos < 0) {
    throw new Error(`Item position must be a non-negative integer. Received: ${pos}`);
  }
  return pos;
}
