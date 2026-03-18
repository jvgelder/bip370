/**
 * Validate that a buffer has expected length
 */
export function assertLength(
  buf: Uint8Array,
  expected: number,
  name: string,
): void {
  if (buf.length !== expected) {
    throw new Error(`${name} must be ${expected} bytes, got ${buf.length}`);
  }
}

/**
 * Validate that a number is a valid uint32
 */
export function assertUInt32(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) {
    throw new Error(`${name} must be a uint32`);
  }
}

/**
 * Validate that a value is a valid uint64 bigint
 */
export function assertUInt64(value: bigint, name: string): void {
  if (value < BigInt(0) || value > BigInt('0xffffffffffffffff')) {
    throw new Error(`${name} must be a uint64`);
  }
}
