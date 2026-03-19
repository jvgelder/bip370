import { describe, it } from 'mocha';
import assert from 'assert';
import { fromHex } from 'uint8array-tools';

import { PSBTv2Builder } from '../../ts_src/lib/index.js';
import { TEST_TXIDS } from './../testvectors.js';
import { InputTypes, OutputTypes } from '../../ts_src/lib/fields/index.js';

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

describe('PsbtV2Base - map utilities', () => {
  it('getInputsOfType / deleteInputsOfType round-trip', () => {
    const psbt = createBasicPsbt();
    psbt.updateInput(0, {
      bip32Derivation: [
        {
          pubkey: fromHex(
            '02d601f84846a6755f776be00e3d9de8fb10acc935fb83c45fb0162d4cad5ab793',
          ),
          masterFingerprint: fromHex('f69d873e'),
          path: [0x80000054],
        },
        {
          pubkey: fromHex(
            '02e36fbff53dd534070cf8fd396614680f357a9b85db7340bf1cfa745d2ad7b340',
          ),
          masterFingerprint: fromHex('f69d873e'),
          path: [0x80000054],
        },
      ],
    });
    assert.strictEqual(
      psbt.getInputsOfType(0, InputTypes.BIP32_DERIVATION).length,
      2,
    );
    assert.strictEqual(
      psbt.deleteInputsOfType(0, InputTypes.BIP32_DERIVATION),
      2,
    );
    assert.strictEqual(
      psbt.getInputsOfType(0, InputTypes.BIP32_DERIVATION).length,
      0,
    );
  });

  it('hasInputOfType returns true/false correctly', () => {
    const psbt = createBasicPsbt();
    assert.strictEqual(psbt.hasInputOfType(0, InputTypes.WITNESS_UTXO), false);
    psbt.updateInput(0, {
      witnessUtxo: {
        script: fromHex('00148d2d1eed2f4a15137cc3a7af9f233dbd47ef2f4e'),
        value: 100000n,
      },
    });
    assert.strictEqual(psbt.hasInputOfType(0, InputTypes.WITNESS_UTXO), true);
  });

  it('returns empty/zero for out-of-bounds index', () => {
    const psbt = createBasicPsbt();
    assert.deepStrictEqual(
      psbt.getInputsOfType(99, InputTypes.BIP32_DERIVATION),
      [],
    );
    assert.strictEqual(psbt.hasInputOfType(99, InputTypes.WITNESS_UTXO), false);
    assert.strictEqual(
      psbt.deleteInputsOfType(99, InputTypes.BIP32_DERIVATION),
      0,
    );
    assert.deepStrictEqual(
      psbt.getOutputsOfType(99, OutputTypes.BIP32_DERIVATION),
      [],
    );
  });
});
