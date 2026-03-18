import { describe, it } from 'mocha';
import { toHex } from 'uint8array-tools';
import assert from 'assert';
import { keyFromType, parseKey } from '../../ts_src/lib/utils/psbtkey.js';

describe('PSBT keyUtility Functions', () => {
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
});
