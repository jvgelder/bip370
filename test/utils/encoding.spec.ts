import { describe, it } from 'mocha';
import { compare, concat } from 'uint8array-tools';
import assert from 'assert';

import {
  decodeVarInt,
  encodeVarInt,
  readBigInt64LE,
  readUInt32LE,
  writeBigInt64LE,
  writeUInt32LE,
} from '../../ts_src/lib/utils/encoding.js';

describe('Encoding Utility Functions', () => {
  it('should compare buffers correctly', () => {
    const a = new Uint8Array([1, 2, 3]);
    const b = new Uint8Array([1, 2, 3]);
    const c = new Uint8Array([1, 2, 4]);

    assert.strictEqual(compare(a, b), 0);
    assert.strictEqual(compare(a, c) < 0, true);
  });

  it('should concatenate buffers', () => {
    const a = new Uint8Array([1, 2]);
    const b = new Uint8Array([3, 4]);
    const result = concat([a, b]);
    assert.deepStrictEqual(result, new Uint8Array([1, 2, 3, 4]));
  });

  it('should read/write uint32 LE', () => {
    const value = 0x12345678;
    const buf = writeUInt32LE(value);
    assert.strictEqual(readUInt32LE(buf), value);
  });

  it('should read/write int64 LE', () => {
    const value = BigInt('1000000000000');
    const buf = writeBigInt64LE(value);
    assert.strictEqual(readBigInt64LE(buf), value);
  });

  it('should encode/decode varints', () => {
    const values = [0, 1, 252, 253, 65535, 65536, 0xffffffff];
    for (const v of values) {
      const encoded = encodeVarInt(v);
      const decoded = decodeVarInt(encoded);
      assert.strictEqual(decoded.value, v, `varint ${v}`);
    }
  });
});
