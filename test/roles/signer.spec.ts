/**
 * PSBTv2 Signer Role Tests
 *
 * Uses cryptographic material from BIP-174 test vectors (keys, signatures)
 * applied to freshly constructed PSBTv2 instances.
 *
 * BIP-174 Master Key (testnet):
 * tprv8ZgxMBicQKsPd9TeAdPADNnSyH9SSUUbTVeFszDE23Ki6TBB5nCefAdHkK8Fm3qMQR6sHwA56zqRmKmxnHk37JkiFzvncDqoKmPWubu7hDF
 */
import * as assert from 'node:assert';
import { describe, it, beforeEach } from 'mocha';
import {
  BIP174_PUBKEYS,
  BIP174_SIGNATURES,
  LEAF_HASHES,
  SCHNORR_SIGNATURES,
  SCRIPTS,
  TAPROOT_PUBKEYS,
  TEST_TXIDS,
} from '../testvectors.js';
import { PSBTv2Builder } from '../../ts_src/lib/index.js';
import { MODIFIABLE_FLAGS, SIGHASH_TYPES } from '../../ts_src/lib/types.js';
import { InputData } from '../../ts_src/lib/roles/index.js';

// ============================================================================
// Helpers
// ============================================================================

function createBasicPsbt(): PSBTv2Builder {
  const psbt = new PSBTv2Builder();
  psbt.addInput({ hash: TEST_TXIDS.txid1, index: 0 } satisfies InputData);
  psbt.addOutput({ script: SCRIPTS.p2wpkh, value: 50000000n });
  psbt.updateInput(0, {
    witnessUtxo: { script: SCRIPTS.p2wpkh, value: 100000000n },
  });
  return psbt;
}

function createTaprootPsbt(): PSBTv2Builder {
  const psbt = new PSBTv2Builder();
  psbt.addInput({ hash: TEST_TXIDS.txid1, index: 0 } satisfies InputData);
  psbt.addOutput({ script: SCRIPTS.p2wpkh, value: 50000000n });
  psbt.updateInput(0, {
    witnessUtxo: { script: SCRIPTS.p2tr, value: 100000000n },
  });
  return psbt;
}

function createMultiInputPsbt(): PSBTv2Builder {
  const psbt = new PSBTv2Builder();
  psbt.addInput({ hash: TEST_TXIDS.txid1, index: 0 });
  psbt.addInput({ hash: TEST_TXIDS.txid2, index: 1 });
  psbt.addOutput({ script: SCRIPTS.p2wpkh, value: 150000000n });
  psbt.updateInput(0, {
    witnessUtxo: { script: SCRIPTS.p2wpkh, value: 100000000n },
  });
  psbt.updateInput(1, {
    witnessUtxo: { script: SCRIPTS.p2wpkh, value: 100000000n },
  });
  return psbt;
}

// ============================================================================
// Tests
// ============================================================================

