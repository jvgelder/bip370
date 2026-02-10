import { describe, it } from 'mocha';
import assert from 'assert';
import {
  cloneMap,
  decodeVarInt,
  detectScriptType,
  encodeVarInt,
  keyFromType,
  parseKey,
  readBigInt64LE,
  readUInt32LE,
  reverseBuffer,
  writeBigInt64LE,
  writeUInt32LE,
} from '../ts_src/lib/utils.js';
import {
  compare,
  concat,
  fromBase64,
  fromHex,
  toBase64,
  toHex,
} from 'uint8array-tools';
import { SCRIPT_TYPE } from '../ts_src/lib/typefields.js';

describe('Utility Functions', () => {
  it('should convert hex correctly', () => {
    const hex = 'deadbeef';
    const bytes = fromHex(hex);
    assert.strictEqual(toHex(bytes), hex);
  });

  it('should convert base64 correctly', () => {
    const original = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
    const b64 = toBase64(original);
    const restored = fromBase64(b64);
    assert.deepStrictEqual(restored, original);
  });

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

  it('should detect script types', () => {
    // P2WPKH: OP_0 <20 bytes>
    assert.strictEqual(
      detectScriptType(fromHex('0014' + '0'.repeat(40))),
      SCRIPT_TYPE.P2WPKH,
    );

    // P2WSH: OP_0 <32 bytes>
    assert.strictEqual(
      detectScriptType(fromHex('0020' + '0'.repeat(64))),
      SCRIPT_TYPE.P2WSH,
    );

    // P2TR: OP_1 <32 bytes>
    assert.strictEqual(
      detectScriptType(fromHex('5120' + '0'.repeat(64))),
      SCRIPT_TYPE.P2TR,
    );

    // P2PKH: OP_DUP OP_HASH160 <20 bytes> OP_EQUALVERIFY OP_CHECKSIG
    assert.strictEqual(
      detectScriptType(fromHex('76a914' + '0'.repeat(40) + '88ac')),
      SCRIPT_TYPE.P2PKH,
    );

    // P2SH: OP_HASH160 <20 bytes> OP_EQUAL
    assert.strictEqual(
      detectScriptType(fromHex('a914' + '0'.repeat(40) + '87')),
      SCRIPT_TYPE.P2SH,
    );
  });

  it('should clone maps correctly', () => {
    const original = new Map<string, Uint8Array>();
    original.set('key1', new Uint8Array([1, 2, 3]));
    original.set('key2', new Uint8Array([4, 5, 6]));

    const clone = cloneMap(original);

    // Modify original
    original.get('key1')![0] = 99;

    // Clone should be unchanged
    assert.strictEqual(clone.get('key1')![0], 1);
  });

  it('should generate keys from type', () => {
    const key = keyFromType(0x0e); // PREVIOUS_TXID type
    assert.strictEqual(key, '0e');
  });

  it('should parse keys correctly', () => {
    const keyWithData = '02' + 'deadbeef';
    const parsed = parseKey(keyWithData);
    assert.strictEqual(parsed.type, 0x02);
    assert.strictEqual(toHex(parsed.data), 'deadbeef');
  });

  it('should reverse buffers', () => {
    const original = new Uint8Array([1, 2, 3, 4]);
    const reversed = reverseBuffer(original.slice());
    assert.deepStrictEqual(reversed, new Uint8Array([4, 3, 2, 1]));
  });
});
