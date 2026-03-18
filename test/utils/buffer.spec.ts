import { describe, it } from 'mocha';
import assert from 'assert';
import { reverseBuffer } from '../../ts_src/lib/utils/buffer.js';
import { compare, concat } from 'uint8array-tools';

describe('Utility Functions', () => {
  it('should reverse buffers', () => {
    const original = new Uint8Array([1, 2, 3, 4]);
    const reversed = reverseBuffer(original.slice());
    assert.deepStrictEqual(reversed, new Uint8Array([4, 3, 2, 1]));
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
});