describe('PSBTv2 Signer Role', () => {
  describe('addPartialSig', () => {
    let psbt: typeof PSBTv2Builder.prototype;
    beforeEach(() => {
      psbt = createBasicPsbt();
    });

    it('adds a valid partial signature', () => {
      psbt.addPartialSig(0, {
        pubkey: BIP174_PUBKEYS.key1,
        signature: BIP174_SIGNATURES.sig1,
      });
      const sigs = psbt.getPartialSigs(0);
      assert.strictEqual(sigs.length, 1);
      assert.deepStrictEqual(sigs[0].pubkey, BIP174_PUBKEYS.key1);
      assert.deepStrictEqual(sigs[0].signature, BIP174_SIGNATURES.sig1);
    });

    it('adds multiple partial signatures from different signers', () => {
      psbt.addPartialSig(0, {
        pubkey: BIP174_PUBKEYS.key1,
        signature: BIP174_SIGNATURES.sig1,
      });
      psbt.addPartialSig(0, {
        pubkey: BIP174_PUBKEYS.key2,
        signature: BIP174_SIGNATURES.sig2,
      });
      assert.strictEqual(psbt.getPartialSigs(0).length, 2);
    });

    it('marks input as signed after adding signature', () => {
      assert.strictEqual(psbt.inputIsSigned(0), false);
      psbt.addPartialSig(0, {
        pubkey: BIP174_PUBKEYS.key1,
        signature: BIP174_SIGNATURES.sig1,
      });
      assert.strictEqual(psbt.inputIsSigned(0), true);
    });

    it('rejects invalid pubkey length (too short)', () => {
      assert.throws(() =>
        psbt.addPartialSig(0, {
          pubkey: new Uint8Array(10),
          signature: BIP174_SIGNATURES.sig1,
        }),
      );
    });

    it('rejects x-only pubkey (32 bytes) for ECDSA', () => {
      assert.throws(() =>
        psbt.addPartialSig(0, {
          pubkey: TAPROOT_PUBKEYS.key1,
          signature: BIP174_SIGNATURES.sig1,
        }),
      );
    });

    it('rejects signature that is too short', () => {
      assert.throws(() =>
        psbt.addPartialSig(0, {
          pubkey: BIP174_PUBKEYS.key1,
          signature: new Uint8Array(8),
        }),
      );
    });

    it('rejects out-of-bounds input index', () => {
      assert.throws(() =>
        psbt.addPartialSig(5, {
          pubkey: BIP174_PUBKEYS.key1,
          signature: BIP174_SIGNATURES.sig1,
        }),
      );
    });
  });

  describe('addTapKeySig', () => {
    let psbt: typeof PSBTv2Builder.prototype;
    beforeEach(() => {
      psbt = createTaprootPsbt();
    });

    it('adds a valid 64-byte Schnorr signature', () => {
      psbt.addTapKeySig(0, SCHNORR_SIGNATURES.sig64);
      assert.deepStrictEqual(psbt.getTapKeySig(0), SCHNORR_SIGNATURES.sig64);
    });

    it('adds a valid 65-byte Schnorr signature with sighash', () => {
      psbt.addTapKeySig(0, SCHNORR_SIGNATURES.sig65All);
      assert.deepStrictEqual(psbt.getTapKeySig(0), SCHNORR_SIGNATURES.sig65All);
    });

    it('marks input as signed after adding tap key signature', () => {
      assert.strictEqual(psbt.inputIsSigned(0), false);
      psbt.addTapKeySig(0, SCHNORR_SIGNATURES.sig64);
      assert.strictEqual(psbt.inputIsSigned(0), true);
    });

    it('rejects Schnorr signature that is too short', () => {
      assert.throws(() => psbt.addTapKeySig(0, new Uint8Array(32)));
    });

    it('rejects Schnorr signature that is too long', () => {
      assert.throws(() => psbt.addTapKeySig(0, new Uint8Array(66)));
    });
  });

  describe('addTapScriptSig', () => {
    let psbt: typeof PSBTv2Builder.prototype;
    beforeEach(() => {
      psbt = createTaprootPsbt();
    });

    it('adds a valid tap script signature', () => {
      psbt.addTapScriptSig(0, {
        pubkey: TAPROOT_PUBKEYS.key1,
        leafHash: LEAF_HASHES.leaf1,
        signature: SCHNORR_SIGNATURES.sig64,
      });
      assert.strictEqual(psbt.inputIsSigned(0), true);
    });

    it('adds multiple tap script signatures for different leaves', () => {
      psbt.addTapScriptSig(0, {
        pubkey: TAPROOT_PUBKEYS.key1,
        leafHash: LEAF_HASHES.leaf1,
        signature: SCHNORR_SIGNATURES.sig64,
      });
      psbt.addTapScriptSig(0, {
        pubkey: TAPROOT_PUBKEYS.key1,
        leafHash: LEAF_HASHES.leaf2,
        signature: SCHNORR_SIGNATURES.sig65All,
      });
      assert.strictEqual(psbt.inputIsSigned(0), true);
    });

    it('rejects tap script sig with non-x-only pubkey (33 bytes)', () => {
      assert.throws(() =>
        psbt.addTapScriptSig(0, {
          pubkey: BIP174_PUBKEYS.key1,
          leafHash: LEAF_HASHES.leaf1,
          signature: SCHNORR_SIGNATURES.sig64,
        }),
      );
    });

    it('rejects tap script sig with invalid leaf hash length', () => {
      assert.throws(() =>
        psbt.addTapScriptSig(0, {
          pubkey: TAPROOT_PUBKEYS.key1,
          leafHash: new Uint8Array(16),
          signature: SCHNORR_SIGNATURES.sig64,
        }),
      );
    });
  });

  describe('addPartialSigs (batch)', () => {
    let psbt: typeof PSBTv2Builder.prototype;
    beforeEach(() => {
      psbt = createMultiInputPsbt();
    });

    it('adds signatures to multiple inputs atomically', () => {
      psbt.addPartialSigs([
        {
          inputIndex: 0,
          partialSignature: {
            pubkey: BIP174_PUBKEYS.key1,
            signature: BIP174_SIGNATURES.sig1,
          },
        },
        {
          inputIndex: 1,
          partialSignature: {
            pubkey: BIP174_PUBKEYS.key2,
            signature: BIP174_SIGNATURES.sig2,
          },
        },
      ]);
      assert.strictEqual(psbt.allInputsSigned(), true);
    });

    it('rejects all if any signature is invalid (atomicity)', () => {
      assert.throws(() =>
        psbt.addPartialSigs([
          {
            inputIndex: 0,
            partialSignature: {
              pubkey: BIP174_PUBKEYS.key1,
              signature: BIP174_SIGNATURES.sig1,
            },
          },
          {
            inputIndex: 1,
            partialSignature: {
              pubkey: new Uint8Array(5),
              signature: BIP174_SIGNATURES.sig2,
            },
          },
        ]),
      );
      assert.strictEqual(psbt.inputIsSigned(0), false);
      assert.strictEqual(psbt.inputIsSigned(1), false);
    });
  });

  describe('Sighash validation', () => {
    let psbt: typeof PSBTv2Builder.prototype;
    beforeEach(() => {
      psbt = createBasicPsbt();
    });

    it('accepts signature matching input SIGHASH_TYPE', () => {
      psbt.updateInput(0, { sighashType: SIGHASH_TYPES.ALL });
      psbt.addPartialSig(0, {
        pubkey: BIP174_PUBKEYS.key1,
        signature: BIP174_SIGNATURES.sig1,
      });
      assert.strictEqual(psbt.inputIsSigned(0), true);
    });

    it('rejects signature with mismatched sighash type', () => {
      psbt.updateInput(0, { sighashType: SIGHASH_TYPES.ALL });
      assert.throws(() =>
        psbt.addPartialSig(0, {
          pubkey: BIP174_PUBKEYS.key1,
          signature: BIP174_SIGNATURES.sigNone,
        }),
      );
    });

    it('accepts any sighash when input SIGHASH_TYPE not set', () => {
      psbt.addPartialSig(0, {
        pubkey: BIP174_PUBKEYS.key1,
        signature: BIP174_SIGNATURES.sigNone,
      });
      assert.strictEqual(psbt.inputIsSigned(0), true);
    });
  });

  describe('Modifiable flags after signing', () => {
    let psbt: typeof PSBTv2Builder.prototype;
    beforeEach(() => {
      psbt = createBasicPsbt();
      psbt.modifiableFlags = MODIFIABLE_FLAGS.INPUTS | MODIFIABLE_FLAGS.OUTPUTS;
    });

    it('clears INPUTS flag when signing without ANYONECANPAY', () => {
      psbt.addPartialSig(0, {
        pubkey: BIP174_PUBKEYS.key1,
        signature: BIP174_SIGNATURES.sig1,
      });
      assert.strictEqual(psbt.inputsModifiable, false);
    });

    it('clears OUTPUTS flag when signing with SIGHASH_ALL', () => {
      psbt.addPartialSig(0, {
        pubkey: BIP174_PUBKEYS.key1,
        signature: BIP174_SIGNATURES.sig1,
      });
      assert.strictEqual(psbt.outputsModifiable, false);
    });

    it('keeps INPUTS flag when signing with ANYONECANPAY', () => {
      psbt.addPartialSig(0, {
        pubkey: BIP174_PUBKEYS.key1,
        signature: BIP174_SIGNATURES.sigAnyoneCanPay,
      });
      assert.ok(psbt.inputsModifiable);
    });

    it('keeps OUTPUTS flag when signing with SIGHASH_NONE', () => {
      psbt.addPartialSig(0, {
        pubkey: BIP174_PUBKEYS.key1,
        signature: BIP174_SIGNATURES.sigNone,
      });
      assert.ok(psbt.outputsModifiable);
    });

    it('sets HAS_SIGHASH_SINGLE flag when signing with SIGHASH_SINGLE', () => {
      psbt.addPartialSig(0, {
        pubkey: BIP174_PUBKEYS.key1,
        signature: BIP174_SIGNATURES.sigSingle,
      });
      assert.ok(
        (psbt.modifiableFlags ?? 0) & MODIFIABLE_FLAGS.HAS_SIGHASH_SINGLE,
      );
    });
  });

  describe('Schnorr sighash handling', () => {
    let psbt: typeof PSBTv2Builder.prototype;
    beforeEach(() => {
      psbt = createTaprootPsbt();
      psbt.updateInput(0, { sighashType: SIGHASH_TYPES.ALL });
    });

    it('accepts 64-byte signature as SIGHASH_DEFAULT (equivalent to ALL)', () => {
      psbt.addTapKeySig(0, SCHNORR_SIGNATURES.sig64);
      assert.strictEqual(psbt.inputIsSigned(0), true);
    });

    it('accepts 65-byte signature with explicit SIGHASH_ALL', () => {
      psbt.addTapKeySig(0, SCHNORR_SIGNATURES.sig65All);
      assert.strictEqual(psbt.inputIsSigned(0), true);
    });

    it('rejects 65-byte signature with mismatched sighash', () => {
      assert.throws(() => psbt.addTapKeySig(0, SCHNORR_SIGNATURES.sig65None));
    });
  });

  describe('Query methods', () => {
    it('reports inputIsSigned correctly', () => {
      const psbt = createMultiInputPsbt();
      assert.strictEqual(psbt.inputIsSigned(0), false);
      psbt.addPartialSig(0, {
        pubkey: BIP174_PUBKEYS.key1,
        signature: BIP174_SIGNATURES.sig1,
      });
      assert.strictEqual(psbt.inputIsSigned(0), true);
      assert.strictEqual(psbt.inputIsSigned(1), false);
    });

    it('reports allInputsSigned correctly', () => {
      const psbt = createMultiInputPsbt();
      assert.strictEqual(psbt.allInputsSigned(), false);
      psbt.addPartialSig(0, {
        pubkey: BIP174_PUBKEYS.key1,
        signature: BIP174_SIGNATURES.sig1,
      });
      assert.strictEqual(psbt.allInputsSigned(), false);
      psbt.addPartialSig(1, {
        pubkey: BIP174_PUBKEYS.key2,
        signature: BIP174_SIGNATURES.sig2,
      });
      assert.strictEqual(psbt.allInputsSigned(), true);
    });

    it('returns partial signatures via getPartialSigs', () => {
      const psbt = createBasicPsbt();
      psbt.addPartialSig(0, {
        pubkey: BIP174_PUBKEYS.key1,
        signature: BIP174_SIGNATURES.sig1,
      });
      psbt.addPartialSig(0, {
        pubkey: BIP174_PUBKEYS.key2,
        signature: BIP174_SIGNATURES.sig2,
      });
      const sigs = psbt.getPartialSigs(0);
      assert.strictEqual(sigs.length, 2);
      assert.ok(
        sigs.some(s => s.pubkey.every((b, i) => b === BIP174_PUBKEYS.key1[i])),
      );
    });
  });
});

