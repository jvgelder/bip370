import * as tools from 'uint8array-tools';
import * as varuint from 'varuint-bitcoin';
export function readUInt8(buf, offset = 0) {
  return tools.readUInt8(buf, offset);
}
export function readUInt16LE(buf, offset = 0) {
  return tools.readUInt16(buf, offset, 'LE');
}
export function readUInt32LE(buf, offset = 0) {
  return tools.readUInt32(buf, offset, 'LE');
}
export function readInt32LE(buf, offset = 0) {
  return tools.readInt32(buf, offset, 'LE');
}
export function readBigUInt64LE(buf, offset = 0) {
  return tools.readUInt64(buf, offset, 'LE');
}
export function readBigInt64LE(buf, offset = 0) {
  return tools.readInt64(buf, offset, 'LE');
}
// === Write Functions ===
export function writeUInt8(val) {
  const buf = new Uint8Array(1);
  tools.writeUInt8(buf, 0, val);
  return buf;
}
export function writeUInt16LE(val) {
  const buf = new Uint8Array(2);
  tools.writeUInt16(buf, 0, val, 'LE');
  return buf;
}
export function writeUInt32LE(val) {
  const buf = new Uint8Array(4);
  tools.writeUInt32(buf, 0, val, 'LE');
  return buf;
}
export function writeInt32LE(val) {
  const buf = new Uint8Array(4);
  tools.writeInt32(buf, 0, val, 'LE');
  return buf;
}
export function writeBigUInt64LE(val) {
  const buf = new Uint8Array(8);
  tools.writeUInt64(buf, 0, val, 'LE');
  return buf;
}
export function writeBigInt64LE(val) {
  const buf = new Uint8Array(8);
  tools.writeInt64(buf, 0, val, 'LE');
  return buf;
}
// === VarInt Utilities ===
/**
 * Encode a number as a Bitcoin varint
 */
export function encodeVarInt(value) {
  return varuint.encode(value).buffer;
}
/**
 * Decode a Bitcoin varint from a buffer
 */
export function decodeVarInt(buffer, offset = 0) {
  const result = varuint.decode(buffer, offset);
  if (result.numberValue === null)
    throw new Error('VarInt too large for number');
  return { value: result.numberValue, bytes: result.bytes };
}
/**
 * Get the encoded size of a varint
 */
export function varIntSize(value) {
  return varuint.encodingLength(value);
}
