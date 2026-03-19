import { describe, it } from 'mocha';
import assert from 'assert';
import { fromHex } from 'uint8array-tools';
import { PSBTv2Builder } from '../../ts_src/lib/index.js';
import {
  validVectors,
  SCRIPTS,
  TEST_TXIDS,
  BIP174_PUBKEYS,
  TAPROOT_PUBKEYS,
  LEAF_HASHES,
} from '../testvectors.js';
import { SIGHASH_TYPES, MODIFIABLE_FLAGS } from '../../ts_src/lib/types.js';
import { ValidationErrorContainer } from '../../ts_src/lib/errors.js';
import {
  InputUpdateData,
  OutputUpdateData,
} from '../../ts_src/lib/roles/index.js';
import { deserializeBip32Derivation } from '../../ts_src/lib/utils/index.js';
import { InputTypes, OutputTypes } from '../../ts_src/lib/fields/index.js';

const FINGERPRINT = fromHex('f69d873e');
const PATH = [0x80000054, 0x80000001, 0x80000000, 0x00000000, 0x0000002a];
const REDEEM_SCRIPT = fromHex('5221' + '02'.repeat(33) + '52ae');
const TAP_TREE = fromHex('c0' + '20' + '00'.repeat(32));
const NON_WITNESS_TX = fromHex(
  '0200000001c1aa256e214b96a1822f93de42bff3b5f3ff8d0519306e3515d7515a5e805b12' +
    '0000000000ffffffff0118c69a3b00000000160014b0a3af144208412693ca7d166852b52db0aef06e00000000',
);

function createBasicPsbt(): PSBTv2Builder {
  const psbt = new PSBTv2Builder();
  psbt.addInput({ hash: TEST_TXIDS.txid1, index: 0 });
  psbt.addOutput({ script: SCRIPTS.p2wpkh, value: 50000000n });
  return psbt;
}

// ─── Test vector round-trips ──────────────────────────────────────────────────

describe('Updater - test vector round-trips', () => {
  it(`${validVectors[0].name} → ${validVectors[1].name}`, () => {
    const psbt = PSBTv2Builder.fromBase64(validVectors[0].b64);
    psbt.updateInput(0, {
      witnessUtxo: {
        value: 999999000n,
        script: fromHex('0014b0a3af144208412693ca7d166852b52db0aef06e'),
      },
      nonWitnessUtxo: NON_WITNESS_TX,
    } satisfies InputUpdateData);
    psbt.updateOutput(0, {
      bip32Derivation: [
        deserializeBip32Derivation(
          fromHex('f69d873e540000800100008000000080000000002a000000'),
          fromHex(
            '02d601f84846a6755f776be00e3d9de8fb10acc935fb83c45fb0162d4cad5ab792',
          ),
        ),
      ],
    } satisfies OutputUpdateData);
    psbt.updateOutput(1, {
      bip32Derivation: [
        deserializeBip32Derivation(
          fromHex('f69d873e5400008001000080000000800100000064000000'),
          fromHex(
            '02e36fbff53dd534070cf8fd396614680f357a9b85db7340bf1cfa745d2ad7b340',
          ),
        ),
      ],
    } satisfies OutputUpdateData);
    assert.strictEqual(psbt.toHex(), validVectors[1].hex);
  });

  it(`${validVectors[2].name} → ${validVectors[3].name}`, () => {
    const psbt = PSBTv2Builder.fromBase64(validVectors[2].b64);
    psbt.fallbackLockTime = 0;
    psbt.updateInput(0, {
      requiredTimeLockTime: 1657048460,
      requiredHeightLockTime: 10000,
      witnessUtxo: {
        value: 999999000n,
        script: fromHex('0014b0a3af144208412693ca7d166852b52db0aef06e'),
      },
      nonWitnessUtxo: NON_WITNESS_TX,
    } satisfies InputUpdateData);
    psbt.addBip32DerivationToOutput(
      0,
      deserializeBip32Derivation(
        fromHex('f69d873e540000800100008000000080000000002a000000'),
        fromHex(
          '02d601f84846a6755f776be00e3d9de8fb10acc935fb83c45fb0162d4cad5ab792',
        ),
      ),
    );
    psbt.updateOutput(1, {
      bip32Derivation: [
        deserializeBip32Derivation(
          fromHex('f69d873e5400008001000080000000800100000064000000'),
          fromHex(
            '02e36fbff53dd534070cf8fd396614680f357a9b85db7340bf1cfa745d2ad7b340',
          ),
        ),
      ],
    } satisfies OutputUpdateData);
    assert.strictEqual(psbt.toHex(), validVectors[3].hex);
  });
});

