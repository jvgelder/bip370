import { describe, it } from 'mocha';
import assert from 'assert';
import { cloneMap } from '../../ts_src/lib/utils/map.js';

describe('Utility Functions', () => {
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
});
