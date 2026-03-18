import { concat } from 'uint8array-tools';
import {
  decodeVarInt,
  encodeVarInt,
  readBigUInt64LE,
  writeBigUInt64LE,
} from './encoding';
import * as varuint from 'varuint-bitcoin';

/**
 * Serialize a witness UTXO (amount + scriptPubKey)
 */
export function serializeWitnessUtxo(
  script: Uint8Array,
  value: bigint,
): Uint8Array {
  const amount = writeBigUInt64LE(value);
  const scriptLen = varuint.encode(script.length).buffer;
  return concat([amount, scriptLen, script]);
}

/**
 * Deserialize a witness UTXO
 */
export function deserializeWitnessUtxo(data: Uint8Array): {
  value: bigint;
  script: Uint8Array;
} {
  const value = readBigUInt64LE(data, 0);
  const { value: scriptLen, bytes: lenBytes } = decodeVarInt(data, 8);
  const script = data.slice(8 + lenBytes, 8 + lenBytes + scriptLen);
  return { value, script };
}

/**
 * Serialize a witness stack for FINAL_SCRIPTWITNESS
 */
export function serializeWitnessStack(stack: Uint8Array[]): Uint8Array {
  const parts: Uint8Array[] = [encodeVarInt(stack.length)];
  for (const item of stack) {
    parts.push(encodeVarInt(item.length));
    parts.push(item);
  }
  return concat(parts);
}

/**
 * Deserialize a witness stack from FINAL_SCRIPTWITNESS
 */
export function deserializeWitnessStack(data: Uint8Array): Uint8Array[] {
  const stack: Uint8Array[] = [];
  let offset = 0;

  const { value: count, bytes: countBytes } = decodeVarInt(data, offset);
  offset += countBytes;

  for (let i = 0; i < count; i++) {
    const { value: itemLen, bytes: lenBytes } = decodeVarInt(data, offset);
    offset += lenBytes;
    stack.push(data.slice(offset, offset + itemLen));
    offset += itemLen;
  }

  return stack;
}