// ─── updateInput bounds and validation ───────────────────────────────────────

describe('Updater - updateInput', () => {
  it('throws on out-of-bounds index', () => {
    const psbt = createBasicPsbt();
    assert.throws(
      () =>
        psbt.updateInput(99, {
          witnessUtxo: { script: SCRIPTS.p2wpkh, value: 100n },
        }),
      (e: any) =>
        e instanceof ValidationErrorContainer &&
        e.errors[0].field === 'INPUT_INDEX',
    );
  });

  it('is all-or-nothing — invalid field does not mutate', () => {
    const psbt = createBasicPsbt();
    assert.throws(
      () =>
        psbt.updateInput(0, {
          witnessUtxo: { script: new Uint8Array(0), value: 100n },
        }),
      ValidationErrorContainer,
    );
    assert.strictEqual(psbt.getInput(0, InputTypes.WITNESS_UTXO), undefined);
  });
});

// ─── add*ToInput — one call per method, also covers updateInput paths ─────────

describe('Updater - add*ToInput', () => {
  it('addWitnessUtxoToInput', () => {
    const psbt = createBasicPsbt();
    assert.equal(psbt.getInput(0, InputTypes.WITNESS_UTXO), undefined);
    psbt.addWitnessUtxoToInput(0, { script: SCRIPTS.p2wpkh, value: 100000n });
    assert.ok(psbt.getInput(0, InputTypes.WITNESS_UTXO));
  });

  it('addNonWitnessUtxoToInput', () => {
    const psbt = createBasicPsbt();
    assert.equal(psbt.getInput(0, InputTypes.NON_WITNESS_UTXO), undefined);
    psbt.addNonWitnessUtxoToInput(0, NON_WITNESS_TX);
    assert.ok(psbt.getInput(0, InputTypes.NON_WITNESS_UTXO));
  });

  it('addRedeemScriptToInput', () => {
    const psbt = createBasicPsbt();
    assert.equal(psbt.getInput(0, InputTypes.REDEEM_SCRIPT), undefined);
    psbt.addRedeemScriptToInput(0, REDEEM_SCRIPT);
    assert.ok(psbt.getInput(0, InputTypes.REDEEM_SCRIPT));
  });

  it('addWitnessScriptToInput', () => {
    const psbt = createBasicPsbt();
    assert.equal(psbt.getInput(0, InputTypes.WITNESS_SCRIPT), undefined);
    psbt.addWitnessScriptToInput(0, REDEEM_SCRIPT);
    assert.ok(psbt.getInput(0, InputTypes.WITNESS_SCRIPT));
  });

  it('addSighashTypeToInput', () => {
    const psbt = createBasicPsbt();
    assert.equal(psbt.getInput(0, InputTypes.SIGHASH_TYPE), undefined);
    psbt.addSighashTypeToInput(0, SIGHASH_TYPES.ALL);
    assert.ok(psbt.getInput(0, InputTypes.SIGHASH_TYPE));
  });

  it('addSighashTypeToInput — SIGHASH_SINGLE sets HAS_SIGHASH_SINGLE flag', () => {
    const psbt = createBasicPsbt();
    psbt.addSighashTypeToInput(0, SIGHASH_TYPES.SINGLE);
    assert.ok(
      (psbt.modifiableFlags! & MODIFIABLE_FLAGS.HAS_SIGHASH_SINGLE) !== 0,
    );
  });

  it('addBip32DerivationToInput', () => {
    const psbt = createBasicPsbt();
    assert.equal(
      psbt.getInput(0, InputTypes.BIP32_DERIVATION, BIP174_PUBKEYS.key1),
      undefined,
    );
    psbt.addBip32DerivationToInput(0, {
      pubkey: BIP174_PUBKEYS.key1,
      masterFingerprint: FINGERPRINT,
      path: PATH,
    });
    assert.ok(
      psbt.getInput(0, InputTypes.BIP32_DERIVATION, BIP174_PUBKEYS.key1),
    );
  });

  it('addTapInternalKeyToInput', () => {
    const psbt = createBasicPsbt();
    assert.equal(psbt.getInput(0, InputTypes.TAP_INTERNAL_KEY), undefined);
    psbt.addTapInternalKeyToInput(0, TAPROOT_PUBKEYS.key1);
    assert.ok(psbt.getInput(0, InputTypes.TAP_INTERNAL_KEY));
  });

  it('addTapMerkleRootToInput', () => {
    const psbt = createBasicPsbt();
    assert.equal(psbt.getInput(0, InputTypes.TAP_MERKLE_ROOT), undefined);
    psbt.addTapMerkleRootToInput(0, fromHex('00'.repeat(32)));
    assert.ok(psbt.getInput(0, InputTypes.TAP_MERKLE_ROOT));
  });

  it('addTapBip32DerivationToInput', () => {
    const psbt = createBasicPsbt();
    assert.equal(
      psbt.getInput(0, InputTypes.TAP_BIP32_DERIVATION, TAPROOT_PUBKEYS.key1),
      undefined,
    );
    psbt.addTapBip32DerivationToInput(0, {
      pubkey: TAPROOT_PUBKEYS.key1,
      masterFingerprint: FINGERPRINT,
      path: PATH,
      leafHashes: [LEAF_HASHES.leaf1],
    });
    assert.ok(
      psbt.getInput(0, InputTypes.TAP_BIP32_DERIVATION, TAPROOT_PUBKEYS.key1),
    );
  });

  it('addTapLeafScriptToInput', () => {
    const psbt = createBasicPsbt();
    assert.equal(
      psbt.getInput(0, InputTypes.TAP_LEAF_SCRIPT, new Uint8Array(33)),
      undefined,
    );
    psbt.addTapLeafScriptToInput(0, {
      controlBlock: new Uint8Array(33),
      script: new Uint8Array(1),
      leafVersion: 0xc0,
    });
    assert.ok(psbt.getInput(0, InputTypes.TAP_LEAF_SCRIPT, new Uint8Array(33)));
  });

  it('addSequenceToInput', () => {
    const psbt = createBasicPsbt();
    assert.equal(psbt.getInput(0, InputTypes.SEQUENCE), undefined);
    psbt.addSequenceToInput(0, 0xfffffffd);
    assert.ok(psbt.getInput(0, InputTypes.SEQUENCE));
  });

  it('addRequiredTimeLockTimeToInput', () => {
    const psbt = createBasicPsbt();
    assert.equal(
      psbt.getInput(0, InputTypes.REQUIRED_TIME_LOCKTIME),
      undefined,
    );
    psbt.addRequiredTimeLockTimeToInput(0, 500000100);
    assert.ok(psbt.getInput(0, InputTypes.REQUIRED_TIME_LOCKTIME));
  });

  it('addRequiredHeightLockTimeToInput', () => {
    const psbt = createBasicPsbt();
    assert.equal(
      psbt.getInput(0, InputTypes.REQUIRED_HEIGHT_LOCKTIME),
      undefined,
    );
    psbt.addRequiredHeightLockTimeToInput(0, 100);
    assert.ok(psbt.getInput(0, InputTypes.REQUIRED_HEIGHT_LOCKTIME));
  });
});

