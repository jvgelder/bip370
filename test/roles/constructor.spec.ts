import { describe, it } from 'mocha';
import assert from 'assert';
import { fromHex } from 'uint8array-tools';

import { PSBTv2Builder } from '../../ts_src/lib/index.js';
import { TEST_TXIDS } from '../testvectors.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

function createBasicPsbt(): PSBTv2Builder {
  const psbt = new PSBTv2Builder();
  psbt.addInput({ hash: TEST_TXIDS.txid1, index: 0 });
  psbt.addOutput({
    script: fromHex('00148d2d1eed2f4a15137cc3a7af9f233dbd47ef2f4e'),
    value: 100000n,
  });
  return psbt;
}

const newInput = (extra: Record<string, unknown> = {}) => ({
  hash: TEST_TXIDS.txid2,
  index: 0,
  ...extra,
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('addInput - locktime compatibility (unsigned PSBT)', () => {
  it('allows adding input with higher height lock when no inputs are signed', () => {
    const psbt = createBasicPsbt();
    psbt.updateInput(0, { requiredHeightLockTime: 100 });
    assert.doesNotThrow(() =>
      psbt.addInput(newInput({ requiredHeightLockTime: 200 })),
    );
  });

  it('allows adding input with higher time lock when no inputs are signed', () => {
    const psbt = createBasicPsbt();
    psbt.updateInput(0, { requiredTimeLockTime: 500000100 });
    assert.doesNotThrow(() =>
      psbt.addInput(newInput({ requiredTimeLockTime: 500000200 })),
    );
  });

  it('allows adding input that would introduce a type conflict when no inputs are signed', () => {
    const psbt = createBasicPsbt();
    psbt.updateInput(0, { requiredHeightLockTime: 100 });
    assert.doesNotThrow(() =>
      psbt.addInput(newInput({ requiredTimeLockTime: 500000100 })),
    );
  });
});
