import { describe, it } from 'mocha';
import { fromHex } from 'uint8array-tools';
import assert from 'assert';
import { SCRIPT_TYPE } from '../../ts_src/lib/types.js';
import { detectScriptType } from '../../ts_src/lib/utils/script.js';

import { detectScriptType } from '../../ts_src/lib/utils/script.js';

describe('Script Utility Functions', () => {
  it('should detect script types.ts', () => {
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
});
