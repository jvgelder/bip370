/**
 * PSBTv2 Finalizer Role Tests
 *
 * Reuses cryptographic material from the signer spec (BIP-174 vectors).
 * Tests finalization strategies and BIP-370 field preservation requirements.
 */
import * as assert from 'node:assert';
import { describe, it, beforeEach } from 'mocha';
import { fromHex } from 'uint8array-tools';
import {
  InputUpdateData,
  OutputData,
  PSBTv2Builder,
} from '../../ts_src/lib/index.js';
import { InputTypes } from '../../ts_src/lib/typefields.js';
import { InputData } from '../../ts_src/lib/index.js';
import {
  BIP174_PUBKEYS,
  BIP174_SIGNATURES,
  LEAF_HASHES,
  SCHNORR_SIGNATURES,
  SCRIPTS,
  TAPROOT_PUBKEYS,
  TEST_TXIDS,
} from '../testvectors.js';

// ============================================================================
// Helpers
// ============================================================================

function createP2wpkhPsbt() {
  const psbt = new PSBTv2Builder();
  psbt.addInput({ hash: TEST_TXIDS.txid1, index: 0 } satisfies InputData);
  psbt.addOutput({ script: SCRIPTS.p2wpkh, value: 50000000n });
  psbt.updateInput(0, {
    witnessUtxo: { script: SCRIPTS.p2wpkh, value: 100000000n },
  });
  return psbt;
}

function createP2trPsbt() {
  const psbt = new PSBTv2Builder();
  psbt.addInput({ hash: TEST_TXIDS.txid1, index: 0 } satisfies InputData);
  psbt.addOutput({ script: SCRIPTS.p2wpkh, value: 50000000n });
  psbt.updateInput(0, {
    witnessUtxo: { script: SCRIPTS.p2tr, value: 100000000n },
  });
  return psbt;
}

// Shared assertion — call after any finalizeInput()
function assertV2FieldsPreserved(psbt: PSBTv2Builder, inputIndex: number) {
  assert.ok(
    psbt.getInput(inputIndex, InputTypes.PREVIOUS_TXID),
    'PREVIOUS_TXID must be preserved',
  );
  assert.ok(
    psbt.getInput(inputIndex, InputTypes.OUTPUT_INDEX),
    'OUTPUT_INDEX must be preserved',
  );
}

function assertOptionalV2FieldsPreserved(
  psbt: PSBTv2Builder,
  inputIndex: number,
) {
  assert.ok(
    psbt.getInput(inputIndex, InputTypes.SEQUENCE),
    'SEQUENCE must be preserved',
  );
  assert.ok(
    psbt.getInput(inputIndex, InputTypes.REQUIRED_TIME_LOCKTIME),
    'REQUIRED_TIME_LOCKTIME must be preserved',
  );
  assert.ok(
    psbt.getInput(inputIndex, InputTypes.REQUIRED_HEIGHT_LOCKTIME),
    'REQUIRED_HEIGHT_LOCKTIME must be preserved',
  );
}

// ============================================================================
// Tests
// ============================================================================