// ─── Locktime Compatibility ──────────────────────────────────────────────────

describe('updateInput - locktime compatibility (signed PSBT)', () => {
  function twoInputPsbt(opts: {
    heightLock?: number;
    timeLock?: number;
  }): PSBTv2Builder {
    const psbt = createBasicPsbt();
    psbt.addInput({ hash: TEST_TXIDS.txid2, index: 0 });
    psbt.updateInput(0, {
      witnessUtxo: { script: SCRIPTS.p2wpkh, value: 1000000n },
      ...(opts.heightLock !== undefined && {
        requiredHeightLockTime: opts.heightLock,
      }),
      ...(opts.timeLock !== undefined && {
        requiredTimeLockTime: opts.timeLock,
      }),
    });
    psbt.addPartialSig(0, {
      pubkey: BIP174_PUBKEYS.key1,
      signature: BIP174_SIGNATURES.sig1,
    });
    if (opts.heightLock !== undefined)
      psbt.updateInput(1, { requiredHeightLockTime: opts.heightLock });
    if (opts.timeLock !== undefined)
      psbt.updateInput(1, { requiredTimeLockTime: opts.timeLock });
    return psbt;
  }

  describe('via updateInput', () => {
    it('allows lowering height lock on unsigned input', () => {
      assert.doesNotThrow(() =>
        twoInputPsbt({ heightLock: 200 }).updateInput(1, {
          requiredHeightLockTime: 100,
        }),
      );
    });

    it('allows setting equal height lock on unsigned input', () => {
      assert.doesNotThrow(() =>
        twoInputPsbt({ heightLock: 200 }).updateInput(1, {
          requiredHeightLockTime: 200,
        }),
      );
    });

    it('throws when raising height lock would change computed locktime', () => {
      assert.throws(
        () =>
          twoInputPsbt({ heightLock: 100 }).updateInput(1, {
            requiredHeightLockTime: 200,
          }),
        /locktime/i,
      );
    });

    it('allows updating locktime on the signed input itself', () => {
      assert.doesNotThrow(() =>
        twoInputPsbt({ heightLock: 100 }).updateInput(0, {
          requiredHeightLockTime: 200,
        }),
      );
    });
  });

  describe('via addRequiredHeightLockTimeToInput', () => {
    it('throws when raising height lock would change computed locktime', () => {
      assert.throws(
        () =>
          twoInputPsbt({ heightLock: 100 }).addRequiredHeightLockTimeToInput(
            1,
            200,
          ),
        /locktime/i,
      );
    });

    it('allows setting height lock that does not raise computed locktime', () => {
      assert.doesNotThrow(() =>
        twoInputPsbt({ heightLock: 200 }).addRequiredHeightLockTimeToInput(
          1,
          100,
        ),
      );
    });
  });

  describe('via addRequiredTimeLockTimeToInput', () => {
    it('throws when raising time lock would change computed locktime', () => {
      assert.throws(
        () =>
          twoInputPsbt({ timeLock: 500000100 }).addRequiredTimeLockTimeToInput(
            1,
            500000200,
          ),
        /locktime/i,
      );
    });

    it('allows setting time lock that does not raise computed locktime', () => {
      assert.doesNotThrow(() =>
        twoInputPsbt({ timeLock: 500000200 }).addRequiredTimeLockTimeToInput(
          1,
          500000100,
        ),
      );
    });
  });
});
