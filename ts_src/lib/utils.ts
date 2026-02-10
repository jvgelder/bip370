/**
 * BIP-370 PSBTv2 Utility Functions
 */
import * as tools from 'uint8array-tools';
import * as varuint from 'varuint-bitcoin';
import { compare, concat, fromHex, toHex } from 'uint8array-tools';
import { script } from 'bitcoinjs-lib';
import { SCRIPT_TYPE, ScriptType } from './typefields';
export const OPS = script.OPS;

/**
 * Key-value pair for PSBT maps
 */
export interface KeyValue {
  key: Uint8Array;
  value: Uint8Array;
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

export function readUInt8(buf: Uint8Array, offset: number = 0): number {
  return tools.readUInt8(buf, offset);
}

export function readUInt16LE(buf: Uint8Array, offset: number = 0): number {
  return tools.readUInt16(buf, offset, 'LE');
}

export function readUInt32LE(buf: Uint8Array, offset: number = 0): number {
  return tools.readUInt32(buf, offset, 'LE');
}

export function readInt32LE(buf: Uint8Array, offset: number = 0): number {
  return tools.readInt32(buf, offset, 'LE');
}

export function readBigUInt64LE(buf: Uint8Array, offset: number = 0): bigint {
  return tools.readUInt64(buf, offset, 'LE');
}

export function readBigInt64LE(buf: Uint8Array, offset: number = 0): bigint {
  return tools.readInt64(buf, offset, 'LE');
}

// === Write Functions ===

export function writeUInt8(val: number): Uint8Array {
  const buf = new Uint8Array(1);
  tools.writeUInt8(buf, 0, val);
  return buf;
}

export function writeUInt16LE(val: number): Uint8Array {
  const buf = new Uint8Array(2);
  tools.writeUInt16(buf, 0, val, 'LE');
  return buf;
}

export function writeUInt32LE(val: number): Uint8Array {
  const buf = new Uint8Array(4);
  tools.writeUInt32(buf, 0, val, 'LE');
  return buf;
}

export function writeInt32LE(val: number): Uint8Array {
  const buf = new Uint8Array(4);
  tools.writeInt32(buf, 0, val, 'LE');
  return buf;
}

export function writeBigUInt64LE(val: bigint): Uint8Array {
  const buf = new Uint8Array(8);
  tools.writeUInt64(buf, 0, val, 'LE');
  return buf;
}

export function writeBigInt64LE(val: bigint): Uint8Array {
  const buf = new Uint8Array(8);
  tools.writeInt64(buf, 0, val, 'LE');
  return buf;
}

// === Map Utilities ===

/**
 * Deep clone a PSBT map
 */
export function cloneMap(
  map: Map<string, Uint8Array>,
): Map<string, Uint8Array> {
  const copy = new Map<string, Uint8Array>();
  for (const [key, value] of map) {
    copy.set(key, new Uint8Array(value));
  }
  return copy;
}

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

// === VarInt Utilities ===

/**
 * Encode a number as a Bitcoin varint
 */
export function encodeVarInt(value: number): Uint8Array {
  return varuint.encode(value).buffer;
}

/**
 * Decode a Bitcoin varint from a buffer
 */
export function decodeVarInt(
  buffer: Uint8Array,
  offset: number = 0,
): { value: number; bytes: number } {
  const result = varuint.decode(buffer, offset);
  if (result.numberValue === null)
    throw new Error('VarInt too large for number');
  return { value: result.numberValue, bytes: result.bytes };
}

/**
 * Get the encoded size of a varint
 */
export function varIntSize(value: number): number {
  return varuint.encodingLength(value);
}

// === Serialization Utilities ===

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

// === Script Detection ===

/**
 * Detect script type from scriptPubKey
 * Manual detection since bitcoinjs-lib v7 removed classifyOutput
 */
export function detectScriptType(scriptBuf: Uint8Array): ScriptType {
  const len = scriptBuf.length;

  // P2PKH: OP_DUP OP_HASH160 <20 bytes> OP_EQUALVERIFY OP_CHECKSIG
  if (
    len === 25 &&
    scriptBuf[0] === OPS.OP_DUP &&
    scriptBuf[1] === OPS.OP_HASH160 &&
    scriptBuf[2] === 0x14 && // Push 20 bytes
    scriptBuf[23] === OPS.OP_EQUALVERIFY &&
    scriptBuf[24] === OPS.OP_CHECKSIG
  ) {
    return SCRIPT_TYPE.P2PKH;
  }

  // P2SH: OP_HASH160 <20 bytes> OP_EQUAL
  if (
    len === 23 &&
    scriptBuf[0] === OPS.OP_HASH160 &&
    scriptBuf[1] === 0x14 && // Push 20 bytes
    scriptBuf[22] === OPS.OP_EQUAL
  ) {
    return SCRIPT_TYPE.P2SH;
  }

  // P2WPKH: OP_0 <20 bytes>
  if (
    len === 22 &&
    scriptBuf[0] === OPS.OP_0 &&
    scriptBuf[1] === 0x14 // Push 20 bytes
  ) {
    return SCRIPT_TYPE.P2WPKH;
  }

  // P2WSH: OP_0 <32 bytes>
  if (
    len === 34 &&
    scriptBuf[0] === OPS.OP_0 &&
    scriptBuf[1] === 0x20 // Push 32 bytes
  ) {
    return SCRIPT_TYPE.P2WSH;
  }

  // P2TR: OP_1 <32 bytes>
  if (
    len === 34 &&
    scriptBuf[0] === OPS.OP_1 &&
    scriptBuf[1] === 0x20 // Push 32 bytes
  ) {
    return SCRIPT_TYPE.P2TR;
  }

  // Bare multisig: OP_n <pubkeys...> OP_m OP_CHECKMULTISIG
  if (
    len >= 37 &&
    scriptBuf[0] >= OPS.OP_1 &&
    scriptBuf[0] <= OPS.OP_16 &&
    scriptBuf[len - 1] === OPS.OP_CHECKMULTISIG &&
    scriptBuf[len - 2] >= OPS.OP_1 &&
    scriptBuf[len - 2] <= OPS.OP_16
  ) {
    return SCRIPT_TYPE.P2MS;
  }

  return SCRIPT_TYPE.UNKNOWN;
}

/**
 * Check if a script is a witness program (P2WPKH, P2WSH, P2TR)
 */
export function isWitnessProgram(scriptBuf: Uint8Array): boolean {
  const type = detectScriptType(scriptBuf);
  return (
    type === SCRIPT_TYPE.P2WPKH ||
    type === SCRIPT_TYPE.P2WSH ||
    type === SCRIPT_TYPE.P2TR
  );
}

/**
 * Check if a script is taproot (P2TR)
 */
export function isTaproot(scriptBuf: Uint8Array): boolean {
  return detectScriptType(scriptBuf) === SCRIPT_TYPE.P2TR;
}

// === Buffer Utilities ===

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

// === Validation Utilities ===

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