describe('PSBTv2 Finalizer Role', () => {
  describe('finalizeInput - guards', () => {
    it('throws on out-of-bounds index', () => {
      const psbt = createP2wpkhPsbt();
      assert.throws(
        () => psbt.finalizeInput(99),
        (err: any) => err.errors?.some((e: any) => e.field === 'INPUT_INDEX'),
      );
    });

    it('is a no-op when input already has FINAL_SCRIPTWITNESS', () => {
      const psbt = createP2wpkhPsbt();
      psbt.setInput(0, InputTypes.FINAL_SCRIPTWITNESS, new Uint8Array(10));
      assert.doesNotThrow(() => psbt.finalizeInput(0));
    });

    it('throws when no signatures present', () => {
      const psbt = createP2wpkhPsbt();
      assert.throws(() => psbt.finalizeInput(0));
    });
  });

  describe('P2WPKH finalization', () => {
    let psbt: ReturnType<typeof createP2wpkhPsbt>;

    beforeEach(() => {
      psbt = createP2wpkhPsbt();
      psbt.addPartialSig(0, {
        pubkey: BIP174_PUBKEYS.key1,
        signature: BIP174_SIGNATURES.sig1,
      });
    });

    it('sets FINAL_SCRIPTWITNESS', () => {
      psbt.finalizeInput(0);
      assert.ok(psbt.getInput(0, InputTypes.FINAL_SCRIPTWITNESS));
    });

    it('removes signing data', () => {
      psbt.addBip32DerivationToInput(0, {
        pubkey: BIP174_PUBKEYS.key1,
        masterFingerprint: new Uint8Array(4),
        path: [0],
      });
      psbt.finalizeInput(0);
      assert.ok(!psbt.getInput(0, InputTypes.PARTIAL_SIG));
      assert.ok(!psbt.getInput(0, InputTypes.BIP32_DERIVATION));
    });

    it('preserves all BIP-370 required v2 fields', () => {
      psbt.updateInput(0, {
        sequence: 0xfffffffd,
        requiredHeightLockTime: 800000,
      } satisfies InputUpdateData);
      psbt.finalizeInput(0);
      assert.ok(psbt.getInput(0, InputTypes.PREVIOUS_TXID), 'PREVIOUS_TXID');
      assert.ok(psbt.getInput(0, InputTypes.OUTPUT_INDEX), 'OUTPUT_INDEX');
      assert.ok(psbt.getInput(0, InputTypes.SEQUENCE), 'SEQUENCE');
      assert.ok(
        psbt.getInput(0, InputTypes.REQUIRED_HEIGHT_LOCKTIME),
        'HEIGHT_LOCKTIME',
      );
    });
  });

  describe('P2TR key path finalization', () => {
    let psbt: ReturnType<typeof createP2trPsbt>;

    beforeEach(() => {
      psbt = createP2trPsbt();
      psbt.addTapKeySig(0, SCHNORR_SIGNATURES.sig64);
    });

    it('sets FINAL_SCRIPTWITNESS from TAP_KEY_SIG', () => {
      psbt.finalizeInput(0);
      assert.ok(psbt.getInput(0, InputTypes.FINAL_SCRIPTWITNESS));
    });

    it('removes TAP_KEY_SIG after finalization', () => {
      psbt.finalizeInput(0);
      assert.ok(!psbt.getInput(0, InputTypes.TAP_KEY_SIG));
    });

    it('preserves BIP-370 required v2 fields', () => {
      psbt.finalizeInput(0);
      assert.ok(psbt.getInput(0, InputTypes.PREVIOUS_TXID), 'PREVIOUS_TXID');
      assert.ok(psbt.getInput(0, InputTypes.OUTPUT_INDEX), 'OUTPUT_INDEX');
    });
  });

  describe('P2TR script path finalization', () => {
    it('sets FINAL_SCRIPTWITNESS from TAP_SCRIPT_SIG + TAP_LEAF_SCRIPT', () => {
      const psbt = createP2trPsbt();
      psbt.addTapScriptSig(0, {
        pubkey: TAPROOT_PUBKEYS.key1,
        leafHash: LEAF_HASHES.leaf1,
        signature: SCHNORR_SIGNATURES.sig64,
      });
      // control block: 33+ bytes, version byte + internal key
      const controlBlock = new Uint8Array(33).fill(0xc0);
      psbt.addTapLeafScriptToInput(0, {
        controlBlock,
        script: fromHex('51'), // OP_1 (trivially valid script)
        leafVersion: 0xc0,
      });
      psbt.finalizeInput(0);
      assert.ok(psbt.getInput(0, InputTypes.FINAL_SCRIPTWITNESS));
    });
  });

  describe('finalizeAllInputs', () => {
    it('is all-or-nothing: no mutation if one input cannot be finalized', () => {
      const psbt = new PSBTv2Builder();
      psbt.addInput({ hash: TEST_TXIDS.txid1, index: 0 } satisfies InputData);
      psbt.addInput({ hash: TEST_TXIDS.txid2, index: 1 } satisfies InputData);
      psbt.addOutput({ script: SCRIPTS.p2wpkh, value: 50000000n });
      psbt.updateInput(0, {
        witnessUtxo: { script: SCRIPTS.p2wpkh, value: 100000000n },
      });
      psbt.updateInput(1, {
        witnessUtxo: { script: SCRIPTS.p2wpkh, value: 100000000n },
      });
      // Only input 0 signed
      psbt.addPartialSig(0, {
        pubkey: BIP174_PUBKEYS.key1,
        signature: BIP174_SIGNATURES.sig1,
      });

      assert.throws(() => psbt.finalizeAllInputs());
      assert.ok(
        !psbt.getInput(0, InputTypes.FINAL_SCRIPTWITNESS),
        'input 0 must not be mutated',
      );
    });

    it('finalizes all inputs when all are ready', () => {
      const psbt = new PSBTv2Builder();
      psbt.addInput({ hash: TEST_TXIDS.txid1, index: 0 } satisfies InputData);
      psbt.addInput({ hash: TEST_TXIDS.txid2, index: 1 } satisfies InputData);
      psbt.addOutput({
        script: SCRIPTS.p2wpkh,
        value: 150000000n,
      } satisfies OutputData);
      psbt.updateInput(0, {
        witnessUtxo: { script: SCRIPTS.p2wpkh, value: 100000000n },
      } satisfies InputUpdateData);
      psbt.updateInput(1, {
        witnessUtxo: { script: SCRIPTS.p2wpkh, value: 100000000n },
      } satisfies InputUpdateData);
      psbt.addPartialSig(0, {
        pubkey: BIP174_PUBKEYS.key1,
        signature: BIP174_SIGNATURES.sig1,
      });
      psbt.addPartialSig(1, {
        pubkey: BIP174_PUBKEYS.key2,
        signature: BIP174_SIGNATURES.sig2,
      });

      psbt.finalizeAllInputs();
      assert.strictEqual(psbt.allInputsFinalized(), true);
    });

    it('skips already-finalized inputs without error', () => {
      const psbt = createP2wpkhPsbt();
      psbt.setInput(0, InputTypes.FINAL_SCRIPTWITNESS, new Uint8Array(10));
      assert.doesNotThrow(() => psbt.finalizeAllInputs());
    });
  });

  describe('Error messages', () => {
    it('error includes field name and reason', () => {
      const psbt = createP2wpkhPsbt();
      try {
        psbt.finalizeInput(0);
        assert.fail('Should have thrown');
      } catch (err: any) {
        assert.ok(err.errors?.[0]?.field, 'Should have field');
        assert.ok(err.errors?.[0]?.reason, 'Should have reason');
      }
    });
  });
});
