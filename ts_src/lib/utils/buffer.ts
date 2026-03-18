import { compare } from 'uint8array-tools';

/**
 * Reverse a buffer (for txid display conversion)
 */
export function reverseBuffer(buffer: Uint8Array): Uint8Array {
  const result = new Uint8Array(buffer.length);
  for (let i = 0; i < buffer.length; i++) {
    result[i] = buffer[buffer.length - 1 - i];
  }
  return result;
}

/**
 * Clone a buffer
 */
export function cloneBuffer(buffer: Uint8Array): Uint8Array {
  const clone = new Uint8Array(buffer.length);
  clone.set(buffer);
  return clone;
}

/**
 * Check if two buffers are equal
 */
export function bufferEquals(a: Uint8Array, b: Uint8Array): boolean {
  return compare(a, b) === 0;
}
