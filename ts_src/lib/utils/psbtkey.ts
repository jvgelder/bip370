import { concat, fromHex, toHex } from 'uint8array-tools';
import { KeyValue } from '../types';

/**
 * Get a typed key from hex string
 */
export function keyFromType(type: number, keyData?: Uint8Array): string {
  if (keyData) {
    return toHex(concat([new Uint8Array([type]), keyData]));
  }
  return toHex(new Uint8Array([type]));
}

/**
 * Parse a key into type and data
 */
export function parseKey(keyHex: string): { type: number; data: Uint8Array } {
  const keyBytes = fromHex(keyHex);
  return {
    type: keyBytes[0],
    data: keyBytes.slice(1),
  };
}

export function parseKeyFromArray(keyArray: Uint8Array): {
  type: number;
  data: Uint8Array;
} {
  return {
    type: keyArray[0],
    data: keyArray.slice(1),
  };
}

/**
 * Sorts key-value pairs according to BIP-174 rules:
 * Lexicographically by key bytes (shorter keys that are prefixes sort first)
 */
export function sortKeyVals(entries: KeyValue[]): KeyValue[] {
  return entries.sort((a, b) => {
    // Compare byte by byte
    const minLen = Math.min(a.key.length, b.key.length);
    for (let i = 0; i < minLen; i++) {
      if (a.key[i] !== b.key[i]) {
        return a.key[i] - b.key[i];
      }
    }
    // If all compared bytes are equal, shorter key comes first
    return a.key.length - b.key.length;
  });
}
