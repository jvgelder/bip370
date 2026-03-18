import * as tools from 'uint8array-tools';
import * as varuint from 'varuint-bitcoin';

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
