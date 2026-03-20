/**
 * Validate that a buffer has expected length
 */
export function assertLength(buf, expected, name) {
  if (buf.length !== expected) {
    throw new Error(`${name} must be ${expected} bytes, got ${buf.length}`);
  }
}
/**
 * Validate that a number is a valid uint32
 */
export function assertUInt32(value, name) {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) {
    throw new Error(`${name} must be a uint32`);
  }
}
/**
 * Validate that a value is a valid uint64 bigint
 */
export function assertUInt64(value, name) {
  if (value < BigInt(0) || value > BigInt('0xffffffffffffffff')) {
    throw new Error(`${name} must be a uint64`);
  }
}