// ─── updateOutput bounds and validation ──────────────────────────────────────

describe('Updater - updateOutput', () => {
  it('throws on out-of-bounds index', () => {
    const psbt = createBasicPsbt();
    assert.throws(
      () => psbt.updateOutput(99, { redeemScript: REDEEM_SCRIPT }),
      (e: any) =>
        e instanceof ValidationErrorContainer &&
        e.errors[0].field === 'OUTPUT_INDEX',
    );
  });

  it('is all-or-nothing — invalid field does not mutate', () => {
    const psbt = createBasicPsbt();
    assert.throws(() =>
      psbt.updateOutput(0, { tapInternalKey: new Uint8Array(16) }),
    );
    assert.strictEqual(
      psbt.getOutput(0, OutputTypes.TAP_INTERNAL_KEY),
      undefined,
    );
  });
});

// ─── add*ToOutput — one call per method, also covers updateOutput paths ───────

describe('Updater - add*ToOutput', () => {
  it('addRedeemScriptToOutput', () => {
    const psbt = createBasicPsbt();
    assert.equal(psbt.getOutput(0, OutputTypes.REDEEM_SCRIPT), undefined);
    psbt.addRedeemScriptToOutput(0, REDEEM_SCRIPT);
    assert.ok(psbt.getOutput(0, OutputTypes.REDEEM_SCRIPT));
  });

  it('addWitnessScriptToOutput', () => {
    const psbt = createBasicPsbt();
    assert.equal(psbt.getOutput(0, OutputTypes.WITNESS_SCRIPT), undefined);
    psbt.addWitnessScriptToOutput(0, REDEEM_SCRIPT);
    assert.ok(psbt.getOutput(0, OutputTypes.WITNESS_SCRIPT));
  });

  it('addBip32DerivationToOutput', () => {
    const psbt = createBasicPsbt();
    assert.equal(
      psbt.getOutput(0, OutputTypes.BIP32_DERIVATION, BIP174_PUBKEYS.key1),
      undefined,
    );
    psbt.addBip32DerivationToOutput(0, {
      pubkey: BIP174_PUBKEYS.key1,
      masterFingerprint: FINGERPRINT,
      path: PATH,
    });
    assert.ok(
      psbt.getOutput(0, OutputTypes.BIP32_DERIVATION, BIP174_PUBKEYS.key1),
    );
  });

  it('addTapInternalKeyToOutput', () => {
    const psbt = createBasicPsbt();
    assert.equal(psbt.getOutput(0, OutputTypes.TAP_INTERNAL_KEY), undefined);
    psbt.addTapInternalKeyToOutput(0, TAPROOT_PUBKEYS.key1);
    assert.ok(psbt.getOutput(0, OutputTypes.TAP_INTERNAL_KEY));
  });

  it('addTapTreeToOutput', () => {
    const psbt = createBasicPsbt();
    assert.equal(psbt.getOutput(0, OutputTypes.TAP_TREE), undefined);
    psbt.addTapTreeToOutput(0, TAP_TREE);
    assert.ok(psbt.getOutput(0, OutputTypes.TAP_TREE));
  });

  it('addTapBip32DerivationToOutput', () => {
    const psbt = createBasicPsbt();
    assert.equal(
      psbt.getOutput(0, OutputTypes.TAP_BIP32_DERIVATION, TAPROOT_PUBKEYS.key1),
      undefined,
    );
    psbt.addTapBip32DerivationToOutput(0, {
      pubkey: TAPROOT_PUBKEYS.key1,
      masterFingerprint: FINGERPRINT,
      path: PATH,
      leafHashes: [LEAF_HASHES.leaf1],
    });
    assert.ok(
      psbt.getOutput(0, OutputTypes.TAP_BIP32_DERIVATION, TAPROOT_PUBKEYS.key1),
    );
  });
});
