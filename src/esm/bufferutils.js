// Until better solution is found copy from https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/ts_src/bufferutils.ts
import * as types from './types.js';
import * as varuint from 'varuint-bitcoin';
import * as v from 'valibot';
export { varuint };
import * as tools from 'uint8array-tools';
export const MAX_JS_NUMBER = 0x001fffffffffffff;
// https://github.com/feross/buffer/blob/master/index.js#L1127
function verifuint(value, max) {
  if (typeof value !== 'number' && typeof value !== 'bigint')
    throw new Error('cannot write a non-number as a number');
  if (value < 0 || value < BigInt(0))
    throw new Error('specified a negative value for writing an unsigned value');
  if (value > max && value > BigInt(max))
    throw new Error('RangeError: value out of range');
  if (Math.floor(Number(value)) !== Number(value))
    throw new Error('value has a fractional component');
}
/**
 * Helper class for reading of bitcoin data types from a buffer.
 */
export class BufferReader {
  constructor(buffer, offset = 0) {
    this.buffer = buffer;
    this.offset = offset;
    v.parse(v.tuple([types.BufferSchema, types.UInt32Schema]), [
      buffer,
      offset,
    ]);
  }
  readUInt8() {
    const result = tools.readUInt8(this.buffer, this.offset);
    this.offset++;
    return result;
  }
  readInt32() {
    const result = tools.readInt32(this.buffer, this.offset, 'LE');
    this.offset += 4;
    return result;
  }
  readUInt32() {
    const result = tools.readUInt32(this.buffer, this.offset, 'LE');
    this.offset += 4;
    return result;
  }
  readInt64() {
    const result = tools.readInt64(this.buffer, this.offset, 'LE');
    this.offset += 8;
    return result;
  }
  readVarInt() {
    const { bigintValue, bytes } = varuint.decode(this.buffer, this.offset);
    this.offset += bytes;
    return bigintValue;
  }
  readSlice(n) {
    verifuint(n, MAX_JS_NUMBER);
    const num = Number(n);
    if (this.buffer.length < this.offset + num) {
      throw new Error('Cannot read slice out of bounds');
    }
    const result = this.buffer.slice(this.offset, this.offset + num);
    this.offset += num;
    return result;
  }
  readVarSlice() {
    return this.readSlice(this.readVarInt());
  }
  readVector() {
    const count = this.readVarInt();
    const vector = [];
    for (let i = 0; i < count; i++) vector.push(this.readVarSlice());
    return vector;
  }
}
